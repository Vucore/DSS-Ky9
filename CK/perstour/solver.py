"""Giải bài toán §3.2 bằng MILP và đối chiếu bằng duyệt độc lập."""
from __future__ import annotations

from collections.abc import Mapping
from dataclasses import dataclass
from itertools import permutations
from math import inf

from .models import Problem
from .problem import route_values


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
    """Thử mọi thứ tự POI trung gian. Cùng điểm thì ưu tiên ít phút hơn."""
    candidates = problem.candidates
    if len(candidates) > 8:
        raise ValueError("Duyệt minh hoạ chỉ hỗ trợ tối đa 8 POI trung gian.")

    trace = []
    best_route, best_score, best_total = (), -inf, inf
    for count in range(len(candidates) + 1):
        for internal in permutations(candidates, count):
            route = (problem.start, *internal, problem.end)
            score, travel, visits = route_values(problem, route)
            total = travel + visits
            feasible = total <= problem.budget + 1e-8
            higher_score = score > best_score + 1e-9
            same_score = abs(score - best_score) < 1e-9
            # Nếu cả thời gian cũng bằng nhau, dùng thứ tự mã POI.
            better_tie_break = (total, route) < (best_total, best_route)
            improved = feasible and (higher_score or (same_score and better_tie_break))
            if improved:
                best_route, best_score, best_total = route, score, total
            trace.append(Candidate(
                index=len(trace) + 1,
                route=route,
                score=score,
                travel=travel,
                visits=visits,
                feasible=feasible,
                best_so_far=None if best_score == -inf else best_score,
                improved=improved,
            ))

    if not best_route:
        return Solution((), None, None, "infeasible", "enumeration"), trace
    return Solution(best_route, best_score, best_total, "optimal", "enumeration"), trace


def solve_milp(problem: Problem) -> Solution:
    """Biểu diễn công thức (4)–(9) và giải bằng SciPy/HiGHS."""
    import numpy as np
    from scipy.optimize import Bounds, LinearConstraint, milp

    start, end = problem.start, problem.end
    nodes = tuple(problem.pois)
    n = len(nodes)

    # Vector nghiệm chứa biến chặng x_ab, sau đó là vị trí q_p của các POI.
    edges = [
        (a, b)
        for a in nodes if a != end
        for b in nodes if b != start and a != b
    ]
    edge_index = {edge: index for index, edge in enumerate(edges)}
    edge_count = len(edges)
    ordered_nodes = [poi for poi in nodes if poi != start]
    order_index = {poi: edge_count + index for index, poi in enumerate(ordered_nodes)}
    variable_count = edge_count + len(ordered_nodes)

    lower, upper = np.zeros(variable_count), np.ones(variable_count)
    integral = np.zeros(variable_count, dtype=int)
    integral[:edge_count] = 1  # x_ab thuộc {0, 1}.
    lower[edge_count:], upper[edge_count:] = 2, n  # (8) 2 ≤ q_p ≤ N.

    # (4) SciPy tối thiểu hóa. Đổi dấu để tối đa điểm của các POI trung gian.
    objective = np.zeros(variable_count)
    incoming_edges: dict[str, list[int]] = {poi: [] for poi in nodes}
    outgoing_edges: dict[str, list[int]] = {poi: [] for poi in nodes}
    for (a, b), index in edge_index.items():
        if a != start:
            objective[index] = -problem.rewards[a]
        incoming_edges[b].append(index)
        outgoing_edges[a].append(index)

    rows, row_lower, row_upper = [], [], []

    def add_constraint(coefficients: Mapping[int, float], minimum: float, maximum: float) -> None:
        row = np.zeros(variable_count)
        for index, coefficient in coefficients.items():
            row[index] = coefficient
        rows.append(row)
        row_lower.append(minimum)
        row_upper.append(maximum)

    # (5) Một chặng rời điểm đầu và một chặng đến điểm cuối.
    add_constraint(dict.fromkeys(outgoing_edges[start], 1), 1, 1)
    add_constraint(dict.fromkeys(incoming_edges[end], 1), 1, 1)

    # (6) Với mỗi POI trung gian, số chặng vào = số chặng ra ≤ 1.
    for poi in problem.candidates:
        incoming = dict.fromkeys(incoming_edges[poi], 1)
        outgoing = dict.fromkeys(outgoing_edges[poi], -1)
        add_constraint(incoming | outgoing, 0, 0)
        add_constraint(incoming, 0, 1)

    # (7) Tổng phút đi bộ và ghé các điểm đến phải nằm trong ngân sách.
    edge_costs = {index: problem.cost(a, b) for (a, b), index in edge_index.items()}
    add_constraint(edge_costs, -np.inf, problem.budget)

    # (9) MTZ: q_a - q_b + (N - 1)x_ab ≤ N - 2.
    # Khi chọn chặng a → b, vị trí b phải lớn hơn vị trí a.
    for (a, b), index in edge_index.items():
        if a != start:
            coefficients = {order_index[a]: 1, order_index[b]: -1, index: n - 1}
            add_constraint(coefficients, -np.inf, n - 2)

    result = milp(
        objective,
        integrality=integral,
        bounds=Bounds(lower, upper),
        constraints=LinearConstraint(np.asarray(rows), row_lower, row_upper),
        options={"time_limit": 20, "mip_rel_gap": 0},
    )
    if result.status == 2:
        return Solution((), None, None, "infeasible", "MILP / HiGHS")
    if result.status != 0 or result.x is None:
        raise RuntimeError(f"MILP chưa chứng minh tối ưu: {result.message}")

    # Nối các chặng được chọn thành một tuyến từ điểm đầu đến điểm cuối.
    selected_edges = [edge for edge, index in edge_index.items() if result.x[index] > 0.5]
    successors = dict(selected_edges)
    route = [start]
    while route[-1] != end:
        following = successors.get(route[-1])
        if following is None or following in route:
            raise RuntimeError("Bộ giải trả tuyến không liên thông.")
        route.append(following)
    if len(selected_edges) != len(route) - 1:
        raise RuntimeError("Nghiệm MILP có chặng nằm ngoài tuyến từ điểm đầu đến điểm cuối.")

    route_ids = tuple(route)
    score, travel, visits = route_values(problem, route_ids)
    total = travel + visits
    if total > problem.budget + 1e-5:
        raise RuntimeError("Nghiệm MILP vượt ngân sách sau khi kiểm tra lại.")
    return Solution(route_ids, score, total, "optimal", "MILP / HiGHS")


def solve_verified(problem: Problem) -> tuple[Solution, list[Candidate], Solution]:
    """Đối chiếu trạng thái và điểm tối ưu. Trả tuyến từ bộ duyệt để hiển thị."""
    enumerated_solution, trace = enumerate_routes(problem)
    milp_solution = solve_milp(problem)
    enumerated_score, milp_score = enumerated_solution.score, milp_solution.score
    if enumerated_solution.status != milp_solution.status or (
        enumerated_score is not None
        and (milp_score is None or abs(enumerated_score - milp_score) > 1e-6)
    ):
        raise RuntimeError("Hai cách giải chưa khớp. Chưa thể xác nhận kết quả tối ưu.")
    return enumerated_solution, trace, milp_solution


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
