"""Đối chiếu tuyến với chuyến thật và tổng hợp kết quả trên Glasgow."""
from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass
from math import sqrt
from statistics import mean

from .flickr import GlasgowData
from .models import Problem, Visit
from .solver import Solution, solve_verified


@dataclass(frozen=True)
class TripEvaluation:
    sequence: str
    has_route: bool
    scores: dict[str, float | None]


def matched_durations(
    problem: Problem, route: tuple[str, ...], truth: list[Visit]
) -> list[tuple[str, float, float]]:
    """Trả mã POI trùng, phút dự đoán và phút quan sát trung bình."""
    observed: dict[str, list[float]] = defaultdict(list)
    for visit in truth:
        observed[visit.poi].append(visit.minutes)
    return [
        (poi, problem.durations[poi], sum(observed[poi]) / len(observed[poi]))
        for poi in dict.fromkeys(route)
        if poi in observed
    ]


def metrics(problem: Problem, solution: Solution, truth: list[Visit]) -> dict[str, float | None]:
    """Tính chỉ số §5.3 trên tập POI gồm cả hai đầu tuyến."""
    predicted = set(solution.route)
    actual = {visit.poi for visit in truth}
    overlap = predicted & actual
    precision = len(overlap) / len(predicted) if predicted else 0
    recall = len(overlap) / len(actual) if actual else 0
    f1 = 2 * precision * recall / (precision + recall) if precision + recall else 0

    squared_errors = [
        (predicted_minutes - observed_minutes) ** 2
        for _, predicted_minutes, observed_minutes in matched_durations(problem, solution.route, truth)
    ]
    rmse = sqrt(sum(squared_errors) / len(squared_errors)) if squared_errors else None
    stats = problem.statistics
    interest = stats.time_interest if problem.interest_type == "time" else stats.frequency_interest
    return {
        "Precision": precision,
        "Recall": recall,
        "F1": f1,
        "RMSE (phút)": rmse,
        "T_Pop": sum(stats.popularity[poi] for poi in predicted),
        "T_Int": sum(interest[problem.pois[poi].category] for poi in predicted),
    }


def evaluate_glasgow(
    data: GlasgowData, *, budget: float, eta: float, interest_type: str, personalized: bool
) -> tuple[list[TripEvaluation], dict[str, tuple[float | None, int]]]:
    """Lần lượt giữ riêng từng chuyến đủ điều kiện và lấy trung bình theo chuyến."""
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
            # Precision, Recall và F1 bằng 0 khi không có tuyến.
            scores.update(T_Pop=None, T_Int=None)
        results.append(TripEvaluation(sequence, bool(solution.route), scores))

    averages = {}
    for key in ("Precision", "Recall", "F1", "RMSE (phút)", "T_Pop", "T_Int"):
        values = [value for row in results if (value := row.scores[key]) is not None]
        averages[key] = (mean(values) if values else None, len(values))
    return results, averages
