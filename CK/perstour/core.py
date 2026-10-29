"""Paper §§3–4: photos → visits → interests → personalized edge costs.

All durations are in minutes. Scores use the raw quantities in the paper;
there is deliberately no min-max normalization or duration clipping.
"""
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
class Photo:
    id: str
    user: str
    time: datetime
    lat: float
    lon: float


@dataclass(frozen=True)
class Mapping:
    photo: Photo
    poi: str | None
    distance_m: float


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


def map_photos(photos: list[Photo], pois: list[POI], radius_m: float = 200) -> list[Mapping]:
    """§4 step 1. Nearest qualifying POI resolves overlapping 200 m regions.

    The paper leaves the multiple-match case unspecified; this convention is
    explicit. A photo exactly 200 m away does not qualify (<, not <=).
    """
    if not pois or not isfinite(radius_m) or radius_m <= 0:
        raise ValueError("Cần ít nhất một POI và bán kính dương.")
    result = []
    for photo in sorted(photos, key=lambda p: (p.user, p.time, p.id)):
        distance, nearest = min((haversine_km(photo.lat, photo.lon, p.lat, p.lon) * 1000, p.id) for p in pois)
        result.append(Mapping(photo, nearest if distance < radius_m else None, distance))
    return result


def construct_visits(mappings: list[Mapping], gap_hours: float = 8) -> list[Visit]:
    """§4 step 2, Definitions 1–2.

    A visit is a consecutive run of photos at a POI. Its duration is last
    photo minus first photo. Split sequences when the next arrival minus
    the previous departure exceeds 8 h (the printed sign is reversed).
    """
    grouped: dict[str, list[Mapping]] = defaultdict(list)
    for item in mappings:
        if item.poi is not None:
            grouped[item.photo.user].append(item)
    visits = []
    for user, items in sorted(grouped.items()):
        items.sort(key=lambda x: (x.photo.time, x.photo.id))
        runs: list[list[Mapping]] = []
        for item in items:
            if (not runs or runs[-1][-1].poi != item.poi
                    or (item.photo.time - runs[-1][-1].photo.time).total_seconds() > gap_hours * 3600):
                runs.append([item])
            else:
                runs[-1].append(item)
        sequence_number = 0
        previous_departure = None
        for run in runs:
            arrival, departure = run[0].photo.time, run[-1].photo.time
            if previous_departure is None or (arrival - previous_departure).total_seconds() > gap_hours * 3600:
                sequence_number += 1
            visits.append(Visit(user, run[0].poi, arrival, departure,
                                tuple(x.photo.id for x in run), f"{user}/S{sequence_number}"))
            previous_departure = departure
    return visits


def compute_statistics(pois: list[POI], training: list[Visit], user: str) -> Statistics:
    """Eq. (1), (2), Definition 6; holdout must be removed by the caller."""
    by_id = {p.id: p for p in pois}
    durations: dict[str, list[float]] = defaultdict(list)
    for visit in training:
        if visit.poi not in by_id or visit.minutes < 0:
            raise ValueError("Lượt thăm không hợp lệ.")
        durations[visit.poi].append(visit.minutes)
    averages, popularity = {}, {}
    for poi in pois:
        values = durations[poi.id]
        total = sum(values)
        if not values or total <= 0:
            raise ValueError(f"{poi.id} cần ít nhất một lượt thăm có thời lượng dương ngoài chuyến kiểm tra.")
        averages[poi.id] = total / len(values)
        popularity[poi.id] = len(values)
    categories = sorted({p.category for p in pois})
    time_interest = dict.fromkeys(categories, 0.0)
    frequency_interest = dict.fromkeys(categories, 0)
    contributions = []
    for visit in training:
        if visit.user == user:
            category = by_id[visit.poi].category
            ratio = visit.minutes / averages[visit.poi]
            time_interest[category] += ratio
            frequency_interest[category] += 1
            contributions.append({"sequence": visit.sequence, "poi": visit.poi,
                                  "category": category, "duration": visit.minutes,
                                  "average": averages[visit.poi], "ratio": ratio})
    return Statistics(averages, popularity, time_interest, frequency_interest, contributions)


def make_problem(pois: list[POI], stats: Statistics, start: str, end: str,
                 budget: float = 240, eta: float = .5, interest_type: str = "time",
                 personalized: bool = True, speed_kmh: float = 4) -> Problem:
    by_id = {p.id: p for p in pois}
    if len(by_id) != len(pois) or start not in by_id or end not in by_id or start == end:
        raise ValueError("POI phải có mã duy nhất; điểm đầu và cuối phải tồn tại và khác nhau.")
    if not all(isfinite(x) for x in (budget, eta, speed_kmh)) or budget < 0 or not 0 <= eta <= 1 or speed_kmh <= 0:
        raise ValueError("B ≥ 0, 0 ≤ η ≤ 1 và tốc độ > 0.")
    if interest_type not in ("time", "frequency"):
        raise ValueError("Loại sở thích phải là time hoặc frequency.")
    interest = stats.time_interest if interest_type == "time" else stats.frequency_interest
    # Eq. (3) ALWAYS uses time-based interest, even for PT-0 / PT-.5F / PT-1F.
    durations = {p.id: stats.averages[p.id] * (stats.time_interest[p.category] if personalized else 1)
                 for p in pois}
    rewards = {p.id: eta * interest[p.category] + (1 - eta) * stats.popularity[p.id] for p in pois}
    travel = {(a.id, b.id): haversine_km(a.lat, a.lon, b.lat, b.lon) / speed_kmh * 60
              for a in pois for b in pois}
    return Problem(by_id, start, end, budget, interest_type, stats, travel, durations, rewards)


def route_values(problem: Problem, route: tuple[str, ...]) -> tuple[float, float, float]:
    """Eq. (4): score only intermediate POIs. Return score, travel, visits."""
    score = sum(problem.rewards[p] for p in route[1:-1])
    travel = sum(problem.travel[a, b] for a, b in zip(route, route[1:]))
    visits = sum(problem.durations[p] for p in route[1:])
    return score, travel, visits
