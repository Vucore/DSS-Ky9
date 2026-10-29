---
name: PERSTOUR Lab
description: A quiet Vietnamese teaching worksheet for learning a route recommendation model.
colors:
  primary: "#14786B"
  page: "#F7F7F2"
  secondary-surface: "#ECEFE7"
  text: "#18342F"
  sidebar-border: "#D7DED1"
  focus-art: "#9B4B34"
  selection: "#CDE7D8"
  culture: "#756030"
  shopping: "#5E63A5"
  invalid-route: "#AF4936"
  plot: "#EFF2E9"
  plot-grid: "#DAE2D6"
  travel: "#9BA99E"
  marker-stroke: "white"
  transparent: "rgba(0,0,0,0)"
typography:
  body:
    fontFamily: "sans-serif"
  headline:
    fontSize: "2rem"
    lineHeight: 1.2
    letterSpacing: "-.035em"
  headline-compact:
    fontSize: "1.7rem"
  title:
    fontSize: "1.4rem"
    letterSpacing: "-.025em"
  subtitle:
    fontSize: "1.1rem"
  route-plot:
    fontFamily: "Arial, sans-serif"
  route-label:
    fontSize: "13px"
spacing:
  page-top: "4rem"
  page-bottom: "3rem"
  compact-inline: "1rem"
  compact-bottom: "2rem"
components:
  worksheet-heading:
    typography: "{typography.headline}"
    textColor: "{colors.text}"
  worksheet-heading-compact:
    typography: "{typography.headline-compact}"
  route-plot:
    backgroundColor: "{colors.plot}"
    textColor: "{colors.text}"
    typography: "{typography.route-plot}"
    height: "430px"
  timeline:
    backgroundColor: "{colors.transparent}"
    textColor: "{colors.text}"
    height: "170px"
---

# Design System: PERSTOUR Lab

## Overview

**Creative North Star: "Quiet teaching worksheet"**

A restrained Vietnamese workspace puts editable data, equations and route evidence at the centre. Pale surfaces and dark green text support sustained reading; the teal accent identifies interaction and valid routes. This records the existing implementation rather than proposing a new identity.

**Key Characteristics:**
- Quiet, legible and focused on the current learning step.
- Editable web tables and visible intermediate calculations.
- Persistent seven-step navigation with forward/back controls.
- An initial algorithm overview with a direct entry into the calculation flow.
- Each step shows input values, a worked calculation and its output; no source-code viewers or comparison tab.

## Colors

### Primary

Teal (`primary`) is the Streamlit accent, valid-route stroke, nature category and interest contribution. Warm clay (`focus-art`) identifies art and the popularity contribution, and supplies the explicit keyboard-focus outline.

### Secondary

Muted ochre (`culture`) and violet (`shopping`) distinguish chart categories. Brick (`invalid-route`) identifies infeasible routes and the timeline budget boundary; muted grey-green (`travel`) separates walking time from visits. Preserve category assignments across figures.

### Neutral

Use `page` for the application canvas, `secondary-surface` for Streamlit's secondary surfaces and `text` for the reading colour. `sidebar-border` separates navigation; `selection` is the text-selection fill. Route diagrams use `plot`, `plot-grid`, transparent paper and white marker outlines.

## Typography

Streamlit owns the sans-serif family resolution, body size, weights and widget typography. The source does not pin a web font or a complete type scale. Keep the explicit heading overrides in the frontmatter; do not infer additional weights or spacing.

The main heading uses the `headline` role, section headings `title`, and smaller headings `subtitle`. The compact heading size applies at the recorded mobile breakpoint. Tables use tabular numerals and four decimal places for floating values. Route plots explicitly use `route-plot`; the interest chart and timeline retain their Plotly inheritance where not overridden.

## Layout

