"""Trang mở đầu: giải thích bằng chính dữ liệu mẫu và các hàm tính toán."""
import streamlit as st

from .core import compute_statistics, construct_visits, make_problem, map_photos, route_values
from .mock import load_mock, make_photos
from .solver import enumerate_routes


@st.cache_data(show_spinner=False)
def sample_calculations(config):
    pois, rows = load_mock()
    visits = construct_visits(map_photos(make_photos(pois, rows), pois))
    training = [v for v in visits if v.sequence != config["held_out"]]
    stats = compute_statistics(pois, training, config["user"])
    problem = make_problem(pois, stats, config["start"], config["end"], config["budget"],
                           config["eta"], config["interest_type"], config["personalized"])
    solution, _ = enumerate_routes(problem)
    return training, stats, problem, solution


def render_overview(config, on_start):
    st.title("Thuật toán chọn hành trình")
    st.write("Bạn có **B phút**. PERSTOUR chọn tuyến có **tổng điểm cao nhất**, dựa trên sở thích và độ phổ biến của các điểm đến.")
    st.button("Nhập dữ liệu →", type="primary", on_click=on_start, args=(0,))

    st.subheader("Cần những gì?")
    st.write("**Điểm đến:** vị trí, loại · **Lịch sử:** ai đã đến đâu, ở bao lâu · **Hành trình:** người đi, điểm đầu/cuối, B và trọng số sở thích η.")

    st.subheader("Tính theo thứ tự nào?")
    st.table([
        {"Bước": "Ảnh → lượt tham quan", "Cách hiểu": "Lấy giờ ảnh cuối trừ giờ ảnh đầu để biết số phút ở mỗi điểm."},
        {"Bước": "Thời lượng trung bình", "Cách hiểu": "Mỗi điểm thường được thăm bao lâu? Độ phổ biến là số lượt thăm."},
        {"Bước": "Sở thích theo loại", "Cách hiểu": "Lấy thời lượng mỗi lượt của bạn chia cho trung bình, rồi cộng theo loại điểm."},
        {"Bước": "Thời gian và điểm số", "Cách hiểu": "Ước lượng thời gian cần đi và tham quan; tính điểm lợi ích của mỗi điểm đến."},
        {"Bước": "Chọn tuyến", "Cách hiểu": "Đi đúng đầu/cuối, không lặp điểm, tổng phút ≤ B; chọn tổng điểm lớn nhất."},
    ])

    training, stats, problem, solution = sample_calculations(config)
    st.subheader("Ví dụ: An thích bảo tàng thế nào?")
    st.caption("Ví dụ dùng dữ liệu mẫu, độc lập với dữ liệu bạn chỉnh · B = 240 phút · η = 0,5.")
    average = stats.averages["P2"]
    art_interest = stats.time_interest["Nghệ thuật"]
    durations = [v.minutes for v in training if v.poi == "P2"]
    st.write("**Lấy mốc so sánh.** Ba lượt thăm bảo tàng P2 dài 50, 15 và 25 phút:")
    st.latex(r"\overline V(P2)=\frac{" + "+".join(f"{v:g}" for v in durations)
             + "}{" + str(len(durations)) + rf"}}={average:g}" + r"\;\text{phút}")

    st.write("**Suy ra sở thích.** An từng ở P2 50 phút và phòng tranh P4 55 phút. Cộng hai tỉ số vì cùng thuộc loại nghệ thuật:")
    st.latex(r"\begin{aligned}I_{\text{nghệ thuật}}&\approx\frac{50}{30}+\frac{55}{"
             + f"{stats.averages['P4']:.4f}" + rf"}}\\&\approx{art_interest:.4f}\end{{aligned}}")
    st.caption(f"Trung bình tại P4 là {stats.averages['P4']:.4f} phút. Tổng tỉ số phản ánh cả số lượt và thời gian tương đối; không phải phần trăm.")

    st.write("**Gán thời gian và điểm.** Sở thích theo thời gian nhân với trung bình cho thời lượng dự kiến. Với η = 0,5, điểm số cân bằng sở thích và độ phổ biến:")
    st.latex(r"\begin{aligned}T^{Visit}(P2)&\approx" + f"{art_interest:.4f}"
             + rf"\times{average:g}\\&\approx{problem.durations['P2']:.4f}" + r"\;\text{phút}\end{aligned}")
    st.latex(r"\begin{aligned}s(P2)&\approx0.5\times" + f"{art_interest:.4f}"
             + rf"\\&\quad+0.5\times{stats.popularity['P2']}\\&\approx{problem.rewards['P2']:.4f}\end{{aligned}}")

    st.subheader("Vì sao không chọn mọi điểm yêu thích?")
    st.write("Mỗi chặng tốn **thời gian đi + thời gian tham quan điểm đến**. Tuyến nhiều điểm có thể vượt B; tuyến qua một điểm rất thích chưa chắc có tổng điểm cao nhất.")
    routes = [
        ("Đi thẳng", (problem.start, problem.end)),
        ("Qua bảo tàng P2", (problem.start, "P2", problem.end)),
        ("Qua mọi điểm", (problem.start, *problem.candidates, problem.end)),
        ("Tuyến được chọn", solution.route),
    ]
    comparison = []
    for label, route in routes:
        score, travel, visits = route_values(problem, route)
        total = travel + visits
        decision = "Vượt B" if total > problem.budget else "Đủ thời gian"
        if label == "Tuyến được chọn":
            decision = "Điểm cao nhất"
        comparison.append({"Tuyến": label, "Phút": f"{total:.2f}", "Điểm": f"{score:.4f}", "Kết luận": decision})
    st.table(comparison)
    st.write(f"**{' → '.join(solution.route)}** · {solution.total:.2f} / {problem.budget:g} phút · **{solution.score:.4f} điểm**")
    st.caption("Bảng chỉ minh hoạ vài tuyến; thuật toán kiểm tra toàn bộ để chọn nghiệm. Chỉ cộng điểm ở các điểm trung gian; thời gian tham quan điểm cuối vẫn được tính.")
    st.button("Bắt đầu tính từng bước →", type="primary", on_click=on_start, args=(0,))
