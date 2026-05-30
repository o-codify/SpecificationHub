---
id: stairs-modifier
title: Stairs Modifier
status: draft
version: 26.530.020
tags:
  - modifier
  - stairs
  - terrain
  - provenance
  - links
---

# Stairs Modifier

## Purpose

Defines procedural locomotion rules for stair ascent and descent.

Stairs are not treated as ordinary slopes. They require discrete foot targets and step-height-aware pelvis motion.

## Inputs

- detected stair step height
- detected stair step depth
- movement direction
- speed
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

- StepHeight
- StepDepth
- FootClearance
- PelvisStepHeightSmoothing
- StairCadenceMultiplier
- StairSpeedMultiplier
- StairTorsoPitch

## Runtime Rule

When stairs are detected, FootTargetSolver should switch from continuous ground projection to discrete tread selection. PelvisSolver should follow stair height with smoothing.

## Rule Provenance

### Stairs are not slopes

| Field | Value |
|---|---|
| Rule | Stairs use discrete tread targets instead of continuous slope projection. |
| Source card | [Stairs and Slopes](../research/source-cards/stairs-and-slopes.md) |
| External link | https://www.physio-pedia.com/Stair_Gait |
| Source type | gait overview / HLS implementation transformation |
| Used from source | Stair gait is a distinct locomotion context from level walking. |
| HLS transformation | FootTargetSolver switches to discrete tread selection when stairs are detected. |
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
| HLS transformation | Added `PelvisStepHeightSmoothing` and stair-specific pelvis height offsets. |
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
| HLS transformation | Stairs modifier outputs target constraints for FootTargetSolver; IK only applies final foot placement. |
| Confidence | high |
| Applies to | [Foot Target Solver](../09-solvers/foot-target-solver.md), [Unreal Engine](../11-unreal-engine/index.md), [Runtime Update Order](../10-runtime/update-order.md) |

## Numeric Data Separation

| Value | Category | Usage |
|---|---|---|
| stairs require distinct foot placement | source-backed relationship | stairs modifier and state resolver |
| `FootClearance` | HLS tuning value | step-height-dependent clearance |
| `PelvisStepHeightSmoothing` | HLS tuning value | visual smoothing over step height |
| `StairCadenceMultiplier` | HLS tuning value | cautious ascent/descent control |

## Open Questions

- Whether stairs need a separate gait phase mode.
- How to support partial foot placement on narrow treads.
- How to prevent foot target popping when entering or leaving stairs.
