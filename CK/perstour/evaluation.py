"""Đối chiếu tuyến với chuyến thật và tổng hợp kết quả trên Glasgow."""
from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass
from math import sqrt
from statistics import mean

from .core import Problem, Visit
from .flickr import GlasgowData
from .solver import Solution, solve_verified

@dataclass(frozen=True)
class TripEvaluation:
    sequence: str
    has_route: bool
    scores: dict[str, float | None]


def matched_durations(problem: Problem, route: tuple[str, ...], truth: list[Visit]) -> list[tuple[str, float, float]]:
    """Return each matched POI, its predicted minutes, and its observed mean minutes."""
    observed = defaultdict(list)
    for visit in truth:
        observed[visit.poi].append(visit.minutes)
    return [(poi, problem.durations[poi], sum(observed[poi]) / len(observed[poi]))
            for poi in dict.fromkeys(route) if poi in observed]


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
    squared = [(predicted_minutes - observed_minutes) ** 2
               for _, predicted_minutes, observed_minutes in matched_durations(problem, solution.route, truth)]
    interest = problem.statistics.time_interest if problem.interest_type == "time" else problem.statistics.frequency_interest
    return {"Precision": precision, "Recall": recall,
            "F1": 2 * precision * recall / (precision + recall) if precision + recall else 0,
            "RMSE (phút)": sqrt(sum(squared) / len(squared)) if squared else None,
            "T_Pop": sum(problem.statistics.popularity[p] for p in predicted),
            "T_Int": sum(interest[problem.pois[p].category] for p in predicted)}


def evaluate_glasgow(
    data: GlasgowData, *, budget: float, eta: float, interest_type: str, personalized: bool
) -> tuple[list[TripEvaluation], dict[str, tuple[float | None, int]]]:
    """Hold out each eligible sequence independently and give each trip equal weight."""
    results = []
    for sequence in data.test_options():
        problem, _, truth = data.prepare_trip(
            sequence,
            budget=budget,
            eta=eta,
            interest_type=interest_type,
            personalized=personalized,
        )
        try:
            solution, _, _ = solve_verified(problem)
        except RuntimeError as error:
            raise RuntimeError(f"Chuyến {sequence}: {error}") from error

        scores = metrics(problem, solution, truth)
        if not solution.route:
            # P/R/F1 are zero for a missed recommendation; route totals are undefined.
            scores.update(T_Pop=None, T_Int=None)
        results.append(TripEvaluation(sequence, bool(solution.route), scores))

    averages = {}
    for key in ("Precision", "Recall", "F1", "RMSE (phút)", "T_Pop", "T_Int"):
        values = [value for row in results if (value := row.scores[key]) is not None]
        averages[key] = (mean(values) if values else None, len(values))
    return results, averages
