---
id: source-card-pose-warping
title: "Source Card: Pose Warping"
status: draft
version: 26.529.2143
tags:
  - research
  - pose-warping
  - animation
---

# Source Card: Pose Warping

## Metadata

Type: game animation technique.

Reliability: medium.

Relevance: high.

## What it says

Pose warping modifies an existing pose to match desired direction, stride, slope, or target placement. It is useful when procedural rules need to adapt authored or generated pose intent.

## Useful HLS Facts

- Stride length can be warped to match speed.
- Orientation can be warped to match movement direction.
- Foot placement can be corrected after base pose generation.
- Warping should preserve contact timing.

## Candidate HLS Rules

- Use stride warping to correct step length.
- Use orientation warping for turns and strafing.
- Preserve foot locks during stance.
- Apply pose warping after parameter resolution but before final IK.

## HLS Target Sections

- docs/09-solvers/pose-composer.md
- docs/10-runtime/update-order.md
- docs/11-unreal-engine
