"""Biểu đồ và bảng màu của giao diện giả lập."""

from functools import partial

import plotly.graph_objects as go

from perstour.charts import route_map as shared_route_map
from perstour.core import Problem


COLORS = {"Nghệ thuật": "#9B4B34", "Thiên nhiên": "#14786B",
          "Văn hoá": "#756030", "Mua sắm": "#5E63A5"}
route_map = partial(shared_route_map, category_colors=COLORS)


def timeline(problem: Problem, route):
    fig = go.Figure()
    elapsed = 0
    for a, b in zip(route, route[1:]):
        for name, minutes, color in [(f"Đi {a} → {b}", problem.travel[a, b], "#9BA99E"),
                                      (f"Thăm {b}", problem.durations[b], COLORS.get(problem.pois[b].category, "#18342F"))]:
            fig.add_trace(go.Bar(y=["Hành trình"], x=[minutes], base=[elapsed], orientation="h",
                                 name=name, marker_color=color, showlegend=False,
                                 customdata=[[name, elapsed, elapsed + minutes]],
                                 hovertemplate="%{customdata[0]}<br>%{x:.2f} phút<br>Từ phút %{customdata[1]:.2f} đến %{customdata[2]:.2f}<extra></extra>"))
            elapsed += minutes
    fig.add_vline(x=problem.budget, line_dash="dash", line_color="#AF4936",
                  annotation_text="Ngân sách B")
    fig.update_layout(height=170, margin=dict(l=0, r=30, t=30, b=0), barmode="overlay",
                      paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)",
                      xaxis=dict(title="Phút từ khi xuất phát", range=[0, max(elapsed, problem.budget) * 1.08]),
                      font=dict(color="#18342F"))
    return fig


def visit_photos(visit, photo_times):
    """Ảnh đầu → ảnh cuối: cho thấy thời lượng được suy ra từ đâu."""
    selected = sorted((photo_times[id], id) for id in visit.photo_ids)
    times = [time for time, _ in selected]
    fig = go.Figure(go.Scatter(
        x=times, y=[0] * len(times), mode="lines+markers",
        line=dict(color="#14786B", width=3), marker=dict(size=12, color="#14786B"),
        customdata=[[id, time.strftime("%H:%M:%S")] for time, id in selected],
        hovertemplate="Ảnh %{customdata[0]} · %{customdata[1]}<extra></extra>"))
    fig.update_layout(height=160, margin=dict(l=25, r=25, t=10, b=15),
                      paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)",
                      font=dict(color="#18342F"),
                      xaxis=dict(tickvals=times if len(times) <= 6 else None,
                                 tickformat="%H:%M:%S" if any(time.second for time in times) else "%H:%M",
                                 title="Giờ chụp ảnh"),
                      yaxis=dict(visible=False, range=[-1, 1]))
    return fig


def average_visits(visits, average):
    """Đặt từng lượt thăm cạnh mốc trung bình, tất cả cùng đơn vị phút."""
    fig = go.Figure(go.Bar(
        x=[f"Lượt {i+1} · {v.user}" for i, v in enumerate(visits)],
        y=[v.minutes for v in visits], marker_color="#14786B",
        text=[f"{v.minutes:g}" for v in visits], textposition="outside",
        hovertemplate="%{x}<br>%{y:.2f} phút<extra></extra>"))
    fig.add_hline(y=average, line_dash="dash", line_color="#9B4B34",
                  annotation_text=f"Trung bình {average:.2f} phút", annotation_position="top right")
    fig.update_layout(height=290, margin=dict(l=5, r=10, t=25, b=10),
                      paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)",
                      font=dict(color="#18342F"), yaxis=dict(title="Phút", rangemode="tozero"),
                      xaxis=dict(showticklabels=len(visits) <= 30,
                                 title="Lượt ghé" if len(visits) > 30 else None))
    return fig


def score_parts(popularity, interest, eta):
    """Tách tổng điểm thành hai phần để hiểu tác động của η."""
    fig = go.Figure()
    for name, value, color in [("Sở thích × η", eta * interest, "#14786B"),
                                ("Phổ biến × (1−η)", (1-eta) * popularity, "#9B4B34")]:
        fig.add_trace(go.Bar(x=[value], y=["Điểm số"], orientation="h", name=name,
                             marker_color=color, text=[f"{value:.2f}"], textposition="auto",
                             hovertemplate=name + ": %{x:.4f}<extra></extra>"))
    fig.update_layout(height=170, barmode="stack", margin=dict(l=0, r=10, t=10, b=10),
                      paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)",
                      font=dict(color="#18342F"), legend=dict(orientation="h", y=-.55),
                      xaxis=dict(title="Điểm đóng góp", rangemode="tozero"))
    return fig
