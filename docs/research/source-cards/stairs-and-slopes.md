---
id: source-card-stairs-and-slopes
title: "Source Card: Stairs and Slopes"
status: draft
version: 26.529.2142
tags:
  - research
  - stairs
  - slope
  - terrain
---

# Source Card: Stairs and Slopes

## Metadata

Type: biomechanics and locomotion research topic.

Reliability: medium to high.

Relevance: high.

## What it says

Slope walking and stair walking are terrain-specific locomotion modes. Uphill movement increases forward lean and foot lift. Downhill movement is more cautious. Stairs require discrete foot placement on treads rather than continuous ground projection.

## Useful HLS Facts

- Uphill movement needs more forward torso lean.
- Uphill movement needs higher foot clearance.
- Uphill step length usually becomes shorter.
- Downhill movement needs cautious placement and speed reduction.
- Stairs require target selection on step surfaces.
- Pelvis height changes with stair height.

## Candidate HLS Rules

- If uphill, increase torso pitch and foot lift.
- If uphill, reduce step length and speed.
- If downhill, reduce cadence and add caution.
- If stairs, snap foot targets to tread centers.
- If stairs, smooth pelvis height per step.

## HLS Target Sections

- docs/08-modifiers/slope.md
- docs/08-modifiers/stairs.md
- docs/09-solvers/foot-target-solver.md
- docs/09-solvers/pelvis-solver.md
