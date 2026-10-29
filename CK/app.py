"""Chạy local: uv run --no-sync streamlit run app.py."""
from __future__ import annotations

from dataclasses import asdict
from pathlib import Path
import json

import pandas as pd
import plotly.express as px
import streamlit as st

from perstour.charts import COLORS, average_visits, route_map, score_parts, timeline, visit_photos
from perstour.core import POI, compute_statistics, construct_visits, make_problem, map_photos, route_values
from perstour.mock import load_mock, make_photos, validate_inputs
from perstour.overview import render_overview
from perstour.solver import check_solution, enumerate_routes, solve_milp

st.set_page_config(page_title="PERSTOUR · Tính từng bước", page_icon="📍", layout="wide")
st.html("""<style>
.stApp {color:#18342F;}
.block-container {max-width:1120px;padding-top:4rem;padding-bottom:3rem;}
h1 {font-size:2rem !important;letter-spacing:-.035em;line-height:1.2 !important;}
h2 {font-size:1.4rem !important;letter-spacing:-.025em;}
h3 {font-size:1.1rem !important;}
[data-testid="stSidebar"] {border-right:1px solid #D7DED1;}
[data-testid="stDataFrame"] {font-variant-numeric:tabular-nums;}
button:focus-visible, a:focus-visible {outline:3px solid #9B4B34 !important;outline-offset:3px;}
::selection {background:#CDE7D8;color:#18342F;}
input {caret-color:#14786B;}
a {text-underline-offset:3px;}
@media(max-width:700px) {.block-container{padding:4rem 1rem 2rem;}h1{font-size:1.7rem !important;}}
</style>""")

STEPS = ["Nhập dữ liệu", "Tính lượt tham quan", "Tính trung bình", "Tính sở thích",
         "Tính thời gian & điểm", "Chọn tuyến", "Kết quả"]
DEFAULT_CONFIG = dict(user="An", held_out="An/S3", budget=240.0, eta=.5,
                      start="P1", end="P8", interest_type="time", personalized=True)


def set_stage(stage):
    st.session_state.stage = stage


def scroll_to_start():
    """Chỉ cuộn khi đổi bước; giữ vị trí khi đang chỉnh giá trị."""
    if st.session_state.get("visible_stage") != st.session_state.stage:
        st.session_state.visible_stage = st.session_state.stage
        st.html('''<script>
        requestAnimationFrame(() => {
            document.querySelector('[data-testid="stMain"]')?.scrollTo({top: 0});
        });
        </script>''', unsafe_allow_javascript=True)


def move_candidate(delta, maximum):
    st.session_state.iteration = max(0, min(maximum, st.session_state.iteration + delta))


def set_candidate(index):
    st.session_state.iteration = index


def table(rows):
    frame = pd.DataFrame(rows)
    formats = {name: st.column_config.NumberColumn(format="%.4f")
               for name in frame.select_dtypes(include="float").columns}
    st.dataframe(frame, column_config=formats, hide_index=True, width="stretch")


def poi_label(code, pois):
    return next(f"{p.id} · {p.name}" for p in pois if p.id == code)


def choose_index(options, value, fallback=0):
    return options.index(value) if value in options else fallback


def visit_table(visits):
    return [{"Du khách": v.user, "Chuyến": v.sequence, "Điểm": v.poi,
             "Giờ đến": v.arrival, "Giờ rời": v.departure, "Phút": v.minutes} for v in visits]


def route_table(problem, route):
    """Cộng từng chặng; điểm cuối tốn thời gian nhưng không cộng điểm."""
    elapsed = 0
    rows = []
    for a, b in zip(route, route[1:]):
        elapsed += problem.cost(a, b)
        rows.append({"Chặng": f"{a} → {b}", "Điểm đến": problem.pois[b].name,
                     "Đi bộ (phút)": problem.travel[a, b], "Tham quan (phút)": problem.durations[b],
                     "Cộng (phút)": problem.cost(a, b), "Luỹ kế (phút)": elapsed,
                     "Điểm cộng": problem.rewards[b] if b != problem.end else 0.0})
    return rows


