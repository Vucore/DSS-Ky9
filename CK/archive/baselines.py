"""Các biến thể và baseline dùng trong ví dụ so sánh."""

import random

from perstour.core import Problem, route_values
from perstour.solver import Solution


VARIANTS = {
    "PT-0": (0.0, "time"),
    "PT-.5T": (.5, "time"),
    "PT-.5F": (.5, "frequency"),
    "PT-1T": (1.0, "time"),
    "PT-1F": (1.0, "frequency"),
}


def greedy(problem: Problem, mode: str, seed: int = 42) -> Solution:
    """§5.2: randomly choose among top 3 nearest/popular, or all for RAND.

    Feasibility guard reserves time to reach the required destination. All
    three baselines use average (non-personalized) visits for comparison.
    """
    rng = random.Random(seed)
    route = [problem.start]
    elapsed = 0.0
    if problem.cost(problem.start, problem.end) > problem.budget:
        return Solution((), None, None, "infeasible", mode)
    while route[-1] != problem.end:
        current = route[-1]
        available = [p for p in problem.pois if p not in route
                     and elapsed + problem.cost(current, p)
                     + (0 if p == problem.end else problem.cost(p, problem.end)) <= problem.budget + 1e-8]
        if not available:
            raise RuntimeError("Không thể kết thúc baseline dù đã dự trữ thời gian.")
        if mode == "GNEAR":
            available.sort(key=lambda p: (problem.travel[current, p], p))
            available = available[:3]
        elif mode == "GPOP":
            available.sort(key=lambda p: (-problem.statistics.popularity[p], p))
            available = available[:3]
        elif mode != "RAND":
            raise ValueError("Baseline phải là GNEAR, GPOP hoặc RAND.")
        next_poi = rng.choice(available)
        elapsed += problem.cost(current, next_poi)
        route.append(next_poi)
    score, travel, visits = route_values(problem, tuple(route))
    return Solution(tuple(route), score, travel + visits, "feasible", mode)
