"""Thống kê lượt ghé và mô hình lộ trình PERSTOUR. Thời gian tính bằng phút."""
from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass
from datetime import datetime
from math import asin, cos, isfinite, radians, sin, sqrt


@dataclass(frozen=True)
class POI:
    id: str
    name: str
    category: str
    lat: float
    lon: float


@dataclass(frozen=True)
class Visit:
    user: str
    poi: str
    arrival: datetime
    departure: datetime
    photo_ids: tuple[str, ...]
    sequence: str

    @property
    def minutes(self) -> float:
        return (self.departure - self.arrival).total_seconds() / 60


@dataclass
class Statistics:
    averages: dict[str, float]
    popularity: dict[str, int]
    time_interest: dict[str, float]
    frequency_interest: dict[str, int]
    contributions: list[dict]


@dataclass
class Problem:
    pois: dict[str, POI]
    start: str
    end: str
    budget: float
    interest_type: str
    statistics: Statistics
    travel: dict[tuple[str, str], float]
    durations: dict[str, float]
    rewards: dict[str, float]

    @property
    def candidates(self) -> tuple[str, ...]:
        return tuple(p for p in self.pois if p not in (self.start, self.end))

    def cost(self, a: str, b: str) -> float:
        """§3.2: visiting the destination is charged; the start is not."""
        return self.travel[a, b] + self.durations[b]


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Great-circle distance with earth radius 6371 km, not road distance."""
    a1, a2 = radians(lat1), radians(lat2)
    dlat, dlon = a2 - a1, radians(lon2 - lon1)
    a = sin(dlat / 2) ** 2 + cos(a1) * cos(a2) * sin(dlon / 2) ** 2
    return 6371 * 2 * asin(sqrt(min(1, max(0, a))))


def compute_statistics(pois: list[POI], training: list[Visit], user: str) -> Statistics:
    """Tính thống kê từ các lượt train theo (1), (2) và Định nghĩa 6."""
    poi_by_id = {poi.id: poi for poi in pois}
    visit_minutes: dict[str, list[float]] = defaultdict(list)
    for visit in training:
        minutes = visit.minutes
        if visit.poi not in poi_by_id or minutes < 0:
            raise ValueError("Lượt thăm không hợp lệ.")
        visit_minutes[visit.poi].append(minutes)
    averages, popularity = {}, {}
    for poi in pois:
        durations = visit_minutes[poi.id]
        total_minutes = sum(durations)
        if total_minutes <= 0:
            raise ValueError(f"{poi.id} cần ít nhất một lượt thăm có thời lượng dương ngoài chuyến kiểm tra.")
        popularity[poi.id] = len(durations)
        averages[poi.id] = total_minutes / len(durations)

    categories = sorted({poi.category for poi in pois})
    time_interest = dict.fromkeys(categories, 0.0)
    frequency_interest = dict.fromkeys(categories, 0)
    contributions = []
    for visit in training:
        if visit.user != user:
            continue
        category = poi_by_id[visit.poi].category
        minutes = visit.minutes
        average = averages[visit.poi]
        ratio = minutes / average
        time_interest[category] += ratio
        frequency_interest[category] += 1
        contributions.append({
            "sequence": visit.sequence,
            "poi": visit.poi,
            "category": category,
            "duration": minutes,
            "average": average,
            "ratio": ratio,
        })
    return Statistics(averages, popularity, time_interest, frequency_interest, contributions)


def make_problem(
    pois: list[POI],
    stats: Statistics,
    start: str,
    end: str,
    budget: float = 240,
    eta: float = 0.5,
    interest_type: str = "time",
    personalized: bool = True,
    speed_kmh: float = 4,
) -> Problem:
    """Lập bảng thời lượng, điểm POI và phút di chuyển cho bộ giải."""
    by_id = {p.id: p for p in pois}
    if len(by_id) != len(pois) or start not in by_id or end not in by_id or start == end:
        raise ValueError("POI phải có mã duy nhất; điểm đầu và cuối phải tồn tại và khác nhau.")
    if not all(isfinite(x) for x in (budget, eta, speed_kmh)) or budget < 0 or not 0 <= eta <= 1 or speed_kmh <= 0:
        raise ValueError("B ≥ 0, 0 ≤ η ≤ 1 và tốc độ > 0.")
    if interest_type not in ("time", "frequency"):
        raise ValueError("Loại sở thích phải là time hoặc frequency.")
    interest = stats.time_interest if interest_type == "time" else stats.frequency_interest
    # Công thức (3) dùng sở thích theo thời gian cho mọi biến thể điểm số.
    durations = {
        poi.id: stats.averages[poi.id] * (stats.time_interest[poi.category] if personalized else 1)
        for poi in pois
    }
    rewards = {
        poi.id: eta * interest[poi.category] + (1 - eta) * stats.popularity[poi.id]
        for poi in pois
    }
    travel = {
        (a.id, b.id): haversine_km(a.lat, a.lon, b.lat, b.lon) / speed_kmh * 60
        for a in pois
        for b in pois
    }
    return Problem(by_id, start, end, budget, interest_type, stats, travel, durations, rewards)


def route_values(problem: Problem, route: tuple[str, ...]) -> tuple[float, float, float]:
    """Eq. (4): score only intermediate POIs. Return score, travel, visits."""
    score = sum(problem.rewards[p] for p in route[1:-1])
    travel = sum(problem.travel[a, b] for a, b in zip(route, route[1:]))
    visits = sum(problem.durations[p] for p in route[1:])
    return score, travel, visits