def route_math(problem, route):
    score, travel, duration = route_values(problem, route)
    st.latex(r"\begin{aligned}T&\approx\underbrace{" + f"{travel:.4f}" + r"}_{\text{đi bộ}}+\underbrace{"
             + f"{duration:.4f}" + r"}_{\text{tham quan}}\\&\approx" + f"{travel + duration:.4f}"
             + r"\;\text{phút}\end{aligned}")
    terms = [f"{problem.rewards[p]:.4f}" for p in route[1:-1]]
    if terms:
        lines = [r"S&\approx" + "+".join(terms[:3])]
        if len(terms) > 3:
            lines.append(r"&\quad+" + "+".join(terms[3:]))
        lines.append(rf"&\approx{score:.4f}")
        st.latex(r"\begin{aligned}" + r"\\".join(lines) + r"\end{aligned}")
    else:
        st.latex("S=0")


@st.cache_data(show_spinner=False)
def solve_cached(problem):
    exact, trace = enumerate_routes(problem)
    milp = solve_milp(problem)
    if exact.status != milp.status or (exact.score is not None and abs(exact.score - milp.score) > 1e-6):
        raise RuntimeError("Hai cách giải chưa khớp. Chưa thể xác nhận kết quả tối ưu.")
    return exact, trace, milp


if "mock_rows" not in st.session_state:
    default_pois, st.session_state.mock_rows = load_mock()
    st.session_state.mock_pois = [asdict(p) for p in default_pois]
if "config" not in st.session_state:
    st.session_state.config = DEFAULT_CONFIG.copy()
if "editor_revision" not in st.session_state:
    st.session_state.editor_revision = 0
if "stage" not in st.session_state:
    st.session_state.stage = -1
if "iteration" not in st.session_state:
    st.session_state.iteration = 0
if "next_stage" in st.session_state:
    st.session_state.stage = st.session_state.pop("next_stage")

config = st.session_state.config
with st.sidebar:
    st.title("PERSTOUR")
    st.radio("Các bước", range(-1, len(STEPS)),
             format_func=lambda i: "Tổng quan thuật toán" if i == -1 else f"{i + 1} · {STEPS[i]}", key="stage")
    if st.session_state.stage > 0:
        st.divider()
        st.caption(f"{config['user']} · {config['start']} → {config['end']}\n\n"
                   f"B = {config['budget']:g} phút · η = {config['eta']:g}")

stage = st.session_state.stage
if stage == -1:
    render_overview(DEFAULT_CONFIG, set_stage)
    scroll_to_start()
    st.stop()

st.title(f"{stage + 1} · {STEPS[stage]}")
st.progress(stage / (len(STEPS) - 1))

