---
id: source-card-ik-foot-placement
title: "Source Card: IK Foot Placement"
status: draft
version: 26.530.1355
tags:
  - research
  - ik
  - foot-placement
  - linked-source
  - links
  - numeric
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

The source-backed implementation relationship is that IK applies targets and constraints. HLS keeps high-level gait, terrain, and modifier decisions outside IK so the IK layer does not invent locomotion state.

## What HLS Used

- Foot target generation should happen before IK application.
- IK should solve bones toward targets, not decide high-level gait rules.
- Terrain traces can provide foot target height and surface normal.
- Foot locking is required to reduce sliding during stance.
- IK reach and pelvis offsets must be clamped and debugged.

## What HLS Did Not Use

- No engine-specific IK node is mandated.
- No assumption that IK alone creates believable locomotion.
- No full-body physical balance simulation.
- No universal numeric reach value independent of skeleton scale.

## Extracted HLS Facts

- Foot targets are the right abstraction for procedural contact.
- Ground traces should feed foot placement.
- Pelvis height must support foot target reach.
- IK overreach must be clamped and debugged.
- Foot lock and target reach are implementation safety constraints, not clinical gait facts.

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

```text
MaxIKReach = LegLength * 0.85..0.95
FlatFootClearance = 0.04..0.10 m
StanceCorrectionSoftLimit = 0.02..0.05 m
```

## Numeric Data

No numeric runtime rule is extracted from the engine documentation itself. Reach limits and foot clearance are skeleton-specific tuning parameters.

| Value | Meaning | Usage in HLS |
|---|---|---|
| foot targets before IK | implementation relationship | Foot Target Solver owns target intent |
| IK solves reachable targets | implementation relationship | Runtime Constraints and debug warnings |
| stance foot locking | implementation relationship | reduce sliding during stance |
| `MaxIKReach = 0.85..0.95 * LegLength` | HLS safety range | prevent overextension |
| `FlatFootClearance = 0.04..0.10 m` | HLS tuning range | terrain clearance |
| `StanceCorrectionSoftLimit = 0.02..0.05 m` | HLS tuning range | avoid visible sliding |
| `FootOrientationClamp = 25 deg` | HLS safety range | avoid extreme sole alignment |
| `PelvisOffsetClamp = 0.10..0.18 * LegLength` | HLS safety range | keep feet reachable |

## HLS Transformation

```text
terrain trace + gait phase
  -> procedural foot target
  -> reach and clearance clamps
  -> IK target
  -> skeletal foot placement
```

## Uncertainty

- Exact stance correction threshold before visible sliding becomes worse than target error.
- Whether foot roll should be solved by FootTargetSolver or a separate foot-contact solver.
- Skeleton-specific leg length, retargeting, and animation style need calibration.

## Used By

- [Foot Target Solver](../../09-solvers/foot-target-solver.md)
- [Pelvis Solver](../../09-solvers/pelvis-solver.md)
- [Runtime Constraints](../../10-runtime/constraints.md)
- [Unreal Engine](../../11-unreal-engine/index.md)
