---
id: arm-swing-solver
title: Arm Swing Solver
status: draft
version: 26.530.000
tags:
  - solver
  - arms
  - walking
  - running
  - provenance
  - links
---

# Arm Swing Solver

## Purpose

Computes arm swing for walking, running, load, weapon carry, and injury states.

Arms are not decorative. They make gait rhythm readable and help show speed, load, and restriction.

## Inputs

- gait cycle output
- speed
- gait type
- load state
- carry state
- weapon state
- injury state
- fatigue

## Outputs

- left shoulder pitch and yaw intent
- right shoulder pitch and yaw intent
- elbow bend intent
- wrist stabilization intent
- arm swing amplitude
- arm freedom

## Rules

- Arms swing opposite to legs.
- Left arm moves forward with right leg advancement.
- Right arm moves forward with left leg advancement.
- Arm swing amplitude increases from walk to run.
- Heavy carried objects reduce arm freedom.
- Two-hand weapon carry can replace normal arm swing with weapon pose stabilization.
- Injury and fatigue reduce amplitude and add stiffness.

## Parameters

- ArmSwingAmplitude
- ArmSwingPhaseOffset
- ElbowBendAmount
- ShoulderCounterYaw
- ArmFreedom
- WeaponStabilization

## Runtime Rule

Arm swing should be driven by gait phase and then reduced or overridden by carry and weapon states.

## Rule Provenance

### Arm-leg opposition

| Field | Value |
|---|---|
| Rule | Arms swing opposite to legs. |
| Source card | [Joint Kinematics Overview](../research/source-cards/joint-kinematics-overview.md), [Normal Gait Overview](../research/source-cards/normal-gait-overview.md) |
| External link | https://www.physio-pedia.com/The_Gait_Cycle |
| Source type | gait kinematics overview |
| Used from source | Human walking coordinates trunk, shoulders, arms, and legs. |
| HLS transformation | ArmSwingSolver uses gait phase with opposite relation to leg advancement. |
| Confidence | high |
| Applies to | [Walking](../05-walking/index.md), [Running](../06-running/index.md), [Spine Solver](./spine-solver.md) |

### Running increases arm drive

| Field | Value |
|---|---|
| Rule | Arm swing amplitude increases from walk to run. |
| Source card | [Running Biomechanics](../research/source-cards/running-biomechanics.md) |
| External link | https://www.physio-pedia.com/Running_Biomechanics |
| Source type | running biomechanics overview |
| Used from source | Running has stronger whole-body dynamics than walking. |
| HLS transformation | Running profile increases `ArmSwingAmplitude` and elbow bend. |
| Confidence | medium |
| Applies to | [Running](../06-running/index.md), [Gait Phase Generator](./gait-phase-generator.md) |

### Carry and weapon override arm swing

| Field | Value |
|---|---|
| Rule | Carry and weapon states reduce or replace normal arm swing. |
| Source card | [Load Carriage Posture](../research/source-cards/load-carriage-posture.md), [Procedural Animation Overview](../research/source-cards/procedural-animation-overview.md) |
| External link | https://dev.epicgames.com/documentation/en-us/unreal-engine/control-rig-in-unreal-engine |
| Source type | load carriage topic plus animation implementation constraint |
| Used from source | Carrying or constrained upper-body states occupy arms and require pose priority. |
| HLS transformation | Added `ArmFreedom`, `WeaponStabilization`, and override priority in PoseComposer. |
| Confidence | high as implementation rule, medium as biomechanics rule |
| Applies to | [Front Load Modifier](../08-modifiers/front-load.md), [Asymmetric Load Modifier](../08-modifiers/asymmetric-load.md), [Weapon Carry Modifier](../08-modifiers/weapon-carry.md), [Pose Composer](./pose-composer.md) |

## Numeric Data Separation

| Value | Category | Usage |
|---|---|---|
| arm-leg opposition | source-backed relationship | gait phase arm logic |
| run arm swing greater than walk | source-backed relationship / HLS tuning | run profile |
| arm swing multipliers | HLS tuning values | load, injury, weapon states |

## Open Questions

- How much procedural arm swing should remain during rifle carry.
- Whether hand IK targets should be solved before or after arm swing.
