---
id: source-card-pose-warping
title: "Source Card: Pose Warping"
status: draft
version: 26.530.1014
tags:
  - research
  - pose-warping
  - animation
  - linked-source
  - links
---

# Source Card: Pose Warping

## Metadata

| Field | Value |
|---|---|
| Title | Pose Warping / Stride Warping / Orientation Warping |
| Type | Game animation technique / engine documentation |
| Reliability | Medium to high |
| Relevance | High |
| Access status | Accessible official engine documentation |

## Links

- Unreal Pose Warping documentation: https://dev.epicgames.com/documentation/en-us/unreal-engine/pose-warping-in-unreal-engine
- Unreal Stride Warping documentation: https://dev.epicgames.com/documentation/en-us/unreal-engine/pose-warping-in-unreal-engine
- Unreal Orientation Warping documentation: https://dev.epicgames.com/documentation/en-us/unreal-engine/pose-warping-in-unreal-engine

## What it says

Pose warping modifies an animation pose to better match desired movement direction, stride, slope, or target placement. It is a practical game animation technique for adapting motion without requiring a unique animation for every context.

## What HLS Used

- Stride can be adjusted procedurally.
- Orientation can be adjusted toward movement direction.
- Warping should preserve contact timing.
- Procedural solvers can produce pose intent that later gets warped or corrected.

## What HLS Did Not Use

- HLS does not require Unreal Pose Warping specifically.
- HLS does not assume authored clips are always present.
- HLS does not replace FootTargetSolver with pose warping.

## Extracted HLS Facts

- Step length and direction can be adapted after base pose generation.
- Contact preservation is important during pose adaptation.
- PoseComposer should be the place where final adaptation priorities are resolved.

## Candidate HLS Rules

```text
if desiredStride != baseStride:
    apply stride correction before final IK
```

```text
if movementDirection != facingDirection:
    apply orientation adaptation while preserving foot contacts
```

## Numeric Data

No numeric runtime rule is extracted.

## HLS Transformation

```text
pose warping concept
  -> stride correction rule
  -> orientation adaptation rule
  -> PoseComposer priority rule
```

## Uncertainty

- Whether HLS first implementation needs authored clips plus warping or pure procedural targets.
- Which warping tasks belong in PoseComposer versus Unreal animation graph.

## Used By

- [Pose Composer](../../09-solvers/pose-composer.md)
- [Runtime Update Order](../../10-runtime/update-order.md)
- [Unreal Engine](../../11-unreal-engine/index.md)
