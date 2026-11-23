"""Kiểm tra bằng số tính tay và đối chiếu hai bộ giải độc lập.

Chạy: .venv/bin/python -m unittest discover -s tests -v
"""
from datetime import datetime, timedelta
import unittest

from perstour.models import POI, Problem, Statistics, Visit
from perstour.problem import make_problem
from perstour.solver import solve_milp
from perstour.statistics import compute_statistics


class FormulaTests(unittest.TestCase):
    def setUp(self):
        self.pois = [POI("A", "A", "art", 0, 0), POI("B", "B", "art", 0, .01),
                     POI("C", "C", "park", 0, .02)]
        self.time = datetime(2026, 1, 1, 8)

    def visit(self, user, poi, minutes):
        return Visit(user, poi, self.time, self.time + timedelta(minutes=minutes), (), user + "/S1")

    def test_equations_against_hand_calculation(self):
        # V(A)=(60+20)/2=40, V(B)=20, V(C)=30.
        # Int_u(art)=60/40 + 20/20 = 2.5; Int_u(park)=15/30=.5.
        visits = [self.visit("u", "A", 60), self.visit("v", "A", 20),
                  self.visit("u", "B", 20), self.visit("v", "B", 20),
                  self.visit("u", "C", 15), self.visit("v", "C", 45)]
        stats = compute_statistics(self.pois, visits, "u")
        self.assertEqual(stats.averages, {"A": 40, "B": 20, "C": 30})
        self.assertEqual(stats.popularity, {"A": 2, "B": 2, "C": 2})
        self.assertEqual(stats.time_interest, {"art": 2.5, "park": .5})
        self.assertEqual(stats.frequency_interest, {"art": 2, "park": 1})
        time = make_problem(self.pois, stats, "A", "C", 300, .5, "time")
        freq = make_problem(self.pois, stats, "A", "C", 300, .5, "frequency")
        self.assertEqual(time.durations, {"A": 100, "B": 50, "C": 15})
        self.assertEqual(time.durations, freq.durations)  # Eq.3 always time-based.
        self.assertEqual(time.rewards["B"], 2.25)
        self.assertEqual(freq.rewards["B"], 2)
        self.assertAlmostEqual(time.cost("A", "C"), time.travel["A", "C"] + 15)

    def test_missing_or_zero_average_has_explicit_error(self):
        with self.assertRaises(ValueError):
            compute_statistics(self.pois, [self.visit("u", "A", 0)], "u")


class RouteSolverTests(unittest.TestCase):
    def test_mtz_rejects_disconnected_high_score_cycle(self):
        pois = {poi: POI(poi, poi, "art", 0, 0) for poi in ("A", "S", "B", "E")}
        travel = {(origin, destination): 10 for origin in pois for destination in pois}
        travel.update({("S", "E"): 1, ("A", "B"): 0.1, ("B", "A"): 0.1})
        problem = Problem(
            pois=pois,
            start="S",
            end="E",
            budget=1.5,
            interest_type="time",
            statistics=Statistics({}, {}, {}, {}, []),
            travel=travel,
            durations=dict.fromkeys(pois, 0),
            rewards={"A": 10, "B": 10, "S": 0, "E": 0},
        )

        # S → E và chu trình A → B → A cùng vừa ngân sách.
        # MTZ buộc bỏ chu trình tách rời để chỉ giữ tuyến nối S với E.
        solution = solve_milp(problem)
        self.assertEqual(solution.status, "optimal")
        self.assertEqual(solution.route, ("S", "E"))
        self.assertEqual(solution.score, 0)
        self.assertEqual(solution.total, 1)
