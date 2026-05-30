---
id: source-card-ik-foot-placement
title: "Source Card: IK Foot Placement"
status: draft
version: 26.530.1008
tags:
  - research
  - ik
  - foot-placement
  - linked-source
  - links
---

# Source Card: IK Foot Placement

## Metadata

| Field | Value |
|---|---|
| Title | IK Foot Placement for Game Characters |
| Type | Game animation technique / implementation pattern |
| Reliability | Medium |
| Relevance | High |
| Access status | Supported by engine docs and implementation references |

## Links

- Unreal IK Rig documentation: https://dev.epicgames.com/documentation/en-us/unreal-engine/ik-rig-in-unreal-engine
- Unreal Full Body IK: https://dev.epicgames.com/documentation/en-us/unreal-engine/full-body-ik-in-unreal-engine
- Unreal Control Rig: https://dev.epicgames.com/documentation/en-us/unreal-engine/control-rig-in-unreal-engine

## What it says

IK foot placement adjusts skeletal feet toward procedural targets and terrain constraints. It is commonly used to align feet with uneven ground, slopes, and stairs.

## What HLS Used

- Foot target generation should happen before IK application.
- IK should solve bones toward targets, not decide high-level gait rules.
- Terrain traces can provide foot target height and surface normal.
- Foot locking is required to reduce sliding during stance.

## What HLS Did Not Use

- No engine-specific IK node is mandated.
- No assumption that IK alone creates believable locomotion.
- No full-body physical balance simulation.

## Extracted HLS Facts

- Foot targets are the right abstraction for procedural contact.
- Ground traces should feed foot placement.
- Pelvis height must support foot target reach.
- IK overreach must be clamped and debugged.

## Candidate HLS Rules

```text
if legPhase.contact == true:
    preserve foot lock target
else:
    generate swing target from gait phase and terrain trace
```

```text
if footTargetReach > maxIKReach:
    clamp foot target
    emit debug warning
```

## Numeric Data

No numeric runtime rule is extracted. Reach limits and foot clearance are skeleton-specific tuning parameters.

## HLS Transformation

```text
terrain trace + gait phase
  -> procedural foot target
  -> IK target
  -> skeletal foot placement
```

## Uncertainty

- Exact stance correction threshold before visible sliding becomes worse than target error.
- Whether foot roll should be solved by FootTargetSolver or a separate foot-contact solver.

## Used By

- [Foot Target Solver](../../09-solvers/foot-target-solver.md)
- [Pelvis Solver](../../09-solvers/pelvis-solver.md)
- [Runtime Constraints](../../10-runtime/constraints.md)
- [Unreal Engine](../../11-unreal-engine/index.md)
