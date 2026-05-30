---
id: posture
title: Posture
status: draft
version: 26.530.1058
tags:
  - posture
  - load
  - spine
  - pelvis
---

# Posture

## Purpose

Defines how whole-body posture changes locomotion in HLS.

Posture makes the character show state: load, weapon carry, injury, fatigue, slope, acceleration, stopping, and turning.

## Visual Target

Level 3 Alive Game Motion.

The player should understand body state from silhouette and motion before reading UI.

Examples:

- backpack: forward torso lean
- front load: braced torso or slight backward compensation
- one-hand load: lateral torso tilt
- weapon carry: reduced arm swing and more rigid upper body
- injury: protective stiffness and asymmetry
- uphill: more forward lean
- downhill: cautious backward compensation

## Inputs

```ts
type PostureInput = {
  speed: number;
  acceleration: Vector3;
  slope: number;
  load: LoadState;
  injury: InjuryState;
  carry: CarryState;
  fatigue: number;
};
```

## Outputs

```ts
type PostureOutput = {
  pelvisPitchBias: number;
  pelvisRollBias: number;
  torsoPitch: number;
  torsoRoll: number;
  spineStiffness: number;
  armFreedom: number;
  headStabilization: number;
};
```

## Rules

- Posture modifies solver parameters, not final bones directly.
- Posture changes must be visible in silhouette.
- Load position determines lean direction.
- Heavy load reduces upper-body freedom.
- Injury increases stiffness and asymmetry.
- Slope changes torso pitch and foot clearance.
- Acceleration creates temporary lean toward movement.
- Deceleration creates temporary backward compensation.

## Parameter Families

```text
TorsoPitch
TorsoRoll
PelvisPitch
PelvisRoll
SpineStiffness
ArmSwingMultiplier
StepLengthMultiplier
CadenceMultiplier
HeadStabilization
```

## Runtime Composition

Posture is resolved before foot, pelvis, spine, and arm solvers consume parameters.

```text
CharacterInputState
  -> LocomotionStateResolver
  -> GaitPhaseGenerator
  -> ModifierResolver
  -> PostureResolver
  -> FootTargetSolver
  -> PelvisSolver
  -> SpineSolver
  -> ArmSwingSolver
  -> PoseComposer
```

## Open Questions

- How to blend multiple posture causes without over-leaning.
- Whether fatigue should be posture-only or also cadence-based.
- How much head stabilization is needed for Level 3.
