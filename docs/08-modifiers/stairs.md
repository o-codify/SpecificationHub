---
id: stairs-modifier
title: Stairs Modifier
status: review
version: 26.530.1340
tags:
  - modifier
  - stairs
  - terrain
  - provenance
  - links
  - numeric
---

# Stairs Modifier

## Purpose

Defines procedural locomotion rules for stair ascent and descent.

Stairs are not treated as ordinary slopes. They require discrete foot targets and step-height-aware pelvis motion.

## Inputs

- detected stair step height, meters
- detected stair step depth, meters
- movement direction
- speed, meters per second
- gait phase
- load state
- injury state

## Outputs

- left foot target on next stair surface
- right foot target on next stair surface
- pelvis height offset
- torso pitch offset
- cadence multiplier
- safety or caution value

## Stair Ascent Rules

- Foot targets snap to stair treads, not slope projection.
- Foot lift increases with step height.
- Pelvis height rises in discrete but smoothed increments.
- Torso leans forward.
- Step length is constrained by tread depth.
- Heavy load reduces speed and increases forward lean.

## Stair Descent Rules

- Foot placement becomes more cautious.
- Pelvis lowers in discrete but smoothed increments.
- Torso may lean slightly back or remain braced.
- Cadence decreases with steepness and injury.
- Foot target should prefer stable tread center.

## Parameters

- StepHeight: meters, first-pass expected range 0.10..0.25
- StepDepth: meters, first-pass expected range 0.22..0.35
- FootClearance: meters, `BaseFootLift + StepHeight * 0.25..0.50 + 0.03..0.08`
- PelvisStepHeightSmoothing: seconds, 0.10..0.25
- StairCadenceMultiplier: 1.0 to 0.70
- StairSpeedMultiplier: 1.0 to 0.60
- StairTorsoPitch: ascent 0..12 degrees, descent 0..-6 degrees
- TreadConfidence: normalized 0..1, stair mode reliable above 0.60..0.80

## Runtime Rule

When stairs are detected, FootTargetSolver should switch from continuous ground projection to discrete tread selection. PelvisSolver should follow stair height with smoothing.

```text
StairConfidence = clamp(TreadConfidence, 0, 1)
StairModeActive = StairConfidence >= 0.60..0.80
Ascent01 = saturate(max(StepHeight, 0) / 0.25)
FootClearance = BaseFootLift + StepHeight * 0.25..0.50 + 0.03..0.08
PelvisTargetZ += StepHeight * StepIndex
PelvisSmoothing = 0.10..0.25 s
StairCadenceMultiplier = lerp(1.0, 0.70, Ascent01)
StairSpeedMultiplier = lerp(1.0, 0.60, Ascent01)
TreadTarget = centerOfDetectedTread
```

## Rule Provenance

### Stairs are not slopes

| Field | Value |
|---|---|
| Rule | Stairs use discrete tread targets instead of continuous slope projection. |
| Source card | [Stairs and Slopes](../research/source-cards/stairs-and-slopes.md) |
| External link | https://www.physio-pedia.com/Stair_Gait |
| Source type | gait overview / HLS implementation transformation |
| Used from source | Stair gait is a distinct locomotion context from level walking. |
| HLS transformation | FootTargetSolver switches to discrete tread selection when stairs are detected. First-pass stair mode activates when tread confidence exceeds 0.60..0.80. |
| Confidence | high for distinction, medium for exact implementation |
| Applies to | [Foot Target Solver](../09-solvers/foot-target-solver.md), [Locomotion State Resolver](../10-runtime/locomotion-state-resolver.md) |

### Pelvis height follows stair height

| Field | Value |
|---|---|
| Rule | Pelvis height changes with stair height and must be smoothed. |
| Source card | [Stairs and Slopes](../research/source-cards/stairs-and-slopes.md) |
| External link | https://www.physio-pedia.com/Stair_Gait |
| Source type | gait overview plus procedural implementation constraint |
| Used from source | Stair ascent and descent involve vertical displacement between steps. |
| HLS transformation | Added `PelvisStepHeightSmoothing` and stair-specific pelvis height offsets. First-pass smoothing is 0.10..0.25 s and target height follows detected step height. |
| Confidence | medium |
| Applies to | [Pelvis Solver](../09-solvers/pelvis-solver.md), [Pose Composer](../09-solvers/pose-composer.md) |

### Stair foot placement before IK

| Field | Value |
|---|---|
| Rule | Foot target selection on stairs happens before IK application. |
| Source card | [IK Foot Placement](../research/source-cards/ik-foot-placement.md), [Unreal Engine IK Rig](../research/source-cards/unreal-engine-ik-rig.md) |
| External link | https://dev.epicgames.com/documentation/en-us/unreal-engine/ik-rig-in-unreal-engine |
| Source type | implementation constraint / engine documentation |
| Used from source | IK systems solve bones toward targets and constraints. |
| HLS transformation | Stairs modifier outputs target constraints for FootTargetSolver; IK only applies final foot placement. Foot clearance is based on base lift plus step-height-dependent bonus. |
| Confidence | high |
| Applies to | [Foot Target Solver](../09-solvers/foot-target-solver.md), [Unreal Engine](../11-unreal-engine/index.md), [Runtime Update Order](../10-runtime/update-order.md) |

## Numeric Data Separation

| Value | Category | Usage |
|---|---|---|
| stairs require distinct foot placement | source-backed relationship | stairs modifier and state resolver |
| `StepHeight = 0.10..0.25 m` | HLS expected input range | stair detector sanity check |
| `StepDepth = 0.22..0.35 m` | HLS expected input range | tread target selection |
| `FootClearance = Base + StepHeight * 0.25..0.50 + 0.03..0.08 m` | HLS tuning formula | step-height-dependent clearance |
| `PelvisStepHeightSmoothing = 0.10..0.25 s` | HLS tuning value | visual smoothing over step height |
| `StairCadenceMultiplier = 1.0..0.70` | HLS tuning value | cautious ascent/descent control |
| `StairSpeedMultiplier = 1.0..0.60` | HLS tuning value | stair slowdown |
| `TreadConfidence = 0.60..0.80` | implementation threshold | enter stair mode |

## Open Questions

- Whether stairs need a separate gait phase mode.
- How to support partial foot placement on narrow treads.
- How to prevent foot target popping when entering or leaving stairs.
