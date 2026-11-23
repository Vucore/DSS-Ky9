"""Gán ảnh theo tọa độ và suy ra lượt ghé cho ví dụ giả lập."""

from collections import defaultdict
from dataclasses import dataclass
from datetime import datetime
from math import isfinite

from perstour.core import POI, Visit, haversine_km


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