if stage == 0:
    with st.expander(f"Điểm đến và lịch sử · {len(st.session_state.mock_pois)} điểm, {len(st.session_state.mock_rows)} lượt"):
        st.subheader("Điểm đến")
        edited_pois = st.data_editor(pd.DataFrame(st.session_state.mock_pois), hide_index=True,
            num_rows="dynamic", width="stretch", height=280,
            key=f"poi-editor-{st.session_state.editor_revision}",
            column_config={
                "id": st.column_config.TextColumn("Mã", required=True),
                "name": st.column_config.TextColumn("Tên điểm đến", required=True),
                "category": st.column_config.SelectboxColumn("Loại", options=list(COLORS), required=True),
                "lat": st.column_config.NumberColumn("Vĩ độ", format="%.5f", required=True),
                "lon": st.column_config.NumberColumn("Kinh độ", format="%.5f", required=True)})
        st.subheader("Lịch sử tham quan")
        input_rows = pd.DataFrame(st.session_state.mock_rows)
        input_rows["arrival"] = pd.to_datetime(input_rows["arrival"])
        edited_visits = st.data_editor(input_rows, hide_index=True, width="stretch", num_rows="dynamic", height=280,
            key=f"visit-editor-{st.session_state.editor_revision}",
            column_config={
                "user": st.column_config.TextColumn("Du khách", required=True),
                "poi": st.column_config.TextColumn("Mã điểm", required=True),
                "arrival": st.column_config.DatetimeColumn("Giờ đến", format="DD/MM/YYYY HH:mm", required=True),
                "duration": st.column_config.NumberColumn("Lưu lại (phút)", min_value=1, max_value=360, step=1, required=True)})
        st.caption("Bấm đúp để sửa; thêm hoặc xoá dòng ngay trong bảng. Từ 2–8 điểm đến.")

    # Xem trước bảng đang sửa để các lựa chọn người/điểm/chuyến luôn khớp đầu vào.
    input_error = None
    try:
        pois, rows = validate_inputs(edited_pois.to_dict("records"), edited_visits.to_dict("records"))
    except ValueError as error:
        input_error = str(error)
        pois = [POI(**p) for p in st.session_state.mock_pois]
        rows = st.session_state.mock_rows
    preview_visits = construct_visits(map_photos(make_photos(pois, rows), pois))
    users = sorted({v.user for v in preview_visits})
    codes = [p.id for p in pois]
    revision = st.session_state.editor_revision

    left, middle, right = st.columns(3)
    user = left.selectbox("Du khách", users, index=choose_index(users, config["user"]), key=f"user-{revision}")
    budget = middle.number_input("Thời gian tối đa B (phút)", min_value=0.0, max_value=600.0,
                                 value=float(config["budget"]), step=10.0, key=f"budget-{revision}")
    eta = right.number_input("Mức ưu tiên sở thích η", min_value=0.0, max_value=1.0,
                            value=float(config["eta"]), step=.1, format="%.2f", key=f"eta-{revision}",
                            help="0: chỉ độ phổ biến. 1: chỉ sở thích. 0,5: cân bằng.")
    left, right = st.columns(2)
    start = left.selectbox("Xuất phát", codes, index=choose_index(codes, config["start"]),
                           format_func=lambda p: poi_label(p, pois), key=f"start-{revision}")
    ends = [p for p in codes if p != start]
    end = right.selectbox("Kết thúc", ends, index=choose_index(ends, config["end"], len(ends) - 1),
                          format_func=lambda p: poi_label(p, pois), key=f"end-{revision}")
    with st.expander("Tuỳ chọn mô hình"):
        sequences = sorted({v.sequence for v in preview_visits if v.user == user})
        held_out = st.selectbox("Chuyến giữ riêng để kiểm tra", sequences,
                                index=choose_index(sequences, config["held_out"], len(sequences) - 1),
                                key=f"held-out-{revision}",
                                help="Không dùng chuyến này để tính trung bình và sở thích.")
        interest_type = st.selectbox("Sở thích trong điểm số", ["time", "frequency"],
                                    index=0 if config["interest_type"] == "time" else 1,
                                    key=f"interest-{revision}",
                                    format_func=lambda x: "Theo thời gian" if x == "time" else "Theo số lượt")
        personalized = st.toggle("Cá nhân hoá thời lượng", value=config["personalized"],
                                 key=f"personalized-{revision}",
                                 help="Luôn dùng sở thích theo thời gian cho thời lượng, kể cả khi tính điểm theo số lượt.")

    left, right = st.columns([2, 1])
    if left.button("Tính từng bước →", type="primary", width="stretch"):
        try:
            if input_error:
                raise ValueError(input_error)
            training = [v for v in preview_visits if v.sequence != held_out]
            compute_statistics(pois, training, user)
        except ValueError as error:
            st.error(f"{error} Mở bảng dữ liệu để bổ sung hoặc đổi chuyến giữ riêng.")
        else:
            st.session_state.mock_pois = [asdict(p) for p in pois]
            st.session_state.mock_rows = rows
            st.session_state.config = dict(user=user, held_out=held_out, budget=budget, eta=eta,
                start=start, end=end, interest_type=interest_type, personalized=personalized)
            st.session_state.editor_revision += 1
            st.session_state.iteration = 0
            st.session_state.next_stage = 1
            st.rerun()
    if right.button("Dữ liệu mẫu", width="stretch"):
        default_pois, st.session_state.mock_rows = load_mock()
        st.session_state.mock_pois = [asdict(p) for p in default_pois]
        st.session_state.config = DEFAULT_CONFIG.copy()
        st.session_state.editor_revision += 1
        st.rerun()
    scroll_to_start()
    st.stop()

