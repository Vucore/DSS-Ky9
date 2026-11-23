"""Chạy PERSTOUR trên bản CSV Glasgow do Kwan Hui Lim và cộng sự công bố.

Nguồn: https://sites.google.com/site/limkwanhui/datacode
Từ data-ijcai15.zip, đặt POI-Glas.csv và userVisits-Glas.csv vào data/glasgow/.
"""

from perstour.evaluation import metrics
from perstour.flickr import DEFAULT_TEST, load_glasgow
from perstour.solver import solve_verified


def main():
    data = load_glasgow()
    problem, training, test = data.prepare_trip(DEFAULT_TEST)
    solution, trace, _ = solve_verified(problem)
    if not solution.route:
        raise RuntimeError("Chuyến mặc định không có tuyến vừa ngân sách.")

    names = {poi.id: poi.name for poi in data.pois}
    print(f"Glasgow: {len(data.photo_times):,} dòng ảnh, "
          f"{len(data.visits):,} lượt ghé sau khi gom, {len(data.trips):,} chuyến.")
    print(f"Train: {len(training):,} lượt ghé tại {len(problem.statistics.averages)} POI. "
          f"Tìm tuyến trong {len(problem.pois)} POI.")
    print(f"Chuyến test {DEFAULT_TEST}:", " → ".join(names[visit.poi] for visit in test))
    print("Tuyến đề xuất:", " → ".join(names[poi] for poi in solution.route))
    print(f"Thời gian: {solution.total:.2f}/{problem.budget:g} phút. Điểm: {solution.score:.4f}.")
    print(f"HiGHS khớp điểm tốt nhất khi duyệt {len(trace):,} tuyến "
          f"({sum(candidate.feasible for candidate in trace)} tuyến vừa ngân sách).")
    scores = metrics(problem, solution, test)
    print(f"Precision {scores['Precision']:.2%} · Recall {scores['Recall']:.2%} · "
          f"F1 {scores['F1']:.2%} · RMSE {scores['RMSE (phút)']:.2f} phút.")


if __name__ == "__main__":
    main()
