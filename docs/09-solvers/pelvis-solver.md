---
id: pelvis-solver
title: Pelvis Solver
status: review
version: 26.530.1623
tags:
  - solver
  - pelvis
  - walking
  - running
  - provenance
  - links
  - numeric
---

# Pelvis Solver

## Purpose

Computes pelvis position and rotation intent from gait phase, foot contacts, terrain, speed, and modifiers.

The pelvis solver connects lower-body support to whole-body posture.

## Inputs

- gait phase output
- foot target output
- stance side
- contact state
- speed
- slope and stair data
- load, injury, weapon, and turning modifiers
- previous pelvis state

## Outputs

- pelvis position offset
- pelvis rotation offset
- vertical rhythm value
- yaw rhythm value
- roll / weight shift value
- pitch bias
- smoothing value
- reach and clamp warnings

## Runtime Formula

```text
PelvisVertical = sin(gaitPhase * 2π * 2) * PelvisVerticalAmplitude
PelvisYaw = sin(gaitPhase * 2π) * PelvisYawAmplitude
PelvisRoll = StanceSideSign * PelvisRollAmplitude
PelvisPitch = ModifierPitchBias
SmoothedPelvis = expSmooth(previousPelvis, targetPelvis, deltaTime, PelvisSmoothing)
MaxPelvisOffset = LegLength * 0.10..0.18
PelvisOffset = clampLength(PelvisOffset, MaxPelvisOffset)
```

## Reference Parameters

| Parameter | First-pass range | Usage |
|---|---:|---|
| PelvisVerticalAmplitude | 0.02..0.05 m | walking vertical rhythm |
| RunVerticalMultiplier | 1.25..2.00 | running amplification |
| PelvisYawAmplitude | 2..6 deg | gait rhythm |
| PelvisRollAmplitude | 1..4 deg | weight transfer |
| PelvisPitchBias | -10..15 deg | slope/load/posture |
| PelvisHeightOffset | -0.10..0.10 m | crouch/load/terrain adjustment |
| PelvisSmoothing | 0.08..0.20 s | continuity |
| MaxPelvisOffset | 0.10..0.18 * LegLength | safety clamp |

## Rules

- Pelvis follows foot support and should not break locked stance feet.
- Pelvis provides vertical rhythm, yaw rhythm, and roll/weight transfer.
- Running can amplify pelvis motion relative to walking.
- Load, slope, injury, and stairs may add pitch, height, and smoothing bias.
- Pelvis output must be clamped before OutputPose.
- Pelvis debug should expose target, smoothed value, clamp state, and reach warnings.

## Rule Provenance

### Pelvis rhythm and support

| Field | Value |
|---|---|
| Rule | Pelvis motion is coordinated with gait and foot support. |
| Source card | [Joint Kinematics Overview](../research/source-cards/joint-kinematics-overview.md), [Normal Gait Overview](../research/source-cards/normal-gait-overview.md) |
| External link | https://www.physio-pedia.com/The_Gait_Cycle |
| Source type | gait kinematics overview |
| Used from source | Human gait coordinates pelvis, trunk, shoulders, and limbs with support timing. |
| HLS transformation | PelvisSolver consumes phase and contact state to produce vertical, yaw, and roll offsets. |
| Confidence | medium-high |
| Applies to | [Walking](../05-walking/index.md), [Gait Phase Generator](./gait-phase-generator.md), [Spine Solver](./spine-solver.md) |

### Running amplifies pelvis motion

| Field | Value |
|---|---|
| Rule | Running has stronger whole-body dynamics than walking. |
| Source card | [Running Biomechanics](../research/source-cards/running-biomechanics.md) |
| External link | https://www.physio-pedia.com/Running_Biomechanics |
| Source type | running biomechanics overview |
| Used from source | Running increases motion intensity relative to walking. |
| HLS transformation | RunVerticalMultiplier uses 1.25..2.00 over walking pelvis vertical amplitude. |
| Confidence | medium |
| Applies to | [Running](../06-running/index.md), [Pose Composer](./pose-composer.md) |

### Pelvis supports IK reach

| Field | Value |
|---|---|
| Rule | Pelvis adjustment helps maintain reachable foot targets. |
| Source card | [IK Foot Placement](../research/source-cards/ik-foot-placement.md), [Unreal Engine IK Rig](../research/source-cards/unreal-engine-ik-rig.md) |
| External link | https://dev.epicgames.com/documentation/en-us/unreal-engine/ik-rig-in-unreal-engine |
| Source type | IK implementation constraint |
| Used from source | IK foot placement depends on reachable targets and body support adjustment. |
| HLS transformation | PelvisOffset clamps to 0.10..0.18 * LegLength and emits reach warnings when support cannot be satisfied. |
| Confidence | high as implementation rule |
| Applies to | [Foot Target Solver](./foot-target-solver.md), [Runtime Constraints](../10-runtime/constraints.md), [Output Pose](../10-runtime/output-pose.md) |

### Load, terrain, and injury bias pelvis posture

| Field | Value |
|---|---|
| Rule | Load, terrain, stairs, and injury can bias pelvis height, pitch, or roll. |
| Source card | [Load Carriage Posture](../research/source-cards/load-carriage-posture.md), [Stairs and Slopes](../research/source-cards/stairs-and-slopes.md), [Antalgic Gait](../research/source-cards/antalgic-gait.md) |
| External link | https://www.ncbi.nlm.nih.gov/books/NBK559243/ |
| Source type | load, terrain, and clinical gait references |
| Used from source | Load, terrain, and pain alter posture and gait support. |
| HLS transformation | ModifierPitchBias, PelvisHeightOffset, and PelvisSmoothing allow state-specific compensation while staying clamped. |
| Confidence | medium |
| Applies to | [Modifier Stacking](../10-runtime/modifier-stacking.md), [Runtime Constraints](../10-runtime/constraints.md) |

## Numeric Data Separation

| Value | Category | Usage |
|---|---|---|
| pelvis coordination with gait | source-backed relationship | pelvis rhythm |
| pelvis supports foot IK | implementation constraint | reach safety |
| `PelvisVerticalAmplitude = 0.02..0.05 m` | HLS tuning range | walking rhythm |
| `RunVerticalMultiplier = 1.25..2.00` | HLS tuning range | running rhythm |
| `PelvisYawAmplitude = 2..6 deg` | HLS tuning range | gait rhythm |
| `PelvisRollAmplitude = 1..4 deg` | HLS tuning range | weight transfer |
| `PelvisSmoothing = 0.08..0.20 s` | HLS tuning range | continuity |
| `MaxPelvisOffset = 0.10..0.18 * LegLength` | HLS safety clamp | IK reach |

## Open Questions

- Whether steep stair traversal needs a distinct pelvis solver profile.
- How much pelvis smoothing remote proxies can use before contact looks delayed.
