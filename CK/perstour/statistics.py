"""Thống kê lượt ghé và tính sở thích theo §3.1."""

from collections import defaultdict

from .models import POI, Statistics, Visit


def compute_statistics(pois: list[POI], training: list[Visit], user: str) -> Statistics:
    """Tính trung bình, độ phổ biến và sở thích từ các lượt train."""
    category_by_poi = {poi.id: poi.category for poi in pois}
    minutes_by_poi: dict[str, list[float]] = defaultdict(list)

    # Gom lượt train của mọi người theo POI.
    for visit in training:
        minutes = visit.minutes
        if visit.poi not in category_by_poi or minutes < 0:
            raise ValueError("Lượt thăm không hợp lệ.")
        minutes_by_poi[visit.poi].append(minutes)

    # (1) Thời lượng trung bình bằng tổng phút chia cho số lượt ghé.
    averages: dict[str, float] = {}
    popularity: dict[str, int] = {}
    for poi in pois:
        durations = minutes_by_poi[poi.id]
        total_minutes = sum(durations)
        if total_minutes <= 0:
            raise ValueError(
                f"{poi.id} cần ít nhất một lượt thăm có thời lượng dương ngoài chuyến kiểm tra."
            )
        visit_count = len(durations)
        averages[poi.id] = total_minutes / visit_count
        popularity[poi.id] = visit_count

    categories = sorted({poi.category for poi in pois})
    time_interest = dict.fromkeys(categories, 0.0)
    frequency_interest = dict.fromkeys(categories, 0)
    contributions = []

    # (2) Sở thích theo thời gian cộng tỉ số của từng lượt của người đang xét.
    # Định nghĩa 6 đếm các lượt đó theo loại POI.
    for visit in training:
        if visit.user != user:
            continue

        category = category_by_poi[visit.poi]
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

    return Statistics(
        averages=averages,
        popularity=popularity,
        time_interest=time_interest,
        frequency_interest=frequency_interest,
        contributions=contributions,
    )
