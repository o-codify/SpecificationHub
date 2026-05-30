---
id: source-card-pose-warping
title: "Source Card: Pose Warping"
status: draft
version: 26.530.1355
tags:
  - research
  - pose-warping
  - animation
  - linked-source
  - links
  - numeric
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

The source-backed implementation relationship is that pose adaptation can adjust stride and orientation while preserving believable contacts. HLS treats specific limits and blending times as gameplay tuning.

## What HLS Used

- Stride can be adjusted procedurally.
- Orientation can be adjusted toward movement direction.
- Warping should preserve contact timing.
- Procedural solvers can produce pose intent that later gets warped or corrected.
- Pose adaptation should run before final IK/contact constraints are committed.

## What HLS Did Not Use

- HLS does not require Unreal Pose Warping specifically.
- HLS does not assume authored clips are always present.
- HLS does not replace FootTargetSolver with pose warping.
- HLS does not let pose warping override stance foot locking.

## Extracted HLS Facts

- Step length and direction can be adapted after base pose generation.
- Contact preservation is important during pose adaptation.
- PoseComposer should be the place where final adaptation priorities are resolved.
- Warping is an adaptation layer, not the source of locomotion state.

## Candidate HLS Rules

```text
if desiredStride != baseStride:
    apply stride correction before final IK
```

```text
if movementDirection != facingDirection:
    apply orientation adaptation while preserving foot contacts
```

```text
StrideWarpScale = clamp(DesiredStride / max(BaseStride, epsilon), 0.65, 1.35)
OrientationWarpDeg = clamp(FacingToMovementAngle, -90, 90)
WarpBlendTime = 0.08..0.20 s
```

## Numeric Data

No numeric runtime rule is extracted from the engine documentation itself.

| Value | Meaning | Usage in HLS |
|---|---|---|
| stride can be adapted | implementation relationship | PoseComposer stride correction |
| orientation can be adapted | implementation relationship | turn/orientation readability |
| contact preservation matters | implementation relationship | do not break foot lock |
| `StrideWarpScale = 0.65..1.35` | HLS tuning range | prevent over-stretched steps |
| `OrientationWarpDeg = -90..90` | HLS tuning range | movement/facing mismatch adaptation |
| `WarpBlendTime = 0.08..0.20 s` | HLS tuning range | avoid pose pops |
| `FootLockPriority > WarpPriority` | HLS implementation rule | preserve stance contact |

## HLS Transformation

```text
pose warping concept
  -> stride correction rule
  -> orientation adaptation rule
  -> PoseComposer priority rule
  -> contact-preserving clamps
```

## Uncertainty

- Whether HLS first implementation needs authored clips plus warping or pure procedural targets.
- Which warping tasks belong in PoseComposer versus Unreal animation graph.
- Exact stride/orientation warp limits need playtesting per animation style.

## Used By

- [Pose Composer](../../09-solvers/pose-composer.md)
- [Runtime Update Order](../../10-runtime/update-order.md)
- [Unreal Engine](../../11-unreal-engine/index.md)
