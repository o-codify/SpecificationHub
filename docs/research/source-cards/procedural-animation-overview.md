---
id: source-card-procedural-animation-overview
title: "Source Card: Procedural Animation Overview"
status: draft
version: 26.529.2220
tags:
  - research
  - procedural-animation
  - linked-source
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

## What HLS Used

- Runtime should own locomotion intent.
- Animation systems should apply pose intent to bones.
- Foot targets and pelvis targets are better abstractions than directly writing bones from gameplay code.
- Debug visualization is essential for tuning procedural motion.

## What HLS Did Not Use

- No requirement to make all animation purely procedural.
- No requirement to avoid authored overlays.
- No requirement to use a single Unreal feature for all solvers.

## Extracted HLS Facts

- Procedural locomotion should be modular.
- Solvers should be deterministic and debuggable.
- IK/Control Rig should consume targets rather than invent gameplay state.
- Pose composition should happen before final IK/FK application.

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

## Numeric Data

No numeric runtime rule is extracted.

## HLS Transformation

```text
procedural animation implementation pattern
  -> runtime solver architecture
  -> target-based pose intent
  -> IK/FK output layer
```

## Uncertainty

- Exact split between C++, AnimBP, and Control Rig in first implementation.
- How much authored animation should be mixed with procedural solvers.
- Performance limits for many networked characters.

## Used By

- `docs/01-principles/index.md`
- `docs/09-solvers/index.md`
- `docs/10-runtime/index.md`
- `docs/10-runtime/solver-interfaces.md`
- `docs/11-unreal-engine/index.md`
