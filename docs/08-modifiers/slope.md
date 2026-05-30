---
id: slope-modifier
title: Slope Modifier
status: draft
version: 26.530.1231
tags:
  - modifier
  - slope
  - terrain
  - provenance
  - links
  - numeric
---

# Slope Modifier

## Purpose

Defines how uphill and downhill terrain changes locomotion.

The goal is visual plausibility for games, not exact biomechanical simulation.

## Inputs

- slope angle, degrees
- movement direction
- ground normal
- speed, meters per second
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
- SlopeFootLiftBonus: 0.002 to 0.006 m per uphill degree.
- SteepSlopeSpeedMultiplier: 1.0 to 0.6.
- DownhillCaution: 0..1.
- SlopeActivationAngle: 3 to 5 degrees.
- ExtremeSlopeAngle: 25 to 35 degrees.

## Runtime Rule

Slope should modify posture and foot targets before IK. It should not be a separate animation state unless the slope is extreme.

```text
SlopeAbs = abs(SlopeDegrees)
Slope01 = saturate((SlopeAbs - SlopeActivationAngle) / (ExtremeSlopeAngle - SlopeActivationAngle))
Uphill01 = saturate(max(SlopeDegrees, 0) / ExtremeSlopeAngle)
Downhill01 = saturate(max(-SlopeDegrees, 0) / ExtremeSlopeAngle)

TorsoPitchOffset = Uphill01 * 12 + Downhill01 * -6
StepLengthMultiplier = lerp(1.0, 0.75, Uphill01) * lerp(1.0, 0.85, Downhill01)
CadenceMultiplier = lerp(1.0, 0.90, Slope01)
SpeedMultiplier = lerp(1.0, 0.60, Slope01)
FootLiftMultiplier = lerp(1.0, 1.50, Uphill01)
FootLiftBonus = max(0, SlopeDegrees) * 0.002..0.006 m
DownhillCaution = Downhill01
```

## Rule Provenance

### Uphill lean and foot lift

| Field | Value |
|---|---|
| Rule | Uphill movement increases forward torso lean and foot lift. |
| Source card | [Stairs and Slopes](../research/source-cards/stairs-and-slopes.md) |
| External link | https://www.ncbi.nlm.nih.gov/pmc/articles/PMC7454943/ |
| Source type | biomechanics overview / HLS simplification |
| Used from source | Incline locomotion changes body mechanics and effort. |
| HLS transformation | Converted incline effect into `UphillTorsoLean`, `UphillFootLiftMultiplier`, and step length reduction. First-pass uphill torso lean is 0..12 degrees and foot lift bonus is 0.002..0.006 m per uphill degree. |
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
| HLS transformation | Added `downhill caution`, cadence reduction, and reduced stride confidence. First-pass downhill torso compensation is 0..-6 degrees and downhill step length multiplier is 1.0..0.85. |
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
| HLS transformation | Slope modifies FootTargetSolver and PostureResolver before Control Rig or IK Rig applies bones. Slope activates around 3..5 degrees and extreme slope handling begins around 25..35 degrees. |
| Confidence | high |
| Applies to | [Foot Target Solver](../09-solvers/foot-target-solver.md), [Unreal Engine](../11-unreal-engine/index.md) |

## Numeric Data Separation

| Value | Category | Usage |
|---|---|---|
| uphill/downhill changes locomotion | source-backed relationship | enable slope modifier |
| `SlopeActivationAngle = 3..5 deg` | HLS tuning range | ignore tiny terrain noise |
| `ExtremeSlopeAngle = 25..35 deg` | HLS tuning range | state/safety transition |
| `UphillTorsoLean = 0..12 deg` | HLS tuning range | first-pass visual parameter |
| `DownhillTorsoLean = 0..-6 deg` | HLS tuning range | first-pass visual parameter |
| `UphillStepLengthMultiplier = 1.0..0.75` | HLS tuning range | uphill shortening |
| `DownhillStepLengthMultiplier = 1.0..0.85` | HLS tuning range | cautious downhill steps |
| `UphillFootLiftMultiplier = 1.0..1.5` | HLS tuning range | first-pass foot clearance parameter |
| `SlopeFootLiftBonus = 0.002..0.006 m/deg` | HLS tuning range | uphill clearance |
| `SteepSlopeSpeedMultiplier = 1.0..0.6` | HLS tuning range | steep slope slowdown |

## Open Questions

- Exact transition between level ground and slope rules.
- Whether downhill should bias heel-first or flat-foot placement.
- How to combine slope with stairs and uneven terrain.
