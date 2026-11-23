"""Điểm POI, thời lượng và chi phí của bài toán lộ trình theo §3.2."""

from math import asin, cos, isfinite, radians, sin, sqrt

from .models import POI, Problem, Statistics

WALKING_SPEED_KMH = 4.0


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Tính khoảng cách cung tròn giữa hai tọa độ, theo km."""
    a1, a2 = radians(lat1), radians(lat2)
    dlat, dlon = a2 - a1, radians(lon2 - lon1)
    a = sin(dlat / 2) ** 2 + cos(a1) * cos(a2) * sin(dlon / 2) ** 2
    return 6371 * 2 * asin(sqrt(min(1, max(0, a))))


def make_problem(
    pois: list[POI],
    stats: Statistics,
    start: str,
    end: str,
    budget: float = 240,
    eta: float = 0.5,
    interest_type: str = "time",
    personalized: bool = True,
    speed_kmh: float = WALKING_SPEED_KMH,
) -> Problem:
    """Tạo bảng điểm POI, phút tham quan và phút đi bộ cho bộ giải."""
    pois_by_id = {poi.id: poi for poi in pois}
    if len(pois_by_id) != len(pois) or start == end or start not in pois_by_id or end not in pois_by_id:
        raise ValueError("POI phải có mã duy nhất; điểm đầu và cuối phải tồn tại và khác nhau.")
    if (
        not all(isfinite(value) for value in (budget, eta, speed_kmh))
        or budget < 0
        or not 0 <= eta <= 1
        or speed_kmh <= 0
    ):
        raise ValueError("B ≥ 0, 0 ≤ η ≤ 1 và tốc độ > 0.")
    if interest_type not in ("time", "frequency"):
        raise ValueError("Loại sở thích phải là time hoặc frequency.")

    scoring_interest = stats.time_interest if interest_type == "time" else stats.frequency_interest
    durations: dict[str, float] = {}
    rewards: dict[str, float] = {}
    for poi in pois:
        poi_id, category = poi.id, poi.category
        average = stats.averages[poi_id]
        # (3) Dùng sở thích theo thời gian cho mọi biến thể điểm số.
        durations[poi_id] = average * stats.time_interest[category] if personalized else average
        # (4) Kết hợp sở thích đã chọn và độ phổ biến để tính điểm POI.
        rewards[poi_id] = eta * scoring_interest[category] + (1 - eta) * stats.popularity[poi_id]

    travel = {}
    for origin in pois:
        for destination in pois:
            distance_km = haversine_km(origin.lat, origin.lon, destination.lat, destination.lon)
            travel[origin.id, destination.id] = distance_km / speed_kmh * 60

    return Problem(
        pois=pois_by_id,
        start=start,
        end=end,
        budget=budget,
        interest_type=interest_type,
        statistics=stats,
        travel=travel,
        durations=durations,
        rewards=rewards,
    )


def route_values(problem: Problem, route: tuple[str, ...]) -> tuple[float, float, float]:
    """Trả về điểm POI trung gian, tổng phút đi bộ và tổng phút tham quan."""
    score = sum(problem.rewards[poi_id] for poi_id in route[1:-1])
    travel_minutes = sum(problem.travel[a, b] for a, b in zip(route, route[1:]))
    visit_minutes = sum(problem.durations[poi_id] for poi_id in route[1:])
    return score, travel_minutes, visit_minutes
