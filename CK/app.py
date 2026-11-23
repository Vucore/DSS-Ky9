"""Chạy local: uv run --no-sync streamlit run app.py."""
from __future__ import annotations

import pandas as pd
import streamlit as st

from perstour.charts import route_map
from perstour.evaluation import evaluate_glasgow, matched_durations, metrics
from perstour.flickr import DATA_SOURCE, DEFAULT_BUDGET, DEFAULT_TEST, load_glasgow
from perstour.overview import render_overview
from perstour.solver import solve_verified

st.set_page_config(page_title="PERSTOUR · Tính từng bước", layout="wide")
st.html("""<style>
.stApp {color:#18342F;}
.block-container {max-width:1120px;padding-top:4rem;padding-bottom:3rem;}
.stMarkdown p, .stMarkdown li {max-width:72ch;}
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

STEPS = ["Dữ liệu đầu vào", "Ảnh → lượt ghé", "Thống kê điểm đến", "Sở thích theo loại",
         "Thời gian và điểm số", "Tối ưu tuyến", "Kết quả"]


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


def table(rows, *, height="auto"):
    frame = pd.DataFrame(rows)
    formats = {name: st.column_config.NumberColumn(format="%.4f")
               for name in frame.select_dtypes(include="float").columns}
    st.dataframe(frame, column_config=formats, hide_index=True, height=height, width="stretch")


def poi_label(code, pois):
    return next(f"{p.id} · {p.name}" for p in pois if p.id == code)


def choose_index(options, value, fallback=0):
    return options.index(value) if value in options else fallback


def visit_table(visits):
    return [{"Du khách": v.user, "Chuyến": v.sequence, "Điểm": v.poi, "Số ảnh": len(v.photo_ids),
             "Ảnh đầu": f"{v.arrival:%d/%m/%Y %H:%M:%S}", "Ảnh cuối": f"{v.departure:%d/%m/%Y %H:%M:%S}",
             "Phút": v.minutes} for v in visits]


def route_table(problem, route):
    """Cộng từng chặng; điểm cuối tốn thời gian nhưng không cộng điểm."""
    elapsed = 0
    rows = []
    for a, b in zip(route, route[1:]):
        cost = problem.cost(a, b)
        elapsed += cost
        rows.append({"Chặng": f"{a} → {b}", "Điểm đến": problem.pois[b].name,
                     "Đi bộ (phút)": problem.travel[a, b], "Tham quan (phút)": problem.durations[b],
                     "Cộng (phút)": cost, "Luỹ kế (phút)": elapsed,
                     "Điểm cộng": problem.rewards[b] if b != problem.end else 0.0})
    return rows


solve_cached = st.cache_data(show_spinner=False)(solve_verified)
glasgow_data = st.cache_data(show_spinner=False)(load_glasgow)


def apply_config(config):
    st.session_state.config = config
    st.session_state.next_stage = 1
    st.rerun()


def model_parameters(config):
    return {key: config[key] for key in ("budget", "eta", "interest_type", "personalized")}


def glasgow_inputs(config):
    try:
        data = glasgow_data()
    except FileNotFoundError:
        st.error("Thiếu CSV Glasgow. Giải nén POI-Glas.csv và userVisits-Glas.csv vào data/glasgow.")
        st.markdown(f"[Tải dữ liệu của tác giả]({DATA_SOURCE})")
        return
    options = data.test_options()
    if not options:
        st.warning("Không có chuyến kiểm tra đủ điều kiện.")
        return
    st.subheader("Glasgow · Flickr")
    st.markdown(f"**{len(data.photo_times):,} ảnh → {len(data.visits):,} lượt ghé → {len(data.trips):,} chuyến**")
    st.caption(f"Ảnh đã có mã điểm đến và mã chuyến. [Dữ liệu của nhóm tác giả]({DATA_SOURCE})")
    held_out = st.selectbox(
        "Chuyến kiểm tra", options, index=choose_index(options, config.get("held_out", DEFAULT_TEST)),
        key="glasgow-sequence",
        format_func=lambda seq: f"Chuyến {seq} · Du khách {data.trips[seq][0].user}",
        help=f"{len(options)} chuyến đủ điều kiện trong phạm vi {len(data.candidates)} điểm tìm tuyến.",
    )
    test = data.trips[held_out]
    names = {p.id: p.name for p in data.candidates}
    st.caption(f"**Điểm đầu:** {names[test[0].poi]}  \n**Điểm cuối:** {names[test[-1].poi]}")
    left, right = st.columns(2)
    budget = left.number_input("Thời gian tối đa B (phút)", min_value=0.0, max_value=600.0,
                               value=config.get("budget", DEFAULT_BUDGET), step=10.0, key="glasgow-budget")
    eta = right.number_input("Mức ưu tiên sở thích η", min_value=0.0, max_value=1.0,
                             value=config.get("eta", .5), step=.1, format="%.2f", key="glasgow-eta",
                             help="0: chỉ độ phổ biến. 1: chỉ sở thích. 0,5: cân bằng.")
    with st.expander("Tuỳ chọn mô hình"):
        interest_type = st.selectbox("Sở thích trong điểm số", ["time", "frequency"],
                                    index=int(config.get("interest_type") == "frequency"),
                                    format_func=lambda x: "Theo thời gian" if x == "time" else "Theo số lượt",
                                    key="glasgow-interest")
        personalized = st.toggle("Cá nhân hoá thời lượng", value=config.get("personalized", True),
                                 key="glasgow-personalized")
    st.caption(f"Tìm tuyến trong {len(data.candidates)} điểm. Chuyến {held_out} được giữ riêng để đối chiếu.")
    if st.button("Tính từng bước →", type="primary"):
        apply_config(dict(held_out=held_out, budget=budget, eta=eta,
                          interest_type=interest_type, personalized=personalized))


def show_test(problem, solution, test):
    with st.expander(f"Đối chiếu với chuyến thật {test[0].sequence}"):
        st.write(" → ".join(problem.pois[visit.poi].name for visit in test))
        if not solution.route:
            st.caption("Cần có tuyến đề xuất để đối chiếu.")
            return
        scores = metrics(problem, solution, test)
        shared = len(set(solution.route) & {v.poi for v in test})
        st.caption(f"Trùng {shared} điểm, kể cả hai đầu tuyến.")
        st.markdown(f"**Precision {scores['Precision']:.0%} · Recall {scores['Recall']:.0%} · F1 {scores['F1']:.0%}**")
        duration_error = scores["RMSE (phút)"]
        rmse = f"{duration_error:.2f} phút" if duration_error is not None else "—"
        st.write(f"RMSE {rmse} · Tổng độ phổ biến {scores['T_Pop']} · Tổng sở thích {scores['T_Int']:.2f}")
        st.caption("Precision và Recall chia số điểm trùng cho số điểm của tuyến đề xuất và chuyến thật, tương ứng. "
                   "F1 kết hợp hai tỉ lệ. RMSE đo sai số thời lượng tại các điểm trùng.")
        table([{"Điểm trùng": problem.pois[poi].name, "Dự đoán (phút)": predicted,
                "Thực tế (phút)": observed, "Chênh lệch (phút)": predicted - observed}
               for poi, predicted, observed in matched_durations(problem, solution.route, test)])


def show_glasgow_batch(data, config):
    parameters = model_parameters(config)
    saved = st.session_state.get("glasgow_batch")
    batch = saved[1] if saved and saved[0] == parameters else None
    count = len(data.test_options())
    with st.expander(f"Đánh giá toàn bộ {count} chuyến test", expanded=batch is not None, key="glasgow-batch-panel"):
        st.caption("Lần lượt giữ riêng mỗi chuyến và tính lại thống kê từ phần còn lại.")
        if st.button("Chạy toàn bộ test"):
            try:
                with st.spinner(f"Đang đánh giá {count} chuyến..."):
                    batch = evaluate_glasgow(data, **parameters)
            except (ValueError, RuntimeError, ImportError) as error:
                st.error(str(error))
                return
            st.session_state.glasgow_batch = (parameters, batch)
        if batch is None:
            return

        trips, averages = batch
        feasible = sum(trip.has_route for trip in trips)
        st.write(f"**{feasible}/{len(trips)} chuyến có tuyến vừa ngân sách**")
        names = {"Precision": "Precision", "Recall": "Recall", "F1": "F1",
                 "RMSE (phút)": "RMSE (phút)", "T_Pop": "Độ phổ biến", "T_Int": "Sở thích"}
        percentages = {"Precision", "Recall", "F1"}
        summary = []
        for key, (value, samples) in averages.items():
            formatted = "—" if value is None else format(value, ".2%" if key in percentages else ".2f")
            summary.append({"Chỉ số": names[key], "Trung bình": formatted, "Số chuyến": samples})
        st.table(summary)
        st.caption("Trung bình theo chuyến. Nếu thiếu tuyến, Precision, Recall và F1 bằng 0, các chỉ số còn lại để trống.")

        details = [
            {"Chuyến test": trip.sequence, "Trạng thái": "Có tuyến" if trip.has_route else "Không có tuyến",
             **{label: trip.scores[key] for key, label in names.items()}}
            for trip in trips
        ]
        formats = {label: st.column_config.NumberColumn(format="percent" if key in percentages else "%.2f")
                   for key, label in names.items()}
        formats["Độ phổ biến"] = st.column_config.NumberColumn(format="%d")
        st.dataframe(details, column_config=formats, hide_index=True, height=320, width="stretch")


def show_visits(data, training, test):
    user = test[0].user
    held_out = test[0].sequence
    st.write("Gộp các ảnh liên tiếp tại cùng một điểm trong một chuyến. Giờ chụp trong bảng dùng UTC.")
    examples = [v for v in training if v.user == user]
    focus_poi = test[1].poi
    first_timed = next((i for i, visit in enumerate(examples) if visit.minutes > 0), 0)
    default_index = next((i for i, visit in enumerate(examples) if visit.poi == focus_poi and visit.minutes > 0),
                         first_timed)
    names = {p.id: p.name for p in data.pois}
    index = st.selectbox("Lượt tham quan", range(len(examples)),
        index=default_index,
        format_func=lambda i: f"{names[examples[i].poi]} · {examples[i].arrival:%d/%m/%Y %H:%M}")
    visit = examples[index]
    clock = "%H:%M:%S" if visit.arrival.second or visit.departure.second else "%H:%M"
    if visit.arrival.date() != visit.departure.date():
        clock = "%d/%m " + clock
    photo_clock = "%H:%M:%S" if visit.arrival.date() == visit.departure.date() else "%d/%m %H:%M:%S"
    st.caption(f"Chuyến {visit.sequence} · Điểm {visit.poi} · {len(visit.photo_ids)} ảnh")
    table([{"Mã ảnh": photo, "Giờ chụp": data.photo_times[photo].strftime(photo_clock)}
           for photo in visit.photo_ids])
    st.latex(r"\begin{aligned}d&=t_{\text{ảnh cuối}}-t_{\text{ảnh đầu}}\\"
             + r"&=\text{" + visit.departure.strftime(clock) + r"}-\text{" + visit.arrival.strftime(clock)
             + rf"}}\\&\approx {visit.minutes:.4f}\;\text{{phút}}\end{{aligned}}")
    if len(visit.photo_ids) == 1:
        st.caption("Một ảnh duy nhất cho thời lượng ước tính 0 phút.")
    with st.expander("Dữ liệu dùng để tính và dữ liệu kiểm tra"):
        st.write(f"**Dùng để tính · {len(training):,} lượt ghé**")
        st.caption("Giữ các điểm có thời lượng trung bình dương trong các chuyến còn lại.")
        table(visit_table(training), height=250)
        st.write(f"**Giữ riêng chuyến {held_out} · {len(test)} lượt ghé**")
        table(visit_table(test), height=170)


def show_averages(data, problem, training, test):
    stats = problem.statistics
    training_pois = [poi for poi in data.pois if poi.id in stats.averages]
    codes = [p.id for p in training_pois]
    selected = st.selectbox("Điểm đến", codes, index=choose_index(codes, test[1].poi),
                             format_func=lambda p: poi_label(p, training_pois))
    selected_visits = [v for v in training if v.poi == selected]
    values = [v.minutes for v in selected_visits]
    st.caption("Tính từ các chuyến dùng để lấy thống kê.")
    table([{"Chuyến": v.sequence, "Du khách": v.user, "Thời lượng (phút)": v.minutes}
           for v in selected_visits], height=220 if len(values) > 5 else "auto")
    numerator = "+".join(f"{v:g}" for v in values) if len(values) <= 6 else f"{sum(values):.4f}"
    st.latex(r"\begin{aligned}\overline V&=\frac{\text{Tổng phút}}{\text{Số lượt}}\\"
             + rf"&\approx\frac{{{numerator}}}{{{len(values)}}}"
             + rf"\approx{stats.averages[selected]:.4f}\;\text{{phút}}\end{{aligned}}")
    st.write(f"**Độ phổ biến (Pop) = {len(values)} lượt ghé.**")
    with st.expander("Thống kê tất cả điểm đến"):
        table([{"Điểm đến": p.name, "Số lượt": stats.popularity[p.id],
                "Trung bình (phút)": stats.averages[p.id]} for p in training_pois])


def show_interest(problem, test):
    stats = problem.statistics
    user = test[0].user
    categories = list(stats.time_interest)
    default_category = problem.pois[test[1].poi].category
    category = st.selectbox("Loại điểm đến", categories, index=choose_index(categories, default_category))
    contributions = [x for x in stats.contributions if x["category"] == category]
    if contributions:
        st.caption(f"Cộng tỉ số của các lượt thuộc loại {category} trong lịch sử của {user}.")
        table([{"Chuyến": x["sequence"], "Điểm": x["poi"], "Lưu lại (phút)": x["duration"], "Trung bình (phút)": x["average"],
                "Tỉ số": x["ratio"]} for x in contributions], height=220 if len(contributions) > 5 else "auto")
    else:
        st.caption(f"{user} chưa có lượt ghé thuộc loại {category} trong dữ liệu dùng để tính.")
    st.latex(r"Int^{Time}(c)=\sum_{\text{lượt thuộc }c}\frac{d(p)}{\overline V(p)}")
    terms = [rf"\frac{{{x['duration']:g}}}{{{x['average']:.4f}}}" for x in contributions]
    expression = "+".join(terms) or "0"
    if len(terms) > 2:
        expression = "+".join(f"{x['ratio']:.4f}" for x in contributions[:3])
        if len(terms) > 3:
            expression += r"+\cdots"
    st.latex(expression + rf"\approx{stats.time_interest[category]:.4f}")
    if problem.interest_type == "frequency":
        st.latex(r"Int^{Freq}_u(c)=\text{Số lượt của }u\text{ thuộc }c=" + str(stats.frequency_interest[category]))
    with st.expander("Sở thích của tất cả loại"):
        table([{"Loại": c, "Theo thời gian": stats.time_interest[c], "Theo số lượt": stats.frequency_interest[c]}
               for c in categories])


def show_costs(problem, test, eta, personalized):
    stats = problem.statistics
    pois = list(problem.pois.values())
    left, right = st.columns(2)
    codes = list(problem.pois)
    a = left.selectbox("Đi từ", codes, index=codes.index(problem.start),
                       format_func=lambda p: poi_label(p, pois))
    destinations = [p for p in codes if p != a]
    suggested = next((v.poi for v in test[1:-1] if v.poi in destinations), None)
    b = right.selectbox("Đến điểm", destinations, index=choose_index(destinations, suggested),
                        format_func=lambda p: poi_label(p, pois))
    category = problem.pois[b].category
    interest = stats.time_interest if problem.interest_type == "time" else stats.frequency_interest
    st.subheader("Thời lượng tại điểm đến")
    if personalized:
        st.latex(r"\begin{aligned}T^{Visit}&=Int^{Time}\times\overline V\\"
                 + rf"&\approx {stats.time_interest[category]:.4f}\times{stats.averages[b]:.4f}\\"
                 + rf"&\approx {problem.durations[b]:.4f}\;\text{{phút}}\end{{aligned}}")
    else:
        st.latex(rf"T^{{Visit}}_u({b})=\overline V({b})\approx{problem.durations[b]:.4f}\;\text{{phút}}")
    st.subheader("Điểm của địa danh")
    st.caption(f"I là sở thích với loại {category}. Pop là số lượt ghé điểm này.")
    st.latex(r"\begin{aligned}" + rf"s({b})&=\eta I+(1-\eta)Pop"
             + rf"\\&\approx{eta:g}\times{interest[category]:.4f}"
             + rf"\\&\quad+(1-{eta:g})\times{stats.popularity[b]}\\&\approx{problem.rewards[b]:.4f}"
             + r"\end{aligned}")
    if b in (problem.start, problem.end):
        st.caption("Tổng điểm tuyến chỉ tính các điểm trung gian.")
    st.subheader("Thời gian cả chặng")
    travel = problem.travel[a, b]
    st.caption(f"Đi bộ {travel * 4 / 60:.4f} km (Haversine) ở 4 km/h mất {travel:.4f} phút.")
    st.latex(rf"\begin{{aligned}}Cost({a},{b})&=T^{{Travel}}+T^{{Visit}}"
             + rf"\\&\approx{travel:.4f}+{problem.durations[b]:.4f}\\&\approx{problem.cost(a,b):.4f}"
             + r"\;\text{phút}\end{aligned}")
    with st.expander("Thời lượng và điểm của các địa danh"):
        table([{"Điểm đến": p.name, "Loại": p.category, "Thời lượng (phút)": problem.durations[p.id],
                "Điểm của địa điểm": problem.rewards[p.id]} for p in pois])


def show_search(problem, solution, trace):
    st.write(f"Chọn tuyến từ **{problem.pois[problem.start].name}** đến **{problem.pois[problem.end].name}** "
             f"trong **{problem.budget:g} phút**. Mỗi điểm được ghé tối đa một lần.")
    st.latex(r"\max\sum_{p\text{ trung gian}}s(p),\qquad\sum_{(i,j)}Cost(i,j)\le B")
    st.caption("Mô hình quy hoạch nguyên (MILP) chọn các chặng tạo thành tuyến có tổng điểm cao nhất.")
    direct = trace[0]
    over_budget = next((row for row in trace[1:] if not row.feasible), None) if direct.feasible else None
    examples = [direct, over_budget]
    rows = [{"Tuyến": " → ".join(row.route), "Phút": row.total, "Điểm": row.score,
             "Kết luận": "Tối ưu" if row.route == solution.route else "Vừa ngân sách" if row.feasible else "Vượt ngân sách"}
            for row in examples if row is not None]
    if solution.route and solution.route != direct.route:
        rows.append({"Tuyến": " → ".join(solution.route), "Phút": solution.total,
                     "Điểm": solution.score, "Kết luận": "Tối ưu"})
    table(rows)
    st.caption("Các số trong bảng là mã điểm đến.")


def show_result(problem, solution, test):
    if not solution.route:
        st.warning("Không có tuyến đủ thời gian. Quay lại đầu vào để tăng B hoặc chọn chuyến kiểm tra khác.")
    else:
        st.write(" → ".join(problem.pois[p].name for p in solution.route))
        st.write(f"**{solution.total:.4f} / {problem.budget:g} phút** · **{solution.score:.4f} điểm**")
        table(route_table(problem, solution.route))
        st.caption("Mỗi chặng cộng thời gian đi bộ và thời gian ghé điểm đến. Chỉ cộng điểm ở các điểm trung gian.")
        with st.expander("Sơ đồ tuyến"):
            st.plotly_chart(route_map(list(problem.pois.values()), solution.route), width="stretch")
    show_test(problem, solution, test)


def show_navigation(stage):
    st.divider()
    previous, following = st.columns(2)
    previous.button("← Quay lại", on_click=set_stage, args=(stage - 1,), width="stretch")
    if stage < 6:
        following.button("Xem kết quả →" if stage == 5 else "Tiếp →", on_click=set_stage,
                         args=(stage + 1,), type="primary", width="stretch")
    else:
        following.button("Sửa đầu vào", on_click=set_stage, args=(0,), width="stretch")


def main():
    st.session_state.setdefault("stage", -1)
    if "next_stage" in st.session_state:
        set_stage(st.session_state.pop("next_stage"))

    config = st.session_state.get("config", {})
    with st.sidebar:
        st.title("PERSTOUR")
        st.radio(
            "Các bước",
            range(-1, len(STEPS) if config else 1),
            key="stage",
            format_func=lambda i: "Tổng quan" if i == -1 else f"{i + 1} · {STEPS[i]}",
        )
        if config and st.session_state.stage > 0:
            st.caption(f"Glasgow · Chuyến {config['held_out']} · B = {config['budget']:g} phút")

    stage = st.session_state.stage
    scroll_to_start()
    if stage == -1:
        render_overview(set_stage)
        return

    st.title(f"{stage + 1} · {STEPS[stage]}")
    if stage == 0:
        glasgow_inputs(config)
        return

    try:
        data = glasgow_data()
        problem, training, test = data.prepare_trip(config["held_out"], **model_parameters(config))
    except (KeyError, ValueError, FileNotFoundError) as error:
        st.error(str(error))
        st.button("Sửa đầu vào", on_click=set_stage, args=(0,))
        return

    if stage == 1:
        show_visits(data, training, test)
    elif stage == 2:
        show_averages(data, problem, training, test)
    elif stage == 3:
        show_interest(problem, test)
    elif stage == 4:
        show_costs(problem, test, config["eta"], config["personalized"])
    else:
        try:
            with st.spinner("Tìm tuyến tối ưu..."):
                solution, trace, _ = solve_cached(problem)
        except (RuntimeError, ImportError) as error:
            st.error(str(error))
            return
        if stage == 5:
            show_search(problem, solution, trace)
        else:
            show_result(problem, solution, test)
            show_glasgow_batch(data, config)

    show_navigation(stage)


if __name__ == "__main__":
    main()
