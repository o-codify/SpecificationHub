---
id: walking
title: Walking
status: draft
version: 26.529.2043
tags:
  - walking
  - gait
  - locomotion
---

# Walking

## Purpose

Defines procedural walking for HLS.

Walking is a full-body locomotion state. Feet, pelvis, torso, arms, head, load, injury, and terrain must agree visually.

## Visual Target

Level 3 Alive Game Motion.

The character should look alive, not mechanically translated. Steps should show weight transfer, foot contact, pelvis motion, torso compensation, and arm opposition.

## Inputs

```ts
type WalkingInput = {
  speed: number;
  gaitPhase: number;
  direction: Vector3;
  groundNormal: Vector3;
  load: LoadState;
  injury: InjuryState;
  slope: number;
  fatigue: number;
};
```

## Outputs

```ts
type WalkingOutput = {
  leftFootTarget: Transform;
  rightFootTarget: Transform;
  pelvisTransform: Transform;
  spinePose: SpinePose;
  armPose: ArmPose;
};
```

## Parameters

```text
StepLength
StepWidth
Cadence
StanceRatio
SwingRatio
FootLiftHeight
PelvisVerticalAmplitude
PelvisYawAmplitude
PelvisRollAmplitude
TorsoLean
ArmSwingAmplitude
SpineStiffness
```

## Base Rules

```text
R1. Walking uses normalized gait phase 0..1.
R2. Left and right legs are offset by 0.5 phase.
R3. Default stance ratio is about 0.60.
R4. Default swing ratio is about 0.40.
R5. Double support exists in walking.
R6. A planted foot remains stable during stance.
R7. A swinging foot follows a lifted arc toward the next target.
R8. Pelvis vertical motion follows step rhythm.
R9. Pelvis yaw follows leg advancement.
R10. Shoulders rotate opposite to pelvis yaw.
R11. Arms swing opposite to legs.
```

## Foot Behavior

Heel strike places the foot forward and begins contact. Foot flat aligns the foot to the ground. Mid stance keeps the foot planted while the pelvis moves over it. Toe off raises the heel and prepares swing. Swing lifts the foot, moves it forward, and prepares the next contact.

## Pelvis Behavior

The pelvis is the main visual carrier of weight. It should rise and fall subtly, yaw with stepping, and roll toward the stance side. Modifiers can bias pelvis pitch or roll.

## Spine Behavior

The spine compensates pelvis motion and expresses state. Load increases forward or lateral lean. Injury increases stiffness. Slope changes pitch. Weapon carry can reduce upper-body freedom.

## Arm Behavior

Arms swing in opposition to legs. Arm swing increases with speed and decreases with weapon carry, two-hand carry, or heavy asymmetric load.

## Pseudocode

```ts
function solveWalkingPose(input: WalkingInput): WalkingOutput {
  const cycle = solveGaitCycle({ gaitPhase: input.gaitPhase, speed: input.speed, gaitType: "walk" });
  const params = resolveWalkingParameters(input);
  const leftFoot = solveFootTarget(cycle.left, params, input);
  const rightFoot = solveFootTarget(cycle.right, params, input);
  const pelvis = solvePelvis({ cycle, leftFoot, rightFoot, params, input });
  const spine = solveSpine({ pelvis, params, load: input.load, slope: input.slope, fatigue: input.fatigue });
  const arms = solveArmSwing({ cycle, params, load: input.load });
  return { leftFootTarget: leftFoot, rightFootTarget: rightFoot, pelvisTransform: pelvis, spinePose: spine, armPose: arms };
}
```

## Source Notes

Source cards: normal-gait-overview, gait-cycle-clinical, joint-kinematics-overview, procedural-animation-overview.

## Open Questions

- Whether base implementation should be fully procedural or animation-corrected.
- How much stylization is acceptable before walking becomes cartoony.
- How to preserve foot locking in multiplayer proxies.
