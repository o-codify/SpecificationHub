---
id: source-card-ik-foot-placement
title: "Source Card: IK Foot Placement"
status: draft
version: 26.529.2142
tags:
  - research
  - ik
  - foot-placement
---

# Source Card: IK Foot Placement

## Metadata

Type: game development and animation technique topic.

Reliability: medium.

Relevance: high.

## What it says

IK foot placement adjusts foot targets to terrain and contact constraints. It is useful for slopes, stairs, uneven ground, and reducing foot sliding.

## Useful HLS Facts

- Foot target generation should happen before IK.
- IK should solve bones toward targets.
- Terrain traces can provide foot height and surface normal.
- Foot locking is necessary during stance.
- Pelvis height must support both foot contacts.

## Candidate HLS Rules

- During stance, lock foot target.
- During swing, trace next foot target.
- Align foot orientation to surface normal within limits.
- Move pelvis to avoid overextension.

## HLS Target Sections

- docs/09-solvers/foot-target-solver.md
- docs/09-solvers/pelvis-solver.md
- docs/11-unreal-engine/ik.md
