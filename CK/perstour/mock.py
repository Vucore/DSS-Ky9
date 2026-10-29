"""Dữ liệu hoàn toàn giả lập: một thành phố nhỏ, 8 POI và 3 du khách.

Mỗi dòng lịch sử sinh ba ảnh: lúc đến, giữa chuyến và lúc rời đi.
Không cần Flickr, API bản đồ, tài khoản hay kết nối mạng để chạy demo.
"""
from __future__ import annotations

import csv
from datetime import datetime, timedelta
from math import isfinite
from pathlib import Path
import re

from .core import POI, Photo, haversine_km

ROOT = Path(__file__).resolve().parents[1]


def load_mock() -> tuple[list[POI], list[dict]]:
    with (ROOT / "data/pois.csv").open(encoding="utf-8") as f:
        pois = [POI(r["id"], r["name"], r["category"], float(r["lat"]), float(r["lon"]))
                for r in csv.DictReader(f)]
    with (ROOT / "data/visits.csv").open(encoding="utf-8") as f:
        rows = [{**r, "duration": float(r["duration"])} for r in csv.DictReader(f)]
    return pois, rows


def _check_visit_times(rows: list[dict]) -> None:
    """Kiểm tra thời gian mà không cần sinh ảnh."""
    for user in {r["user"] for r in rows}:
        history = sorted((r for r in rows if r["user"] == user), key=lambda r: r["arrival"])
        for a, b in zip(history, history[1:]):
            departure = datetime.fromisoformat(a["arrival"]) + timedelta(minutes=float(a["duration"]))
            if departure >= datetime.fromisoformat(b["arrival"]):
                raise ValueError(f"{user}: thời lượng tại {a['poi']} chồng lên lượt tiếp theo. Hãy giảm số phút.")


def make_photos(pois: list[POI], rows: list[dict]) -> list[Photo]:
    """Seed → ảnh mock. Sau đó thuật toán phải tự suy ra lượt thăm từ ảnh."""
    _check_visit_times(rows)
    by_id = {p.id: p for p in pois}
    photos = []
    for i, row in enumerate(rows):
        poi = by_id[row["poi"]]
        arrival = datetime.fromisoformat(row["arrival"])
        duration = float(row["duration"])
        if duration <= 0 or duration > 360:
            raise ValueError("Thời lượng mock phải lớn hơn 0 và không quá 360 phút.")
        for j, fraction in enumerate((0, .5, 1)):
            photos.append(Photo(f"F{i + 1:03d}-{j + 1}", row["user"],
                                arrival + timedelta(minutes=duration * fraction), poi.lat, poi.lon))
    # Một ảnh lạc xa để quan sát bước loại ảnh ngoài bán kính 200 m.
    outside = max([(10.9, 106.9), (0, 0), (85, 179), (-85, -179)],
                  key=lambda xy: min(haversine_km(*xy, p.lat, p.lon) for p in pois))
    photos.append(Photo("F-outside", rows[0]["user"], datetime(2026, 5, 1, 19), *outside))
    return photos


def validate_inputs(poi_rows: list[dict], visit_rows: list[dict]) -> tuple[list[POI], list[dict]]:
    """Kiểm tra hai bảng nhập trên web trước khi áp dụng cùng một lúc."""
    if not 2 <= len(poi_rows) <= 8:
        raise ValueError("Nhập từ 2 đến 8 POI để có thể xem toàn bộ tuyến từng bước.")
    pois = []
    for i, row in enumerate(poi_rows, 1):
        code = str(row.get("id", "")).strip()
        name = str(row.get("name", "")).strip()
        category = str(row.get("category", "")).strip()
        if not re.fullmatch(r"[A-Za-z][A-Za-z0-9]{0,15}", code):
            raise ValueError(f"POI dòng {i}: mã bắt đầu bằng chữ, chỉ gồm chữ và số (ví dụ P1).")
        if not name or name in ("None", "nan") or category not in ("Nghệ thuật", "Thiên nhiên", "Văn hoá", "Mua sắm"):
            raise ValueError(f"POI {code}: nhập tên và chọn một trong 4 loại điểm đến.")
        try:
            lat, lon = float(row["lat"]), float(row["lon"])
        except (ValueError, TypeError, KeyError):
            raise ValueError(f"POI {code}: nhập vĩ độ và kinh độ dạng số.") from None
        if not isfinite(lat) or not isfinite(lon) or not -90 <= lat <= 90 or not -180 <= lon <= 180:
            raise ValueError(f"POI {code}: vĩ độ phải trong [-90,90], kinh độ trong [-180,180].")
        pois.append(POI(code, name, category, lat, lon))
    codes = {p.id for p in pois}
    if len(codes) != len(pois):
        raise ValueError("Mỗi POI phải có một mã khác nhau.")
    if len({(p.lat, p.lon) for p in pois}) != len(pois):
        raise ValueError("Các điểm đến cần có toạ độ khác nhau.")
    if not visit_rows:
        raise ValueError("Nhập ít nhất một lượt thăm trong bảng lịch sử.")
    if len(visit_rows) > 150:
        raise ValueError("Ví dụ thực hành hỗ trợ tối đa 150 lượt thăm.")
    cleaned = []
    for i, row in enumerate(visit_rows, 1):
        user = str(row.get("user", "")).strip()
        if not user or user in ("None", "nan") or "/" in user:
            raise ValueError(f"Lượt thăm dòng {i}: nhập tên du khách không chứa dấu /.")
        if row.get("poi") not in codes:
            raise ValueError(f"Lượt thăm dòng {i}: POI {row.get('poi')} chưa có trong bảng điểm đến.")
        try:
            date = row["arrival"]
            arrival = date.isoformat() if isinstance(date, datetime) else datetime.fromisoformat(str(date)).isoformat()
            duration = float(row["duration"])
        except (ValueError, TypeError, KeyError):
            raise ValueError(f"Lượt thăm dòng {i}: nhập giờ đến và thời lượng hợp lệ.") from None
        if not isfinite(duration) or not 0 < duration <= 360:
            raise ValueError(f"Lượt thăm dòng {i}: số phút phải > 0 và ≤ 360.")
        if datetime.fromisoformat(arrival).tzinfo is not None:
            raise ValueError("Giờ đến dùng giờ địa phương, không kèm múi giờ.")
        cleaned.append({"user": user, "poi": row["poi"], "arrival": arrival, "duration": duration})
    _check_visit_times(cleaned)
    return pois, cleaned