pois = [POI(**p) for p in st.session_state.mock_pois]
photos = make_photos(pois, st.session_state.mock_rows)
mappings = map_photos(photos, pois)
visits = construct_visits(mappings)
user, held_out = config["user"], config["held_out"]
training = [v for v in visits if v.sequence != held_out]
try:
    stats = compute_statistics(pois, training, user)
    problem = make_problem(pois, stats, config["start"], config["end"], config["budget"],
                           config["eta"], config["interest_type"], config["personalized"])
except ValueError as error:
    st.error(str(error))
    st.button("Sửa dữ liệu", on_click=set_stage, args=(0,))
    st.stop()

if stage == 1:
    st.caption("Ảnh gần điểm dưới 200 m được gom thành lượt thăm. Hai lượt cách nhau hơn 8 giờ thuộc hai chuyến.")
    examples = [v for v in training if v.user == user]
    if not examples:
        examples = training
    index = st.selectbox("Lượt tham quan", range(len(examples)),
        format_func=lambda i: f"{examples[i].user} · {examples[i].poi} · {examples[i].arrival:%d/%m %H:%M}")
    visit = examples[index]
    clock = "%H:%M:%S" if visit.arrival.second or visit.departure.second else "%H:%M"
    if visit.arrival.date() != visit.departure.date():
        clock = "%d/%m " + clock
    st.latex(r"d=t_{\text{ảnh cuối}}-t_{\text{ảnh đầu}}")
    st.latex(r"d(" + visit.poi + r")=\text{" + visit.departure.strftime(clock)
             + r"}-\text{" + visit.arrival.strftime(clock) + "}=" + f"{visit.minutes:g}" + r"\;\text{phút}")
    st.plotly_chart(visit_photos(visit, photos), width="stretch")
    st.caption("Mỗi dòng nhập sinh 3 ảnh: lúc đến, giữa lượt và lúc rời.")
    st.subheader(f"Lịch sử dùng tính toán · {len(training)} lượt")
    table(visit_table(training))
    st.caption(f"Đã giữ riêng {held_out} ({sum(v.sequence == held_out for v in visits)} lượt), không đưa vào các bước tính.")
    with st.expander("Chi tiết gán ảnh"):
        table([{"Ảnh": x.photo.id, "Du khách": x.photo.user, "Giờ": x.photo.time,
                "Điểm": x.poi or "Ngoài 200 m", "Khoảng cách (m)": x.distance_m} for x in mappings])

elif stage == 2:
    selected = st.selectbox("Điểm đến", list(problem.pois), index=min(1, len(pois) - 1),
                             format_func=lambda p: poi_label(p, pois))
    selected_visits = [v for v in training if v.poi == selected]
    values = [v.minutes for v in selected_visits]
    st.caption("Cộng thời lượng của mọi lượt tại điểm này, rồi chia cho số lượt.")
    table([{"Du khách": v.user, "Giờ đến": v.arrival, "Thời lượng (phút)": v.minutes} for v in selected_visits])
    st.latex(r"\overline V(p)=\frac{\text{Tổng phút tham quan}}{\text{Số lượt}}")
    numerator = "+".join(f"{v:g}" for v in values) if len(values) <= 6 else f"{sum(values):.4f}"
    st.latex(r"\overline V(" + selected + r")=\frac{" + numerator + "}{" + str(len(values))
             + rf"}}\approx{stats.averages[selected]:.4f}" + r"\;\text{phút}")
    st.latex(r"Pop(" + selected + ")=" + str(len(values)) + r"\;\text{lượt}")
    st.plotly_chart(average_visits(selected_visits, stats.averages[selected]), width="stretch")
    with st.expander("Kết quả mọi điểm"):
        table([{"Điểm": p.id, "Số lượt Pop": stats.popularity[p.id],
                "Trung bình (phút)": stats.averages[p.id]} for p in pois])

