# PERSTOUR Lab
<!-- impeccable:product-schema 1 -->

## Platform
web

## Stack
Streamlit and Python, confirmed by the user. Local execution, Vietnamese explanations.

## Users
The user wants to learn and implement the supplied research paper step by step.

## Product Purpose
An executable, inspectable implementation of PERSTOUR with synthetic photo histories,
visible intermediate calculations, a route diagram, and forward/back step controls.
Mock POIs and visit history are entered and edited directly in two web tables,
with row addition/deletion, validation and restore actions (confirmed).
All parameters are entered at the first step. One primary action validates and
applies tables and parameters together, then begins the calculation sequence.
Each step shows relevant values, a worked formula and visual evidence. Route
search and final results include a per-leg ledger with cumulative minutes and
score contributions. Source-code viewers, the comparison tab and repeated lesson
prose are removed at the user's request for a clean, concrete calculation flow.

## Capabilities and Constraints
Preserve equations from the supplied PDF and distinguish paper definitions from
implementation conventions. Include mock inputs and explain optimization decisions.

## Evidence on Hand
docs/Personalized Tour Recommendation Based on User Interests and Points of Interest Visit Durations.pdf
No real Flickr dataset or reproduction of the published experiment is requested.

## Open Decisions
Confirmed direction: a quiet local worksheet with one calculation per screen,
seven-step navigation and forward/back actions. Secondary model options and full
data tables use disclosure. Preserve the existing restrained visual identity.

## Algorithm Overview
Open on an optional overview before the seven calculation steps. Explain needed
inputs, the calculation sequence, a worked museum example and why routes are
accepted or rejected. Use the real calculation functions on the fixed sample
data. Entering or revisiting this page never replaces applied user inputs.
