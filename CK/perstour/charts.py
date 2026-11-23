"""Các hình Plotly chạy local, không dùng tile bản đồ từ Internet."""
import plotly.graph_objects as go

from .core import haversine_km

GLASGOW_COLORS = {"Museum": "#9B4B34", "Park": "#14786B",
              "Structure": "#756030", "Shopping": "#5E63A5",
              "Transport": "#42647D", "Religion": "#933A65"}


def route_map(pois, route=(), invalid=False, *, category_colors=GLASGOW_COLORS):
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
    for category in dict.fromkeys(p.category for p in pois):
        color = category_colors.get(category, "#18342F")
        points = [p for p in pois if p.category == category]
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
