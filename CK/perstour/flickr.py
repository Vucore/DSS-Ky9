"""Đọc CSV Glasgow, gom lượt ghé và chuẩn bị đầu vào PERSTOUR."""

import csv
from collections import defaultdict
from dataclasses import dataclass
from datetime import datetime, timezone
from itertools import groupby
from pathlib import Path
from typing import NamedTuple
from urllib.parse import unquote

from .models import POI, Problem, Visit
from .problem import make_problem
from .statistics import compute_statistics

DATA_DIR = Path(__file__).resolve().parents[1] / "data" / "glasgow"
DATA_SOURCE = "https://sites.google.com/site/limkwanhui/datacode"
DEFAULT_BUDGET = 120.0
# F1 cao nhất trong các chuyến Glasgow với B=120, η=0,5 và sở thích theo thời gian.
DEFAULT_TEST = "733"
ROUTE_POIS = {"1", "2", "13", "16", "20", "21", "22", "28"}


class _PhotoRow(NamedTuple):
    taken_at: datetime
    source_id: str
    poi_id: str
    photo_id: str


@dataclass
class GlasgowData:
    pois: list[POI]
    visits: list[Visit]
    trips: dict[str, list[Visit]]
    photo_times: dict[str, datetime]

    @property
    def candidates(self) -> list[POI]:
        return [poi for poi in self.pois if poi.id in ROUTE_POIS]

    def test_options(self) -> list[str]:
        """Chuyến có ít nhất ba POI trong phạm vi demo và còn lịch sử để train."""
        positive_trips: dict[str, set[str]] = defaultdict(set)
        for visit in self.visits:
            if visit.minutes > 0:
                positive_trips[visit.user].add(visit.sequence)

        eligible = []
        for sequence, trip in self.trips.items():
            visited_pois = {visit.poi for visit in trip}
            if len(visited_pois) < 3 or not visited_pois.issubset(ROUTE_POIS):
                continue
            first, last = trip[0], trip[-1]
            training_trips = positive_trips[first.user] - {sequence}
            if first.poi != last.poi and training_trips:
                eligible.append(sequence)
        return sorted(eligible, key=int)

    def split(self, sequence: str) -> tuple[list[POI], list[Visit], list[Visit]]:
        """Trả về danh mục POI train, các lượt train và chuyến giữ riêng."""
        test = self.trips[sequence]
        remaining = [visit for visit in self.visits if visit.sequence != sequence]
        # Một lượt dương bảo đảm thời lượng trung bình dùng ở (2) dương.
        pois_with_duration = {visit.poi for visit in remaining if visit.minutes > 0}
        training_pois = [poi for poi in self.pois if poi.id in pois_with_duration]
        training = [visit for visit in remaining if visit.poi in pois_with_duration]
        return training_pois, training, test

    def prepare_trip(
        self,
        sequence: str,
        *,
        budget: float = DEFAULT_BUDGET,
        eta: float = 0.5,
        interest_type: str = "time",
        personalized: bool = True,
    ) -> tuple[Problem, list[Visit], list[Visit]]:
        """Trả về bài toán lộ trình, lịch sử train và chuyến test."""
        training_pois, training, test = self.split(sequence)
        first, last = test[0], test[-1]
        # Thống kê dùng toàn bộ train. Bộ giải chỉ xét các POI trong phạm vi demo.
        stats = compute_statistics(training_pois, training, first.user)
        problem = make_problem(
            self.candidates,
            stats,
            start=first.poi,
            end=last.poi,
            budget=budget,
            eta=eta,
            interest_type=interest_type,
            personalized=personalized,
        )
        return problem, training, test


def load_glasgow() -> GlasgowData:
    """Dùng poiID và seqID đã gán trong CSV để gom ảnh thành lượt ghé."""
    with (DATA_DIR / "POI-Glas.csv").open(encoding="utf-8-sig", newline="") as file:
        pois = [
            POI(
                id=row["poiID"],
                name=unquote(row["poiName"]).replace("_", " "),
                category=row["theme"],
                lat=float(row["lat"]),
                lon=float(row["long"]),
            )
            for row in csv.DictReader(file, delimiter=";")
        ]

    photos_by_trip: dict[tuple[str, str], list[_PhotoRow]] = defaultdict(list)
    aliases: dict[str, str] = {}
    photo_times: dict[str, datetime] = {}
    with (DATA_DIR / "userVisits-Glas.csv").open(encoding="utf-8-sig", newline="") as file:
        for index, row in enumerate(csv.DictReader(file, delimiter=";"), start=1):
            user = aliases.setdefault(row["userID"], f"U{len(aliases) + 1:03}")
            sequence = row["seqID"]
            taken_at = datetime.fromtimestamp(int(row["dateTaken"]), tz=timezone.utc)
            photo_id = f"G{index}"
            photo_times[photo_id] = taken_at
            photos_by_trip[user, sequence].append(
                _PhotoRow(taken_at, row["photoID"], row["poiID"], photo_id)
            )

    trips: dict[str, list[Visit]] = defaultdict(list)
    for (user, sequence), photos in photos_by_trip.items():
        # Sắp theo giờ chụp, dùng mã ảnh gốc để phân thứ tự khi trùng giờ.
        ordered_photos = sorted(photos)
        for poi, group in groupby(ordered_photos, key=lambda photo: photo.poi_id):
            run = list(group)
            trips[sequence].append(Visit(
                user=user,
                poi=poi,
                sequence=sequence,
                arrival=run[0].taken_at,
                departure=run[-1].taken_at,
                photo_ids=tuple(photo.photo_id for photo in run),
            ))
    visits = [visit for trip in trips.values() for visit in trip]
    return GlasgowData(pois=pois, visits=visits, trips=dict(trips), photo_times=photo_times)
