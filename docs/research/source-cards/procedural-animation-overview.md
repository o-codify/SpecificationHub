---
id: source-card-procedural-animation-overview
title: "Source Card: Procedural Animation Overview"
status: draft
version: 26.530.1355
tags:
  - research
  - procedural-animation
  - linked-source
  - links
  - numeric
---

# Source Card: Procedural Animation Overview

## Metadata

| Field | Value |
|---|---|
| Title | Procedural Animation for Game Characters |
| Type | Game animation technique / engine documentation / implementation pattern |
| Reliability | Medium |
| Relevance | High |
| Access status | Accessible engine docs and implementation references |

## Links

- Unreal Control Rig: https://dev.epicgames.com/documentation/en-us/unreal-engine/control-rig-in-unreal-engine
- Unreal IK Rig: https://dev.epicgames.com/documentation/en-us/unreal-engine/ik-rig-in-unreal-engine
- Unreal Full Body IK: https://dev.epicgames.com/documentation/en-us/unreal-engine/full-body-ik-in-unreal-engine
- Unreal Pose Warping: https://dev.epicgames.com/documentation/en-us/unreal-engine/pose-warping-in-unreal-engine

## What it says

Procedural animation generates motion from rules, targets, constraints, traces, and solvers instead of relying only on authored clips. For HLS, the key pattern is to compute pose intent in runtime and let animation systems apply it to the skeleton.

The source-backed implementation relationship is architectural: gameplay/runtime state should become explicit pose intent, then animation systems apply that intent through blending, IK, Control Rig, and constraints. HLS numeric limits are implementation tuning values, not claims from Unreal documentation.

## What HLS Used

- Runtime should own locomotion intent.
- Animation systems should apply pose intent to bones.
- Foot targets and pelvis targets are better abstractions than directly writing bones from gameplay code.
- Debug visualization is essential for tuning procedural motion.
- Solver outputs should be deterministic, clamped, and inspectable.
- IK/Control Rig should consume resolved targets rather than inventing gameplay state.

## What HLS Did Not Use

- No requirement to make all animation purely procedural.
- No requirement to avoid authored overlays.
- No requirement to use a single Unreal feature for all solvers.
- No claim that engine docs provide HLS gait constants.

## Extracted HLS Facts

- Procedural locomotion should be modular.
- Solvers should be deterministic and debuggable.
- IK/Control Rig should consume targets rather than invent gameplay state.
- Pose composition should happen before final IK/FK application.
- Safety clamps and priority rules should run before final skeleton output.
- Debug output should expose any clamp, downgrade, or solver override.

## Candidate HLS Rules

```text
Runtime owns intent.
Animation applies pose.
```

```text
C++ solvers -> pose intent -> AnimBP / Control Rig -> final skeleton
```

```text
FootTargetSolver outputs targets; IK applies bones.
```

```text
ModifierResolver -> ParameterSystem -> Solvers -> PoseComposer -> IK/ControlRig -> OutputPose
```

```text
FootLockPriority > PoseWarpPriority > CosmeticSecondaryMotion
SafetyClamps run before OutputPose
```

## Numeric Data

No numeric runtime rule is extracted from procedural animation documentation itself.

| Value | Meaning | Usage in HLS |
|---|---|---|
| runtime owns intent | implementation relationship | solver architecture |
| animation applies pose | implementation relationship | AnimBP / Control Rig output |
| targets before bones | implementation relationship | FootTarget/Pelvis/Arm intent |
| debug visibility | implementation relationship | tuning and validation |
| `PoseSmoothing = 0.08..0.20 s` | HLS tuning range | avoid solver pops |
| `PhaseCorrectionTime = 0.10..0.30 s` | HLS tuning range | preserve continuity |
| `IKReach = 0.85..0.95 * LegLength` | HLS safety range | prevent unreachable targets |
| `FootLockPriority > WarpPriority` | HLS implementation rule | preserve stance contact |
| `ClampDebugRequired = true` | HLS implementation rule | expose safety interventions |

## HLS Transformation

```text
procedural animation implementation pattern
  -> runtime solver architecture
  -> target-based pose intent
  -> deterministic parameter resolution
  -> clamp/debug stage
  -> IK/FK output layer
```

## Uncertainty

- Exact split between C++, AnimBP, and Control Rig in first implementation.
- How much authored animation should be mixed with procedural solvers.
- Performance limits for many networked characters.
- Which debug values must be always-on versus development-only.

## Used By

- [Principles](../../01-principles/index.md)
- [Solvers](../../09-solvers/index.md)
- [Runtime](../../10-runtime/index.md)
- [Solver Interfaces](../../10-runtime/solver-interfaces.md)
- [Unreal Engine](../../11-unreal-engine/index.md)