elif stage == 3:
    categories = list(stats.time_interest)
    category = st.selectbox("Loại điểm đến", categories, index=choose_index(categories, "Nghệ thuật"))
    contributions = [x for x in stats.contributions if x["category"] == category]
    st.caption(f"Với mỗi lượt của {user}, lấy số phút lưu lại chia cho trung bình. Cộng các tỉ số cùng loại.")
    table([{"Điểm": x["poi"], "Lưu lại (phút)": x["duration"], "Trung bình (phút)": x["average"],
            "Tỉ số": x["ratio"]} for x in contributions])
    st.latex(r"Int^{Time}_u(c)=\sum_{\text{lượt của }u\text{ thuộc }c}\frac{d(p)}{\overline V(p)}")
    terms = [rf"\frac{{{x['duration']:g}}}{{{x['average']:.4f}}}" for x in contributions]
    expression = "+".join(terms) if len(terms) <= 6 else "+".join(f"{x['ratio']:.4f}" for x in contributions[:3]) + r"+\cdots"
    st.latex((expression or "0") + rf"\approx{stats.time_interest[category]:.4f}")
    st.caption("Tỉ số 2 nghĩa là ở lâu gấp 2 lần trung bình. Tổng sở thích không phải phần trăm.")
    if config["interest_type"] == "frequency":
        st.latex(r"Int^{Freq}_u(c)=\text{Số lượt của }u\text{ thuộc }c=" + str(stats.frequency_interest[category]))
        st.caption("Đang dùng số lượt cho điểm số; thời lượng ở bước sau vẫn dùng tổng tỉ số.")
    interests = stats.time_interest if config["interest_type"] == "time" else stats.frequency_interest
    chart = px.bar(x=list(interests.values()), y=list(interests), orientation="h", text_auto=".4f",
                   labels={"x": "Sở thích", "y": ""}, color_discrete_sequence=["#14786B"])
    chart.update_layout(height=260, margin=dict(t=10, l=0, b=0, r=45),
                        paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)", font=dict(color="#18342F"))
    st.plotly_chart(chart, width="stretch")

