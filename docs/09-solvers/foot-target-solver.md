---
id: foot-target-solver
title: Foot Target Solver
status: draft
version: 26.530.1058
tags:
  - solver
  - feet
  - ik
  - provenance
  - links
  - numeric
---

# Foot Target Solver

## Purpose

Computes procedural foot targets for stance, swing, terrain adaptation, stairs, and modifiers.

The solver outputs intent. IK or Control Rig applies the final bones.

## Inputs

- gait cycle output
- velocity, meters per second
- desired direction
- ground trace data
- slope or stairs data
- step length, meters
- step width, meters
- foot lift height, meters
- injury and load modifiers

## Outputs

- left foot target transform
- right foot target transform
- contact state for each foot
- foot lock state for each foot

## Rules

- During stance, the foot target should remain locked unless terrain correction is required.
- During swing, the foot follows a lifted arc toward the next target.
- Step length scales with speed and modifiers.
- Step width should stay stable enough to avoid crossing feet.
- Slope increases foot clearance uphill.
- Stairs use discrete tread targets instead of continuous projection.
- Injury can reduce confidence and shorten step length.
- Foot target reach must be clamped before IK to avoid overextension.

## Runtime Notes

Foot locking is more important than exact anatomical motion. Visible foot sliding breaks believability faster than small phase errors.

```text
StepFrequencyHz = CadenceSPM / 60
StepLengthMeters = SpeedMetersPerSecond / max(StepFrequencyHz, 0.01)
StepLengthMeters = clamp(StepLengthMeters, MinStepLength, MaxStepLength)
StepWidthMeters = clamp(ResolvedStepWidth, 0.08, 0.22)
FlatFootLiftMeters = clamp(ResolvedFootLift, 0.04, 0.10)
RunFootLiftMeters = FlatFootLiftMeters * 1.25..2.00
SlopeFootLiftBonus = max(0, SlopeDegrees) * 0.002..0.006 meters/degree
MaxTargetReach = LegLength * 0.85..0.95
```

## Rule Provenance

### Stance foot locking

| Field | Value |
|---|---|
| Rule | During stance, foot target remains locked unless correction is required. |
| Source card | [IK Foot Placement](../research/source-cards/ik-foot-placement.md) |
| External link | https://dev.epicgames.com/documentation/en-us/unreal-engine/ik-rig-in-unreal-engine |
| Source type | IK / game animation implementation constraint |
| Used from source | IK can apply procedural foot targets; stable contact prevents sliding. |
| HLS transformation | FootTargetSolver emits foot lock state for stance feet before IK. First-pass stance correction should stay under 0.02..0.05 m per frame-equivalent correction unless the terrain changed sharply. |
| Confidence | high |
| Applies to | [Output Pose](../10-runtime/output-pose.md), [Runtime Constraints](../10-runtime/constraints.md), [Debug Visualization](../10-runtime/debug-visualization.md) |

### Swing foot arc

| Field | Value |
|---|---|
| Rule | Swing foot follows a lifted arc toward next target. |
| Source card | [Normal Gait Overview](../research/source-cards/normal-gait-overview.md), [IK Foot Placement](../research/source-cards/ik-foot-placement.md) |
| External link | https://www.physio-pedia.com/The_Gait_Cycle |
| Source type | gait overview plus procedural implementation |
| Used from source | Swing is the recovery phase; procedural IK needs clearance over terrain. |
| HLS transformation | Foot lift height and swing interpolation are solver parameters. First-pass flat-ground lift is 0.04..0.10 m; running and stairs may multiply it by 1.25..2.00. |
| Confidence | high for concept, medium for exact arc |
| Applies to | [Walking](../05-walking/index.md), [Running](../06-running/index.md), [Slope Modifier](../08-modifiers/slope.md), [Stairs Modifier](../08-modifiers/stairs.md) |

### Terrain target selection

| Field | Value |
|---|---|
| Rule | Slope and stairs modify foot target selection before IK. |
| Source card | [Stairs and Slopes](../research/source-cards/stairs-and-slopes.md), [Unreal Engine IK Rig](../research/source-cards/unreal-engine-ik-rig.md) |
| External link | https://dev.epicgames.com/documentation/en-us/unreal-engine/full-body-ik-in-unreal-engine |
| Source type | terrain locomotion plus engine docs |
| Used from source | Terrain-specific locomotion needs adjusted foot placement; IK applies targets. |
| HLS transformation | FootTargetSolver consumes terrain traces and outputs slope/stair-aware targets. Slope bonus starts at 0.002..0.006 m per uphill degree; stairs should snap to tread targets when reliable tread data exists. |
| Confidence | high |
| Applies to | [Slope Modifier](../08-modifiers/slope.md), [Stairs Modifier](../08-modifiers/stairs.md), [Unreal Engine](../11-unreal-engine/index.md) |

### Step parameters from modifiers

| Field | Value |
|---|---|
| Rule | Load and injury can alter step length, width, and confidence. |
| Source card | [Load Carriage Posture](../research/source-cards/load-carriage-posture.md), [Pathological Gait Asymmetry](../research/source-cards/pathological-gait-asymmetry.md) |
| External link | https://pubmed.ncbi.nlm.nih.gov/?term=pathological+gait+asymmetry+stance+time+step+length |
| Source type | load carriage / pathological gait topics |
| Used from source | Load and injury affect posture, symmetry, and gait parameters. |
| HLS transformation | ModifierResolver changes step length, step width, and side-specific confidence before foot target solving. First-pass heavy load or injury can reduce step length by 10..35 percent depending on severity. |
| Confidence | medium |
| Applies to | [Modifier Stacking](../10-runtime/modifier-stacking.md), [Backpack Load Modifier](../08-modifiers/backpack-load.md), [Injury and Limping Modifier](../08-modifiers/injury-limping.md), [Asymmetric Load Modifier](../08-modifiers/asymmetric-load.md) |

## Numeric Data Separation

| Value | Category | Usage |
|---|---|---|
| stance foot should remain stable | implementation rule | foot lock |
| swing foot needs clearance | source-backed relationship plus implementation rule | foot lift arc |
| `StepWidth = 0.08..0.22 m` | HLS tuning range | avoid foot crossing and unstable stance |
| `FlatFootLift = 0.04..0.10 m` | HLS tuning range | terrain clearance |
| `RunFootLiftMultiplier = 1.25..2.00` | HLS tuning range | running readability |
| `SlopeFootLiftBonus = 0.002..0.006 m/deg` | HLS tuning range | uphill clearance |
| `MaxTargetReach = 0.85..0.95 * LegLength` | implementation safety range | IK reach clamp |
| foot correction threshold | HLS tuning value | clamp stance correction |

## Open Questions

- How much stance correction is allowed before it looks like sliding.
- Whether foot roll should be solved here or in a separate foot-contact solver.