The wide Streamlit page has a maximum content width of **1120px**, top padding from `page-top` and bottom padding from `page-bottom`. At **700px and below**, use `compact-inline` on both sides, `compact-bottom` below and `headline-compact` for the main heading. No other custom responsive breakpoint is defined; Streamlit owns sidebar and column behaviour.

Use a sidebar with an overview entry followed by seven calculation steps and a compact applied-input summary. All editing belongs to step 1. The main workspace has one linear flow, with no workspace tabs or repeated lesson panels. Tables, equations and plots stack vertically. Input actions use **2:1** columns; previous/next actions use two equal columns; route-search actions use three equal columns. On page or step changes, return the main viewport to the top; preserve scroll while editing within a step.

Both editors are **280px** high inside a data disclosure. The interest chart is **260px** high. Route maps and timelines use their component heights. No custom sidebar width, table column width or grid gap value is specified.

## Elevation & Depth

Custom styling adds no shadows or decorative motion. Depth comes from light surface changes, the sidebar divider and native Streamlit containers. Framework defaults remain authoritative for widget elevation and interaction states.

## Shapes

The application defines no custom corner-radius scale. Preserve native Streamlit widget shapes. Route diagrams use circular POI markers, diamonds at selected route endpoints, white outlines (**2px**) and **15px** markers. Route strokes are **3px** wide; arrows indicate direction even on crossing routes.

## Components

- **Actions:** native Streamlit primary/secondary buttons, with full-width actions where implemented. Buttons and links receive a **3px** `focus-art` outline with **3px** offset when focus-visible. Disabled navigation remains visible at step boundaries.
- **Inputs:** native selectboxes, number inputs, toggles and editable data tables. Both input tables allow row addition/deletion. “Tính từng bước →” validates and applies tables and parameters together; “Dữ liệu mẫu” restores both. Model variants and the held-out trip are secondary options.
- **Tables:** stretch data tables to the available width, hide incidental row indices and use tabular numerals. Keep numerical evidence next to the equation or decision it explains. Route tables include travel, visit, leg total, cumulative minutes and score.
- **Navigation:** seven sidebar radio steps, a progress indicator and previous/next buttons. “Tính từng bước →” applies input edits; direct navigation uses the last applied inputs. Widget styling, active states and mobile sidebar behaviour belong to Streamlit.
- **Mathematical explanation:** one concise method caption, generic formula, worked substitution and related visual. Use ≈ for rounded values. Long substitutions use aligned lines that fit a narrow viewport. No source-code viewer, comparison tab or repeated lesson prose. Checks and paper details live in expanders.
- **Overview:** the first page explains inputs and calculation order with a two-column text table, then uses a fixed sample to show the museum formulas and a small route comparison. Tables wrap text on narrow screens. A primary input action appears at the top and bottom. Reopening the overview preserves applied inputs.
- **Worked visuals:** photo timestamps span 160px high, average visit bars 290px, and the weighted score breakdown 170px. Use the existing palette, explicit units and actual input values.
- **Route evidence:** keep category colours, directed route strokes, axis units and textual feasibility feedback. The route is a local coordinate diagram rather than a street-map asset; the timeline separates walking and visits with a dashed budget line.

## Do's and Don'ts

### Do:
- **Do** keep the primary flow a quiet Vietnamese teaching worksheet with seven steps.
- **Do** preserve the two editable input tables and the single calculate/restore flow.
- **Do** show concrete values and short explanations at the current step; keep checks and paper details in expanders.
- **Do** retain the implemented palette, heading scale, content width and compact layout rule.

### Don't:
- **Don't** add unnecessary introductory or technical copy to the primary flow.
- **Don't** invent fonts, radius scales, shadows or responsive breakpoints absent from the implementation.
- **Don't** substitute photographic imagery or external map tiles for the local route diagram.

Source of truth: `.streamlit/config.toml`, the CSS, equations and component declarations in `app.py`, and `perstour/charts.py`. Product context is recorded in `PRODUCT.md`. Native framework defaults are deliberately left unspecified.