elif stage == 4:
    left, right = st.columns(2)
    a = left.selectbox("Đi từ", list(problem.pois), format_func=lambda p: poi_label(p, pois))
    b = right.selectbox("Đến điểm", [p for p in problem.pois if p != a], format_func=lambda p: poi_label(p, pois))
    category = problem.pois[b].category
    eta = config["eta"]
    interest = stats.time_interest if config["interest_type"] == "time" else stats.frequency_interest
    st.subheader(f"Thời lượng tại {b}")
    if config["personalized"]:
        st.latex(r"T^{Visit}_u(p)=Int^{Time}_u(Cat_p)\times\overline V(p)")
        st.latex(r"\begin{aligned}" + f"T^{{Visit}}_u({b})&\\approx{stats.time_interest[category]:.4f}\\times{stats.averages[b]:.4f}"
                 + rf"\\&\approx{problem.durations[b]:.4f}" + r"\;\text{phút}\end{aligned}")
    else:
        st.latex(r"T^{Visit}_u(p)=\overline V(p)")
        st.latex(f"T^{{Visit}}_u({b})\\approx{problem.durations[b]:.4f}" + r"\;\text{phút}")
    st.subheader(f"Điểm đóng góp của {b}")
    st.latex(r"s(p)=\eta I+(1-\eta)Pop(p)")
    st.caption(f"I: sở thích với {category.lower()} · Pop: số lượt thăm điểm này.")
    st.latex(r"\begin{aligned}" + f"s({b})&\\approx{eta:g}\\times{interest[category]:.4f}"
             + rf"\\&\quad+(1-{eta:g})\times{stats.popularity[b]}\\&\approx{problem.rewards[b]:.4f}"
             + r"\end{aligned}")
    st.plotly_chart(score_parts(stats.popularity[b], interest[category], eta), width="stretch")
    if b in (problem.start, problem.end):
        st.caption(f"{b} là điểm đầu/cuối: không cộng điểm này vào tổng điểm tuyến.")
    st.subheader(f"Thời gian chặng {a} → {b}")
    travel = problem.travel[a, b]
    st.latex(r"T^{Travel}(i,j)=\frac{D(i,j)}{4}\times60")
    st.latex(r"\begin{aligned}T^{Travel}(" + a + "," + b + r")&\approx\frac{" + f"{travel * 4 / 60:.4f}"
             + r"}{4}\times60\\&\approx" + f"{travel:.4f}" + r"\;\text{phút}\end{aligned}")
    st.caption("D: khoảng cách giữa hai toạ độ (km), tính bằng Haversine. Tốc độ đi bộ: 4 km/h.")
    st.latex(r"\begin{aligned}Cost(" + a + "," + b + r")&=T^{Travel}+T^{Visit}"
             + rf"\\&\approx{travel:.4f}+{problem.durations[b]:.4f}\\&\approx{problem.cost(a,b):.4f}"
             + r"\;\text{phút}\end{aligned}")
    st.plotly_chart(timeline(problem, (a, b)), width="stretch")
    with st.expander("Kết quả mọi điểm"):
        table([{"Điểm": p.id, "Loại": p.category, "Thời lượng (phút)": problem.durations[p.id],
                "Điểm đóng góp": problem.rewards[p.id]} for p in pois])

elif stage == 5:
    st.caption("Chọn tuyến không lặp điểm, đúng đầu/cuối, tổng thời gian ≤ B và tổng điểm lớn nhất.")
    st.latex(r"\max S=\sum_{p\text{ trung gian}}s(p)")
    st.latex(r"T=\sum_{(i,j)\text{ trên tuyến}}Cost(i,j)\le B")
    try:
        with st.spinner("Tính các tuyến..."):
            solution, trace, milp = solve_cached(problem)
    except (RuntimeError, ImportError) as error:
        st.error(str(error))
        st.stop()
    st.slider("Số tuyến đã xét", 0, len(trace), key="iteration")
    left, middle, right = st.columns(3)
    k = st.session_state.iteration
    left.button("Lùi 1 tuyến", disabled=k == 0, on_click=move_candidate, args=(-1, len(trace)), width="stretch")
    middle.button("Xét tuyến tiếp", disabled=k == len(trace), on_click=move_candidate,
                  args=(1, len(trace)), type="primary", width="stretch")
    right.button("Xét tất cả", disabled=k == len(trace), on_click=set_candidate, args=(len(trace),), width="stretch")
    if k == 0:
        st.info("Bấm Xét tuyến tiếp: bắt đầu từ tuyến đi thẳng giữa điểm đầu và cuối.")
    else:
        current = trace[k - 1]
        st.subheader(f"Tuyến {k}/{len(trace)} · {' → '.join(current.route)}")
        table(route_table(problem, current.route))
        route_math(problem, current.route)
        if not current.feasible:
            st.error(f"Loại: {current.total:.4f} > {problem.budget:g} phút; vượt {current.total - problem.budget:.4f} phút.")
        elif current.improved:
            st.success(f"Giữ: {current.total:.4f} ≤ {problem.budget:g} phút; tốt nhất trong các tuyến đã xét.")
        else:
            st.info(f"Đủ thời gian ({current.total:.4f} ≤ {problem.budget:g}), chưa cải thiện tuyến đang giữ.")
        best = next((x for x in reversed(trace[:k]) if x.improved), None)
        if best:
            st.write(f"**Đang giữ:** {' → '.join(best.route)} · **{best.score:.4f} điểm** · {best.total:.4f} phút")
        st.plotly_chart(route_map(pois, current.route, invalid=not current.feasible), width="stretch")
        if k == len(trace):
            st.caption(f"Đã xét đủ {len(trace):,} tuyến, {sum(x.feasible for x in trace)} tuyến đủ thời gian. Cùng điểm thì ưu tiên thời gian ít hơn.")
    with st.expander("Cách giải theo paper"):
        st.write("Paper dùng quy hoạch nguyên (MILP). Phần xét tuyến ở trên minh hoạ phép cộng và quyết định giữ/loại; nghiệm được đối chiếu với MILP.")
        st.latex(r"\max\sum_{i\ne s,e}\sum_j s(i)x_{ij}\quad\text{với }x_{ij}\in\{0,1\}")
        st.caption("xᵢⱼ = 1 nếu đi từ i đến j. Ràng buộc đảm bảo đúng đầu/cuối, liên tục, không lặp và đủ thời gian.")
        paper = Path(__file__).parent / "docs/Personalized Tour Recommendation Based on User Interests and Points of Interest Visit Durations.pdf"
        st.download_button("Paper gốc", paper.read_bytes(), paper.name, "application/pdf")

