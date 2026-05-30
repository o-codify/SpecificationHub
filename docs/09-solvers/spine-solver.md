---
id: spine-solver
title: Spine Solver
status: draft
version: 26.530.1058
tags:
  - solver
  - spine
  - posture
  - provenance
  - links
---

# Spine Solver

## Purpose

Computes torso and spine pose from pelvis motion, posture, movement state, and modifiers.

The spine makes locomotion readable as a whole-body action.

## Inputs

- pelvis transform
- gait cycle output
- speed
- acceleration
- slope
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

## Parameters

- TorsoLean
- SpineStiffness
- ShoulderCounterRotation
- HeadStabilization
- LoadPitchBias
- LoadRollBias
- InjuryStiffnessBias

## Runtime Rule

The spine should react after pelvis is solved. Pelvis creates base motion; spine compensates and expresses state.

## Rule Provenance

### Spine compensates pelvis motion

| Field | Value |
|---|---|
| Rule | Spine compensates pelvis motion and makes gait whole-body. |
| Source card | [Joint Kinematics Overview](../research/source-cards/joint-kinematics-overview.md) |
| External link | https://www.physio-pedia.com/The_Gait_Cycle |
| Source type | gait kinematics overview |
| Used from source | Human gait coordinates pelvis, trunk, shoulders, and limbs. |
| HLS transformation | SpineSolver consumes pelvis transform and outputs torso offsets. |
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
| HLS transformation | Added `LoadPitchBias`, `LoadRollBias`, and `SpineStiffness`. |
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
| HLS transformation | Added `InjuryStiffnessBias`, `ShoulderCounterRotation`, and weapon/carry restrictions. |
| Confidence | medium |
| Applies to | [Injury and Limping Modifier](../08-modifiers/injury-limping.md), [Weapon Carry Modifier](../08-modifiers/weapon-carry.md), [Arm Swing Solver](./arm-swing-solver.md) |

## Open Questions

- How much counter-rotation should be preserved with rifles or two-hand carry.
- Whether head stabilization should be part of spine solver or separate head solver.
