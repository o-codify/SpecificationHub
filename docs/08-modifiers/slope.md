---
id: slope-modifier
title: Slope Modifier
status: draft
version: 26.530.003
tags:
  - modifier
  - slope
  - terrain
  - provenance
  - links
---

# Slope Modifier

## Purpose

Defines how uphill and downhill terrain changes locomotion.

The goal is visual plausibility for games, not exact biomechanical simulation.

## Inputs

- slope angle
- movement direction
- ground normal
- speed
- gait type
- load state
- fatigue

## Outputs

- torso pitch offset
- pelvis pitch offset
- step length multiplier
- foot lift multiplier
- cadence multiplier
- downhill caution value

## Uphill Rules

- Increase forward torso lean.
- Reduce step length.
- Increase foot lift.
- Increase knee and hip flexion visually through foot target height.
- Reduce top speed.
- Heavy load exaggerates forward lean.

## Downhill Rules

- Add slight backward torso compensation.
- Reduce cadence or make steps more cautious.
- Reduce stride confidence at steep angles.
- Increase foot placement precision.
- Reduce speed when slope is steep.

## Suggested Parameters

- UphillTorsoLean: 0 to 12 degrees.
- DownhillTorsoLean: 0 to -6 degrees.
- UphillStepLengthMultiplier: 1.0 to 0.75.
- DownhillStepLengthMultiplier: 1.0 to 0.85.
- UphillFootLiftMultiplier: 1.0 to 1.5.
- SteepSlopeSpeedMultiplier: 1.0 to 0.6.

## Runtime Rule

Slope should modify posture and foot targets before IK. It should not be a separate animation state unless the slope is extreme.

## Rule Provenance

### Uphill lean and foot lift

| Field | Value |
|---|---|
| Rule | Uphill movement increases forward torso lean and foot lift. |
| Source card | [Stairs and Slopes](../research/source-cards/stairs-and-slopes.md) |
| External link | https://www.ncbi.nlm.nih.gov/pmc/articles/PMC7454943/ |
| Source type | biomechanics overview / HLS simplification |
| Used from source | Incline locomotion changes body mechanics and effort. |
| HLS transformation | Converted incline effect into `UphillTorsoLean`, `UphillFootLiftMultiplier`, and step length reduction. |
| Confidence | medium |
| Applies to | [Foot Target Solver](../09-solvers/foot-target-solver.md), [Spine Solver](../09-solvers/spine-solver.md), [Pelvis Solver](../09-solvers/pelvis-solver.md) |

### Downhill caution

| Field | Value |
|---|---|
| Rule | Downhill movement uses cautious placement and reduced confidence. |
| Source card | [Stairs and Slopes](../research/source-cards/stairs-and-slopes.md) |
| External link | https://www.ncbi.nlm.nih.gov/pmc/articles/PMC7454943/ |
| Source type | biomechanics overview plus gameplay readability inference |
| Used from source | Downhill locomotion differs from level and uphill locomotion. |
| HLS transformation | Added `downhill caution`, cadence reduction, and reduced stride confidence. |
| Confidence | medium |
| Applies to | [Foot Target Solver](../09-solvers/foot-target-solver.md), [Modifier Stacking](../10-runtime/modifier-stacking.md) |

### Slope before IK

| Field | Value |
|---|---|
| Rule | Slope modifies posture and foot targets before IK application. |
| Source card | [IK Foot Placement](../research/source-cards/ik-foot-placement.md), [Unreal Engine IK Rig](../research/source-cards/unreal-engine-ik-rig.md) |
| External link | https://dev.epicgames.com/documentation/en-us/unreal-engine/ik-rig-in-unreal-engine |
| Source type | implementation constraint / engine documentation |
| Used from source | IK systems apply targets; they should not own high-level terrain logic. |
| HLS transformation | Slope modifies FootTargetSolver and PostureResolver before Control Rig or IK Rig applies bones. |
| Confidence | high |
| Applies to | [Foot Target Solver](../09-solvers/foot-target-solver.md), [Unreal Engine](../11-unreal-engine/index.md) |

## Numeric Data Separation

| Value | Category | Usage |
|---|---|---|
| uphill/downhill changes locomotion | source-backed relationship | enable slope modifier |
| `UphillTorsoLean = 0..12 deg` | HLS tuning range | first-pass visual parameter |
| `DownhillTorsoLean = 0..-6 deg` | HLS tuning range | first-pass visual parameter |
| `UphillFootLiftMultiplier = 1.0..1.5` | HLS tuning range | first-pass foot clearance parameter |

## Open Questions

- Exact transition between level ground and slope rules.
- Whether downhill should bias heel-first or flat-foot placement.
- How to combine slope with stairs and uneven terrain.
