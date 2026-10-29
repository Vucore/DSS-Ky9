"""Ví dụ chạy thẳng bằng Python: uv run python demo.py.

Đọc file này trước, rồi mở từng hàm trong perstour/core.py và solver.py.
"""
from perstour.core import map_photos, construct_visits, compute_statistics, make_problem
from perstour.mock import load_mock, make_photos
from perstour.solver import enumerate_routes, solve_milp


def main():
    # 1. Đầu vào: POI và ảnh có người chụp, toạ độ, thời điểm.
    pois, mock_rows = load_mock()
    photos = make_photos(pois, mock_rows)
    print(f"1. Mock: {len(pois)} POI, {len(photos)} ảnh.")

    # 2. Gán ảnh vào POI gần nhất nếu khoảng cách < 200 m.
    mappings = map_photos(photos, pois)
    print(f"2. Gán được {sum(m.poi is not None for m in mappings)} ảnh.")

    # 3. Gom ảnh thành lượt thăm; tách chuyến nếu cách nhau > 8 giờ.
    visits = construct_visits(mappings)
    # Giữ riêng chuyến cuối của An để kiểm tra, tuyệt đối không dùng train.
    training = [v for v in visits if v.sequence != "An/S3"]
    print(f"3. Có {len(visits)} lượt thăm; train: {len(training)} lượt.")

    # 4. Công thức (1), (2): trung bình, độ phổ biến và sở thích.
    stats = compute_statistics(pois, training, user="An")
    print("4. V̄(P2) =", stats.averages["P2"], "phút")
    print("   Int Time của An:", stats.time_interest)

    # 5. Công thức (3), (4): thời lượng cá nhân hoá, điểm số, chi phí.
    problem = make_problem(pois, stats, start="P1", end="P8", budget=240, eta=.5)
    print(f"5. T Visit(P2) = {problem.durations['P2']:.6f} phút.")

    # 6. Giải MILP giống mô hình của paper, thay lp_solve bằng HiGHS.
    milp = solve_milp(problem)
    print("6. MILP:", " → ".join(milp.route), "điểm =", milp.score)

    # 7. Kiểm chứng bằng cách duyệt đủ 1957 tuyến nhỏ của ví dụ.
    exact, trace = enumerate_routes(problem)
    assert abs(exact.score - milp.score) < 1e-6
    print(f"7. Đối chiếu {len(trace)} tuyến: KHỚP.")
    print("   Tuyến phá hoà bằng thời gian:", " → ".join(exact.route))
    print(f"   Điểm: {exact.score:.6f}; thời gian: {exact.total:.6f}/240 phút.")


if __name__ == "__main__":
    main()
