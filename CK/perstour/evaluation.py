"""§5: metrics and the paper's five PERSTOUR variants.

Hold out an entire sequence BEFORE fitting any statistics. Use its total
elapsed time as budget for evaluation, never its POIs as model features.
"""
from __future__ import annotations

from math import sqrt
import random

from .core import Problem, Visit, route_values
from .solver import Solution

VARIANTS = {
    "PT-0": (0.0, "time"),
    "PT-.5T": (.5, "time"),
    "PT-.5F": (.5, "frequency"),
    "PT-1T": (1.0, "time"),
    "PT-1F": (1.0, "frequency"),
}


def metrics(problem: Problem, solution: Solution, truth: list[Visit]) -> dict:
    """§5.3 includes endpoints in set metrics and tour totals.

    RMSE is undefined if no POI overlaps. Do not silently turn it into zero.
    If a ground-truth POI repeats, average its observed durations explicitly.
    """
    predicted = set(solution.route)
    actual = {v.poi for v in truth}
    overlap = predicted & actual
    precision = len(overlap) / len(predicted) if predicted else 0
    recall = len(overlap) / len(actual) if actual else 0
    squared = []
    for p in sorted(overlap):
        values = [v.minutes for v in truth if v.poi == p]
        observed = sum(values) / len(values)
        squared.append((problem.durations[p] - observed) ** 2)
    interest = problem.statistics.time_interest if problem.interest_type == "time" else problem.statistics.frequency_interest
    return {"Precision": precision, "Recall": recall,
            "F1": 2 * precision * recall / (precision + recall) if precision + recall else 0,
            "RMSE (phút)": sqrt(sum(squared) / len(squared)) if squared else None,
            "T_Pop": sum(problem.statistics.popularity[p] for p in predicted),
            "T_Int": sum(interest[problem.pois[p].category] for p in predicted)}


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
