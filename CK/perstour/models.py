"""Các kiểu dữ liệu dùng xuyên suốt pipeline PERSTOUR."""

from dataclasses import dataclass
from datetime import datetime


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
        """Thời lượng lượt ghé từ ảnh đầu đến ảnh cuối."""
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
        """Các POI có thể ghé giữa điểm đầu và điểm cuối."""
        return tuple(poi_id for poi_id in self.pois if poi_id not in (self.start, self.end))

    def cost(self, a: str, b: str) -> float:
        """Chi phí chặng theo §3.2, gồm phút đi từ a đến b và phút ghé b."""
        return self.travel[a, b] + self.durations[b]