else:
    try:
        with st.spinner("Tìm tuyến tối ưu..."):
            solution, trace, milp = solve_cached(problem)
    except (RuntimeError, ImportError) as error:
        st.error(str(error))
        st.stop()
    if not solution.route:
        st.warning("Không có tuyến đủ thời gian. Quay lại đầu vào để tăng B hoặc đổi điểm đầu/cuối.")
    else:
        st.subheader(" → ".join(solution.route))
        st.write(f"**{solution.total:.4f} / {problem.budget:g} phút** · **{solution.score:.4f} điểm**")
        st.plotly_chart(route_map(pois, solution.route), width="stretch")
        st.subheader("Cộng từng chặng")
        table(route_table(problem, solution.route))
        st.caption("Không tính thời gian tại điểm xuất phát. Điểm kết thúc có thời gian tham quan, nhưng không cộng điểm.")
        route_math(problem, solution.route)
        st.latex(r"\begin{aligned}T_{\text{còn}}&=B-T\\&\approx" + f"{problem.budget:g}-{solution.total:.4f}"
                 + rf"\\&\approx{problem.budget - solution.total:.4f}" + r"\;\text{phút}\end{aligned}")
        st.plotly_chart(timeline(problem, solution.route), width="stretch")
        checks = check_solution(problem, solution)
        with st.expander("Kiểm tra kết quả"):
            table([{"Điều kiện": x["constraint"], "Đạt": x["passed"], "Chi tiết": x["detail"]} for x in checks])
            st.write(f"Điểm tối ưu MILP: {milp.score:.6f}. Khớp với duyệt đủ {len(trace):,} tuyến.")
        st.download_button("Tải kết quả (JSON)", json.dumps({
            "inputs": config, "synthetic": True, "solution": asdict(solution), "milp": asdict(milp),
            "steps": route_table(problem, solution.route), "statistics": asdict(stats),
            "durations_minutes": problem.durations, "rewards": problem.rewards, "checks": checks
        }, ensure_ascii=False, indent=2), "perstour_result.json", "application/json")

st.divider()
previous, following = st.columns(2)
previous.button("← Quay lại", on_click=set_stage, args=(stage - 1,), width="stretch")
if stage < 6:
    label = "Tính kết quả →" if stage == 5 else f"Tiếp: {STEPS[stage + 1].lower()} →"
    following.button(label, on_click=set_stage, args=(stage + 1,), type="primary", width="stretch")
else:
    following.button("Sửa đầu vào", on_click=set_stage, args=(0,), width="stretch")
scroll_to_start()
