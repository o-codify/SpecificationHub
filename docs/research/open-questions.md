---
id: open-questions
title: Open Questions
status: draft
version: 26.530.1059
tags:
  - research
  - open-questions
---

# Open Questions

## Biomechanics to Game Rules

- What phase bands should be used for stylized Level 3 walking.
- Should HLS preserve clinical phase ratios or tune them visually.
- How much pelvis vertical motion is enough before it becomes exaggerated.

## Modifiers

- Should fatigue change cadence, amplitude, or both.
- Should backpack load and fatigue stack linearly.
- Should injury override gait phase or only modify stance timing.
- Should hip, knee, ankle, and foot injury be separate modifier profiles.

## Runtime

- Should foot targets be generated fully procedurally or corrected from base animation.
- Should the first implementation support pure procedural first and animation overlays later.
- How should foot locking work on simulated network proxies.
- Which parameters should be replicated and which should be recomputed locally.

## Unreal Engine

- Should implementation be Control Rig first or C++ solver first.
- Should pelvis and spine be solved before or inside Control Rig.
- How much debug visualization is required for tuning.

## Data Gaps

- Exact numeric ranges for load-induced trunk lean in game-friendly form.
- Separate visual rules for hip, knee, ankle, and foot injury.
- Practical stair descent rules for procedural foot targets.
- Tuned values for turning, stopping, and pivot steps.
