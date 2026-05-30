---
id: spine-solver
title: Spine Solver
status: review
version: 26.530.1354
tags:
  - solver
  - spine
  - posture
  - provenance
  - links
  - numeric
---

# Spine Solver

## Purpose

Computes torso and spine pose from pelvis motion, posture, movement state, and modifiers.

The spine makes locomotion readable as a whole-body action.

## Inputs

- pelvis transform
- gait cycle output
- speed, meters per second
- acceleration, meters per second squared
- slope, degrees
- load state
- injury state
- carry or weapon state
- fatigue

## Outputs

- lumbar pitch, roll, yaw
- thoracic pitch, roll, yaw
- neck compensation
- head stabilization value
- spine stiffness

## Rules

- Spine compensates pelvis motion.
- Shoulders rotate opposite pelvis yaw during normal walking.
- Forward speed increases torso lean.
- Backpack load increases forward lean and stiffness.
- Front load creates braced torso or backward compensation.
- One-side load creates lateral torso tilt.
- Injury increases stiffness and reduces torso freedom.
- Weapon carry reduces upper-body swing.
- Torso rotation and lean must be clamped before pose composition.

## Parameters

- TorsoLean: degrees, walk 0..5, run 5..15, hard clamp 20
- SpineStiffness: normalized 0..1
- ShoulderCounterRotation: 0.5..1.0 of pelvis yaw in opposite direction
- HeadStabilization: normalized 0..1
- LoadPitchBias: degrees, first-pass -5..15 depending on carry mode
- LoadRollBias: degrees, first-pass -10..10 for asymmetric carry
- InjuryStiffnessBias: normalized 0..0.5 additive bias

## Runtime Rule

The spine should react after pelvis is solved. Pelvis creates base motion; spine compensates and expresses state.

```text
BaseTorsoLeanDeg = lerp(0, 5, WalkSpeed01) for walking
RunTorsoLeanDeg = lerp(5, 15, RunSpeed01)
SlopePitchBiasDeg = clamp(SlopeDegrees * 0.2..0.6, -10, 10)
ShoulderYawDeg = -PelvisYawDeg * ShoulderCounterRotation
SpineStiffness = clamp(BaseStiffness + LoadBias + InjuryStiffnessBias + WeaponBias, 0, 1)
TorsoPitchDeg = clamp(BaseLean + SlopePitchBias + LoadPitchBias, -10, 20)
TorsoRollDeg = clamp(LoadRollBias + InjuryRollBias, -10, 10)
```

## Rule Provenance

### Spine compensates pelvis motion

| Field | Value |
|---|---|
| Rule | Spine compensates pelvis motion and makes gait whole-body. |
| Source card | [Joint Kinematics Overview](../research/source-cards/joint-kinematics-overview.md) |
| External link | https://www.physio-pedia.com/The_Gait_Cycle |
| Source type | gait kinematics overview |
| Used from source | Human gait coordinates pelvis, trunk, shoulders, and limbs. |
| HLS transformation | SpineSolver consumes pelvis transform and outputs torso offsets. First-pass shoulder counter-rotation is 0.5..1.0 of pelvis yaw in the opposite direction. |
| Confidence | medium to high |
| Applies to | [Walking](../05-walking/index.md), [Running](../06-running/index.md), [Pose Composer](./pose-composer.md) |

### Load affects torso posture

| Field | Value |
|---|---|
| Rule | Load position changes torso pitch, roll, and stiffness. |
| Source card | [Load Carriage Posture](../research/source-cards/load-carriage-posture.md) |
| External link | https://pubmed.ncbi.nlm.nih.gov/?term=load+carriage+posture+gait+trunk+lean |
| Source type | load carriage research topic |
| Used from source | Load carriage affects posture and gait. |
| HLS transformation | Added `LoadPitchBias`, `LoadRollBias`, and `SpineStiffness`. First-pass pitch bias is -5..15 degrees and lateral roll bias is -10..10 degrees before clamps. |
| Confidence | medium |
| Applies to | [Backpack Load Modifier](../08-modifiers/backpack-load.md), [Front Load Modifier](../08-modifiers/front-load.md), [Asymmetric Load Modifier](../08-modifiers/asymmetric-load.md) |

### Injury and weapon reduce torso freedom

| Field | Value |
|---|---|
| Rule | Injury and weapon carry increase stiffness and reduce normal counter-rotation. |
| Source card | [Antalgic Gait](../research/source-cards/antalgic-gait.md), [Procedural Animation Overview](../research/source-cards/procedural-animation-overview.md) |
| External link | https://www.ncbi.nlm.nih.gov/books/NBK559243/ |
| Source type | clinical gait reference plus animation constraint |
| Used from source | Pain-related gait protects the painful side; weapon/carry states constrain upper body. |
| HLS transformation | Added `InjuryStiffnessBias`, `ShoulderCounterRotation`, and weapon/carry restrictions. Injury stiffness bias is 0..0.5 and weapon/carry can reduce shoulder counter-rotation toward 0.0..0.3. |
| Confidence | medium |
| Applies to | [Injury and Limping Modifier](../08-modifiers/injury-limping.md), [Weapon Carry Modifier](../08-modifiers/weapon-carry.md), [Arm Swing Solver](./arm-swing-solver.md) |

## Open Questions

- How much counter-rotation should be preserved with rifles or two-hand carry.
- Whether head stabilization should be part of spine solver or separate head solver.
