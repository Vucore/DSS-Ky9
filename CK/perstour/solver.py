"""Two exact solvers for the same §3.2 optimization problem.

MILP uses SciPy/HiGHS instead of the paper's lp_solve. Complete enumeration
is a separate, small-instance teaching/verification method, NOT a new name
for the original algorithm and NOT the internal MILP execution trace.
"""
from __future__ import annotations

from dataclasses import dataclass
from itertools import permutations
from math import inf

from .core import Problem, route_values


@dataclass(frozen=True)
class Candidate:
    index: int
    route: tuple[str, ...]
    score: float
    travel: float
    visits: float
    feasible: bool
    best_so_far: float | None
    improved: bool

    @property
    def total(self) -> float:
        return self.travel + self.visits


@dataclass(frozen=True)
class Solution:
    route: tuple[str, ...]
    score: float | None
    total: float | None
    status: str
    method: str


def enumerate_routes(problem: Problem) -> tuple[Solution, list[Candidate]]:
    """Visit every ordered subset; no pruning, so rejected routes are visible.

    Six internal POIs → sum(P(6,k), k=0..6) = 1957 routes. Ties prefer
    lower cost, then lexicographic route, purely for deterministic display.
    """
    if len(problem.candidates) > 8:
        raise ValueError("Duyệt minh hoạ chỉ hỗ trợ tối đa 8 POI trung gian.")
    trace = []
    best_route, best_score, best_total = (), -inf, inf
    for count in range(len(problem.candidates) + 1):
        for internal in permutations(problem.candidates, count):
            route = (problem.start, *internal, problem.end)
            score, travel, visits = route_values(problem, route)
            total = travel + visits
            feasible = total <= problem.budget + 1e-8
            improved = feasible and (score > best_score + 1e-9 or
                        (abs(score - best_score) < 1e-9 and (total, route) < (best_total, best_route)))
            if improved:
                best_route, best_score, best_total = route, score, total
            trace.append(Candidate(len(trace) + 1, route, score, travel, visits, feasible,
                                   None if best_score == -inf else best_score, improved))
    if not best_route:
        return Solution((), None, None, "infeasible", "enumeration"), trace
    return Solution(best_route, best_score, best_total, "optimal", "enumeration"), trace


def solve_milp(problem: Problem) -> Solution:
    """Eq. (4)–(9), binary x_ij and MTZ order variables.

    Arcs into start, out of destination and self-loops are absent. MTZ
    constraints apply to distinct non-start nodes only. Integrality is
    required for x; the order variables can be continuous [2,N].
    """
    import numpy as np
    from scipy.optimize import Bounds, LinearConstraint, milp

    nodes = tuple(problem.pois)
    n = len(nodes)
    arcs = [(a, b) for a in nodes if a != problem.end
            for b in nodes if b != problem.start and a != b]
    arc_index = {arc: i for i, arc in enumerate(arcs)}
    # Allocate compact order variables (the start can occur anywhere in input order).
    order_index = {p: len(arcs) + i for i, p in enumerate(p for p in nodes if p != problem.start)}
    size = len(arcs) + n - 1
    objective = np.zeros(size)
    lower, upper = np.zeros(size), np.ones(size)
    integral = np.zeros(size)
    for (a, b), i in arc_index.items():
        objective[i] = -problem.rewards[a] if a not in (problem.start, problem.end) else 0
        integral[i] = 1
    for i in order_index.values():
        lower[i], upper[i] = 2, n
    rows, row_lower, row_upper = [], [], []

    def add(coefficients, lb, ub):
        row = np.zeros(size)
        for i, value in coefficients.items():
            row[i] = value
        rows.append(row)
        row_lower.append(lb)
        row_upper.append(ub)

    # Eq. (5): exactly one departure from start and one arrival at end.
    add({i: 1 for (a, b), i in arc_index.items() if a == problem.start}, 1, 1)
    add({i: 1 for (a, b), i in arc_index.items() if b == problem.end}, 1, 1)
    # Eq. (6): conservation + at most one incoming edge per internal POI.
    for p in problem.candidates:
        coefficients = {i: (1 if b == p else -1) for (a, b), i in arc_index.items() if a == p or b == p}
        add(coefficients, 0, 0)
        add({i: 1 for (a, b), i in arc_index.items() if b == p}, 0, 1)
    # Eq. (7): edge cost includes destination visit duration.
    add({i: problem.cost(a, b) for (a, b), i in arc_index.items()}, -np.inf, problem.budget)
    # Eq. (8) is encoded as bounds; Eq. (9) eliminates disconnected cycles.
    for (a, b), i in arc_index.items():
        if a != problem.start:
            add({order_index[a]: 1, order_index[b]: -1, i: n - 1}, -np.inf, n - 2)
    result = milp(objective, integrality=integral, bounds=Bounds(lower, upper),
                  constraints=LinearConstraint(np.asarray(rows), row_lower, row_upper),
                  options={"time_limit": 20, "mip_rel_gap": 0})
    if result.status == 2:
        return Solution((), None, None, "infeasible", "MILP / HiGHS")
    if result.status != 0 or result.x is None:
        # Never mislabel a timeout/incumbent as a proved optimum.
        raise RuntimeError(f"MILP chưa chứng minh tối ưu: {result.message}")
    successors = {a: b for (a, b), i in arc_index.items() if result.x[i] > .5}
    route = [problem.start]
    while route[-1] != problem.end:
        following = successors.get(route[-1])
        if following is None or following in route:
            raise RuntimeError("Bộ giải trả tuyến không liên thông.")
        route.append(following)
    route = tuple(route)
    score, travel, visits = route_values(problem, route)
    if travel + visits > problem.budget + 1e-5:
        raise RuntimeError("Nghiệm MILP vượt ngân sách sau khi kiểm tra lại.")
    return Solution(route, score, travel + visits, "optimal", "MILP / HiGHS")


def check_solution(problem: Problem, solution: Solution) -> list[dict]:
    if not solution.route:
        return [{"constraint": "Khả thi", "passed": False, "detail": "Không có tuyến thỏa ngân sách."}]
    r = solution.route
    score, travel, visits = route_values(problem, r)
    return [
        {"constraint": "(5) Điểm đầu / cuối", "passed": r[0] == problem.start and r[-1] == problem.end,
         "detail": f"{r[0]} → {r[-1]}"},
        {"constraint": "(6) Không lặp POI", "passed": len(set(r)) == len(r), "detail": f"{len(r)} POI phân biệt"},
        {"constraint": "(7) Ngân sách", "passed": travel + visits <= problem.budget + 1e-6,
         "detail": f"{travel + visits:.4f} ≤ {problem.budget:.4f} phút"},
        {"constraint": "(8–9) Liên thông, không chu trình con", "passed": len(set(r)) == len(r),
         "detail": "Một đường đi liên tục từ đầu đến cuối"},
        {"constraint": "(4) Hàm mục tiêu", "passed": abs(score - solution.score) < 1e-6,
         "detail": f"Tổng điểm POI trung gian = {score:.6f}"},
    ]
