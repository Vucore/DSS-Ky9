"""Kiểm tra bằng số tính tay và đối chiếu hai bộ giải độc lập.

Chạy: .venv/bin/python -m unittest discover -s tests -v
"""
from datetime import datetime, timedelta
from itertools import product
import unittest

from perstour.core import (POI, Photo, Mapping, Visit, compute_statistics,
                          construct_visits, haversine_km, make_problem, map_photos)
from perstour.evaluation import VARIANTS, greedy, metrics
from perstour.mock import load_mock, make_photos, validate_inputs
from perstour.solver import Solution, check_solution, enumerate_routes, solve_milp


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

    def test_photo_radius_and_nearest(self):
        photos = [Photo("1", "u", self.time, 0, .0001), Photo("2", "u", self.time, 2, 2)]
        mapped = map_photos(photos, self.pois)
        self.assertEqual(mapped[0].poi, "A")
        self.assertIsNone(mapped[1].poi)
        self.assertAlmostEqual(haversine_km(0, 0, 0, 1), 111.1949266, places=5)
        boundary = haversine_km(0, .0001, 0, 0) * 1000
        self.assertIsNone(map_photos(photos[:1], self.pois, radius_m=boundary)[0].poi)

    def test_eight_hour_boundary_same_poi(self):
        # Same POI after >8h must be a new visit, not an overnight stay.
        times = [self.time, self.time + timedelta(minutes=30),
                 self.time + timedelta(hours=8, minutes=30),
                 self.time + timedelta(hours=17, minutes=1)]
        mapping = [Mapping(Photo(str(i), "u", time, 0, 0), "A", 0) for i, time in enumerate(times)]
        visits = construct_visits(mapping)
        self.assertEqual(len(visits), 2)
        self.assertEqual(visits[0].minutes, 510)  # exactly 8h between photos stays grouped.
        self.assertEqual(visits[1].sequence, "u/S2")

    def test_revisited_poi_is_two_visits(self):
        ids = ["A", "A", "B", "B", "A", "A"]
        mapped = [Mapping(Photo(str(i), "u", self.time + timedelta(minutes=10*i), 0, 0), p, 0)
                  for i, p in enumerate(ids)]
        visits = construct_visits(mapped)
        self.assertEqual([x.poi for x in visits], ["A", "B", "A"])
        self.assertTrue(all(x.minutes == 10 for x in visits))

    def test_missing_or_zero_average_has_explicit_error(self):
        with self.assertRaises(ValueError):
            compute_statistics(self.pois, [self.visit("u", "A", 0)], "u")


class EndToEndTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.pois, cls.rows = load_mock()
        cls.photos = make_photos(cls.pois, cls.rows)
        cls.visits = construct_visits(map_photos(cls.photos, cls.pois))

    def problem(self, user="An", budget=240, eta=.5, kind="time", personal=True):
        train = [v for v in self.visits if v.sequence != f"{user}/S3"]
        stats = compute_statistics(self.pois, train, user)
        return make_problem(self.pois, stats, "P1", "P8", budget, eta, kind, personal)

    def test_mock_reconstruction_and_no_leakage(self):
        self.assertEqual(len(self.photos), 103)
        self.assertEqual(len(self.visits), 34)
        self.assertEqual(len({v.sequence for v in self.visits}), 9)
        p = self.problem()
        self.assertEqual(p.statistics.averages["P2"], 30)
        self.assertEqual(p.statistics.popularity["P2"], 3)
        self.assertFalse(any(c["sequence"] == "An/S3" for c in p.statistics.contributions))
        changed = [dict(row) for row in self.rows]
        for row in changed:
            if row["user"] == "An" and row["arrival"].startswith("2026-05-03"):
                row["duration"] = 1
        reconstructed = construct_visits(map_photos(make_photos(self.pois, changed), self.pois))
        stats = compute_statistics(self.pois, [v for v in reconstructed if v.sequence != "An/S3"], "An")
        self.assertEqual(stats, p.statistics)

    def test_milp_matches_enumeration_across_60_configurations(self):
        for user, variant, budget, personal in product(["An", "Bình", "Chi"], VARIANTS, [100, 240], [True, False]):
            with self.subTest(user=user, variant=variant, budget=budget, personal=personal):
                eta, kind = VARIANTS[variant]
                p = self.problem(user, budget, eta, kind, personal)
                exact, trace = enumerate_routes(p)
                milp = solve_milp(p)
                self.assertEqual(len(trace), 1957)
                self.assertEqual(exact.status, milp.status)
                if exact.route:
                    self.assertAlmostEqual(exact.score, milp.score, places=6)
                    self.assertTrue(all(x["passed"] for x in check_solution(p, milp)))

    def test_default_result_regression(self):
        result, _ = enumerate_routes(self.problem())
        self.assertEqual(result.route, ("P1", "P3", "P5", "P6", "P7", "P8"))
        self.assertAlmostEqual(result.score, 8.5662709465451)
        self.assertAlmostEqual(result.total, 224.2590855820861)

    def test_endpoint_accounting_and_exact_budget(self):
        p = self.problem(budget=0)
        p.budget = p.cost(p.start, p.end)
        solution = solve_milp(p)
        self.assertEqual(solution.route, ("P1", "P8"))
        self.assertEqual(solution.score, 0)
        self.assertAlmostEqual(solution.total, p.travel["P1", "P8"] + p.durations["P8"])

    def test_infeasible_is_not_reported_as_optimal(self):
        p = self.problem(budget=0)
        self.assertEqual(solve_milp(p).status, "infeasible")
        self.assertEqual(enumerate_routes(p)[0].status, "infeasible")

    def test_zero_interest_preserves_equation_three(self):
        p = self.problem()
        p.statistics.time_interest["Nghệ thuật"] = 0
        new = make_problem(self.pois, p.statistics, "P1", "P8")
        self.assertEqual(new.durations["P2"], 0)

    def test_baselines_and_metrics(self):
        p = self.problem(personal=False)
        truth = [v for v in self.visits if v.sequence == "An/S3"]
        for mode in ("GNEAR", "GPOP", "RAND"):
            result = greedy(p, mode)
            self.assertEqual(result, greedy(p, mode))
            self.assertEqual(result.route[-1], "P8")
            self.assertLessEqual(result.total, p.budget + 1e-6)
        solution = Solution(("P1", "P2", "P3", "P8"), 0, 0, "feasible", "fixture")
        m = metrics(p, solution, truth)
        self.assertEqual(m["Precision"], 1)
        self.assertEqual(m["Recall"], 1)
        self.assertEqual(m["F1"], 1)
        self.assertIsNone(metrics(p, Solution((), None, None, "infeasible", "fixture"), truth)["RMSE (phút)"])

    def test_mock_edit_rejects_overlapping_visits(self):
        rows = [dict(row) for row in self.rows]
        rows[0]["duration"] = 120
        with self.assertRaisesRegex(ValueError, "chồng"):
            make_photos(self.pois, rows)

    def test_web_input_validation(self):
        from dataclasses import asdict
        poi_rows = [asdict(p) for p in self.pois]
        pois, rows = validate_inputs(poi_rows, self.rows)
        self.assertEqual(pois, self.pois)
        self.assertEqual(len(rows), 34)
        for key, value in (("poi", "missing"), ("duration", float("nan")), ("user", "")):
            broken = [dict(r) for r in self.rows]
            broken[0][key] = value
            with self.subTest(key=key), self.assertRaises(ValueError):
                validate_inputs(poi_rows, broken)

    def test_arbitrary_endpoints_and_large_budget(self):
        p = self.problem(budget=600)
        for start, end in (("P4", "P2"), ("P8", "P1")):
            q = make_problem(self.pois, p.statistics, start, end, 600)
            exact, _ = enumerate_routes(q)
            milp = solve_milp(q)
            self.assertAlmostEqual(exact.score, milp.score)
            self.assertTrue(all(x["passed"] for x in check_solution(q, milp)))


if __name__ == "__main__":
    unittest.main()
