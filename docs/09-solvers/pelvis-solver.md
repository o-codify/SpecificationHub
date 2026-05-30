---
id: pelvis-solver
title: Pelvis Solver
status: review
version: 26.530.1314
tags:
  - solver
  - pelvis
  - gait
  - provenance
  - links
  - numeric
---

# Pelvis Solver

## Purpose

Computes pelvis transform from gait phase, feet, speed, and modifiers.

The pelvis is the main visual carrier of weight in HLS.

## Inputs

- gait cycle output
- left foot target
- right foot target
- speed, meters per second
- ground normal
- locomotion modifiers

## Outputs

- pelvis transform
- pelvis velocity
- debug weight side

## Rules

- Pelvis has vertical oscillation.
- Pelvis yaw follows leg advancement.
- Pelvis roll shifts toward the stance side.
- Load and injury may bias pelvis pitch or roll.
- Pelvis motion must be smoothed.
- Pelvis must not cause foot sliding.
- Pelvis height and offsets must be clamped against leg reach.

## Parameters

- PelvisVerticalAmplitude: meters, first-pass walk 0.02..0.05, run multiplier 1.25..2.00
- PelvisYawAmplitude: degrees, first-pass walk 2..6
- PelvisRollAmplitude: degrees, first-pass walk 1..4
- PelvisPitchBias: degrees, first-pass modifier range -10..15
- PelvisHeightOffset: meters, first-pass clamp -0.10..0.10 character-scale dependent
- PelvisSmoothing: seconds, first-pass 0.08..0.20

## Runtime Rule

Use gait phase to create vertical motion, stance side to create subtle roll, leg advancement to create yaw, and modifiers to add persistent pitch or roll bias.

```text
PelvisVertical = sin(gaitPhase * 2π * 2) * PelvisVerticalAmplitude
PelvisYaw = sin(gaitPhase * 2π) * PelvisYawAmplitude
PelvisRoll = StanceSideSign * PelvisRollAmplitude
PelvisPitch = ModifierPitchBias
SmoothedPelvis = expSmooth(previousPelvis, targetPelvis, deltaTime, PelvisSmoothing)
MaxPelvisOffset = LegLength * 0.10..0.18
PelvisOffset = clampLength(PelvisOffset, MaxPelvisOffset)
```

## Rule Provenance

### Pelvis participates in gait rhythm

| Field | Value |
|---|---|
| Rule | Pelvis has vertical oscillation and gait-coupled yaw/roll. |
| Source card | [Joint Kinematics Overview](../research/source-cards/joint-kinematics-overview.md) |
| External link | https://www.physio-pedia.com/The_Gait_Cycle |
| Source type | gait kinematics overview |
| Used from source | Human gait coordinates pelvis and lower limbs rather than keeping pelvis static. |
| HLS transformation | Added `PelvisVerticalAmplitude`, `PelvisYawAmplitude`, and `PelvisRollAmplitude`. First-pass walk values are vertical 0.02..0.05 m, yaw 2..6 degrees, roll 1..4 degrees. |
| Confidence | high for relationship, medium for exact amplitudes |
| Applies to | [Walking](../05-walking/index.md), [Running](../06-running/index.md), [Pose Composer](./pose-composer.md) |

### Pelvis as weight carrier

| Field | Value |
|---|---|
| Rule | Pelvis is the main visual carrier of weight and support side. |
| Source card | [Normal Gait Overview](../research/source-cards/normal-gait-overview.md), [Joint Kinematics Overview](../research/source-cards/joint-kinematics-overview.md) |
| External link | https://teachmeanatomy.info/lower-limb/misc/gait-cycle/ |
| Source type | gait overview plus HLS animation inference |
| Used from source | Stance phase and support side define where body weight appears to be carried. |
| HLS transformation | PelvisSolver outputs debug weight side and stance-side roll. Roll sign follows support side and should remain subtle for Level 3 motion. |
| Confidence | medium |
| Applies to | [Foot Target Solver](./foot-target-solver.md), [Debug Visualization](../10-runtime/debug-visualization.md) |

### Modifier bias

| Field | Value |
|---|---|
| Rule | Load and injury can bias pelvis pitch or roll. |
| Source card | [Load Carriage Posture](../research/source-cards/load-carriage-posture.md), [Pathological Gait Asymmetry](../research/source-cards/pathological-gait-asymmetry.md) |
| External link | https://pubmed.ncbi.nlm.nih.gov/?term=pathological+gait+asymmetry+stance+time+step+length |
| Source type | load carriage and pathological gait topics |
| Used from source | Load and injury alter posture, symmetry, and support confidence. |
| HLS transformation | ModifierResolver adjusts pelvis pitch/roll bias before PelvisSolver output. First-pass modifier pitch/roll bias should stay within about -10..15 degrees before safety clamps. |
| Confidence | medium |
| Applies to | [Modifier Stacking](../10-runtime/modifier-stacking.md), [Injury and Limping Modifier](../08-modifiers/injury-limping.md), [Asymmetric Load Modifier](../08-modifiers/asymmetric-load.md), [Backpack Load Modifier](../08-modifiers/backpack-load.md) |

### IK reach constraint

| Field | Value |
|---|---|
| Rule | Pelvis motion must not overextend legs or cause foot sliding. |
| Source card | [IK Foot Placement](../research/source-cards/ik-foot-placement.md), [Unreal Engine IK Rig](../research/source-cards/unreal-engine-ik-rig.md) |
| External link | https://dev.epicgames.com/documentation/en-us/unreal-engine/full-body-ik-in-unreal-engine |
| Source type | implementation constraint / engine documentation |
| Used from source | IK systems solve toward targets and constraints; unreachable targets create artifacts. |
| HLS transformation | PelvisSolver must clamp height/offset and expose IK reach warnings. First-pass pelvis offset clamp is 0.10..0.18 of leg length, with smoothing 0.08..0.20 s to avoid pops. |
| Confidence | high |
| Applies to | [Runtime Constraints](../10-runtime/constraints.md), [Debug Visualization](../10-runtime/debug-visualization.md), [Unreal Engine](../11-unreal-engine/index.md) |

## Numeric Data Separation

| Value | Category | Usage |
|---|---|---|
| pelvis moves with gait | source-backed relationship | pelvis rhythm |
| `PelvisVerticalAmplitude = 0.02..0.05 m` | HLS tuning range | walking visual weight |
| `RunPelvisMultiplier = 1.25..2.00` | HLS tuning range | running rebound |
| `PelvisYawAmplitude = 2..6 deg` | HLS tuning range | walking rotation |
| `PelvisRollAmplitude = 1..4 deg` | HLS tuning range | stance-side weight |
| `PelvisSmoothing = 0.08..0.20 s` | HLS tuning range | prevent visual pops |
| `MaxPelvisOffset = 0.10..0.18 * LegLength` | implementation safety range | IK reach clamp |
| pelvis amplitude values | HLS tuning values | game visual tuning |
| IK reach clamp | implementation constraint | prevent overextension |

## Open Questions

- Should pelvis height be solved from foot contacts or phase first.
- How much pelvis motion should be preserved on simulated network proxies.
