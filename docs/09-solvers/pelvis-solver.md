---
id: pelvis-solver
title: Pelvis Solver
status: draft
version: 26.529.2234
tags:
  - solver
  - pelvis
  - gait
  - provenance
---

# Pelvis Solver

## Purpose

Computes pelvis transform from gait phase, feet, speed, and modifiers.

The pelvis is the main visual carrier of weight in HLS.

## Inputs

- gait cycle output
- left foot target
- right foot target
- speed
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

## Parameters

- PelvisVerticalAmplitude
- PelvisYawAmplitude
- PelvisRollAmplitude
- PelvisPitchBias
- PelvisHeightOffset
- PelvisSmoothing

## Runtime Rule

Use gait phase to create vertical motion, stance side to create subtle roll, leg advancement to create yaw, and modifiers to add persistent pitch or roll bias.

## Rule Provenance

### Pelvis participates in gait rhythm

| Field | Value |
|---|---|
| Rule | Pelvis has vertical oscillation and gait-coupled yaw/roll. |
| Source card | `docs/research/source-cards/joint-kinematics-overview.md` |
| External link | https://www.physio-pedia.com/The_Gait_Cycle |
| Source type | gait kinematics overview |
| Used from source | Human gait coordinates pelvis and lower limbs rather than keeping pelvis static. |
| HLS transformation | Added `PelvisVerticalAmplitude`, `PelvisYawAmplitude`, and `PelvisRollAmplitude`. |
| Confidence | high for relationship, medium for exact amplitudes |
| Applies to | `Walking`, `Running`, `PoseComposer` |

### Pelvis as weight carrier

| Field | Value |
|---|---|
| Rule | Pelvis is the main visual carrier of weight and support side. |
| Source card | `docs/research/source-cards/normal-gait-overview.md`, `docs/research/source-cards/joint-kinematics-overview.md` |
| External link | https://teachmeanatomy.info/lower-limb/misc/gait-cycle/ |
| Source type | gait overview plus HLS animation inference |
| Used from source | Stance phase and support side define where body weight appears to be carried. |
| HLS transformation | PelvisSolver outputs debug weight side and stance-side roll. |
| Confidence | medium |
| Applies to | `FootTargetSolver`, `Debug Visualization` |

### Modifier bias

| Field | Value |
|---|---|
| Rule | Load and injury can bias pelvis pitch or roll. |
| Source card | `docs/research/source-cards/load-carriage-posture.md`, `docs/research/source-cards/pathological-gait-asymmetry.md` |
| External link | https://pubmed.ncbi.nlm.nih.gov/?term=pathological+gait+asymmetry+stance+time+step+length |
| Source type | load carriage and pathological gait topics |
| Used from source | Load and injury alter posture, symmetry, and support confidence. |
| HLS transformation | ModifierResolver adjusts pelvis pitch/roll bias before PelvisSolver output. |
| Confidence | medium |
| Applies to | `ModifierStacking`, `Injury`, `Asymmetric Load`, `Backpack` |

### IK reach constraint

| Field | Value |
|---|---|
| Rule | Pelvis motion must not overextend legs or cause foot sliding. |
| Source card | `docs/research/source-cards/ik-foot-placement.md`, `docs/research/source-cards/unreal-engine-ik-rig.md` |
| External link | https://dev.epicgames.com/documentation/en-us/unreal-engine/full-body-ik-in-unreal-engine |
| Source type | implementation constraint / engine documentation |
| Used from source | IK systems solve toward targets and constraints; unreachable targets create artifacts. |
| HLS transformation | PelvisSolver must clamp height/offset and expose IK reach warnings. |
| Confidence | high |
| Applies to | `Runtime Constraints`, `Debug Visualization`, `Unreal Engine IK` |

## Numeric Data Separation

| Value | Category | Usage |
|---|---|---|
| pelvis moves with gait | source-backed relationship | pelvis rhythm |
| pelvis amplitude values | HLS tuning values | game visual tuning |
| IK reach clamp | implementation constraint | prevent overextension |

## Open Questions

- Should pelvis height be solved from foot contacts or phase first.
- How much pelvis motion should be preserved on simulated network proxies.
