"""Các hình Plotly chạy local, không dùng tile bản đồ từ Internet."""
import plotly.graph_objects as go

from .core import Problem, haversine_km

COLORS = {"Nghệ thuật": "#9B4B34", "Thiên nhiên": "#14786B",
          "Văn hoá": "#756030", "Mua sắm": "#5E63A5"}


def route_map(pois, route=(), invalid=False):
    """Project nearby lat/lon onto km axes. A schematic, not street routing."""
    origin = pois[0]
    positions = {p.id: (
        haversine_km(origin.lat, origin.lon, origin.lat, p.lon) * (1 if p.lon >= origin.lon else -1),
        haversine_km(origin.lat, origin.lon, p.lat, origin.lon) * (1 if p.lat >= origin.lat else -1)
    ) for p in pois}
    fig = go.Figure()
    if route:
        fig.add_trace(go.Scatter(x=[positions[p][0] for p in route], y=[positions[p][1] for p in route],
                                 mode="lines", line=dict(color="#AF4936" if invalid else "#14786B", width=3),
                                 name="Tuyến đang xét", hoverinfo="skip", showlegend=False))
        # Segment directions are visible even for a route that crosses itself.
        for a, b in zip(route, route[1:]):
            x1, y1 = positions[a]
            x2, y2 = positions[b]
            fig.add_annotation(x=x1 + .62 * (x2 - x1), y=y1 + .62 * (y2 - y1),
                               ax=x1 + .48 * (x2 - x1), ay=y1 + .48 * (y2 - y1),
                               xref="x", yref="y", axref="x", ayref="y", text="", showarrow=True,
                               arrowhead=2, arrowsize=1.2, arrowwidth=2,
                               arrowcolor="#AF4936" if invalid else "#14786B")
    for category, color in COLORS.items():
        points = [p for p in pois if p.category == category]
        if not points:
            continue
        fig.add_trace(go.Scatter(
            x=[positions[p.id][0] for p in points], y=[positions[p.id][1] for p in points],
            mode="markers+text", name=category, text=[p.id for p in points],
            textposition="top center", textfont=dict(size=13, color="#18342F"),
            marker=dict(size=15, color=color,
                        line=dict(color="white", width=2),
                        symbol=["diamond" if route and p.id in (route[0], route[-1]) else "circle" for p in points]),
            customdata=[[p.name, p.category, route.index(p.id) + 1 if p.id in route else "Chưa chọn"] for p in points],
            hovertemplate="<b>%{text} · %{customdata[0]}</b><br>%{customdata[1]}<br>Thứ tự: %{customdata[2]}<extra></extra>"))
    fig.update_layout(height=430, margin=dict(l=15, r=25, t=25, b=15),
                      paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="#EFF2E9",
                      font=dict(family="Arial, sans-serif", color="#18342F"),
                      legend=dict(orientation="h", y=-.18, x=0), dragmode="pan",
                      xaxis=dict(title="Đông / Tây (km)", gridcolor="#DAE2D6", zeroline=False),
                      yaxis=dict(title="Bắc / Nam (km)", gridcolor="#DAE2D6", zeroline=False,
                                 scaleanchor="x", scaleratio=1))
    return fig


def timeline(problem: Problem, route):
    fig = go.Figure()
    elapsed = 0
    for a, b in zip(route, route[1:]):
        for name, minutes, color in [(f"Đi {a} → {b}", problem.travel[a, b], "#9BA99E"),
                                      (f"Thăm {b}", problem.durations[b], COLORS[problem.pois[b].category])]:
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


def visit_photos(visit, photos):
    """Ảnh đầu → ảnh cuối: cho thấy thời lượng được suy ra từ đâu."""
    selected = sorted((p for p in photos if p.id in visit.photo_ids), key=lambda p: p.time)
    fig = go.Figure(go.Scatter(
        x=[p.time for p in selected], y=[0] * len(selected), mode="lines+markers",
        line=dict(color="#14786B", width=3), marker=dict(size=12, color="#14786B"),
        customdata=[[p.id, p.time.strftime("%H:%M")] for p in selected],
        hovertemplate="Ảnh %{customdata[0]} · %{customdata[1]}<extra></extra>"))
    fig.update_layout(height=160, margin=dict(l=25, r=25, t=10, b=15),
                      paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)",
                      font=dict(color="#18342F"),
                      xaxis=dict(tickvals=[p.time for p in selected],
                                 tickformat="%H:%M:%S" if any(p.time.second for p in selected) else "%H:%M",
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
                      font=dict(color="#18342F"), yaxis=dict(title="Phút", rangemode="tozero"))
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
