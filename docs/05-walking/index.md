---
id: walking
title: Walking
status: draft
version: 26.529.2155
tags:
  - walking
  - gait
  - locomotion
  - provenance
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

## Rule Provenance

### Full-body walking coordination

Rule: walking is solved as feet, pelvis, spine, and arms together.

Source type: biomechanics overview plus game procedural animation constraint.

Used from source: human walking is coordinated across lower body, pelvis, trunk, and arms; procedural systems need separate targets and solvers.

HLS transformation: split walking into FootTargetSolver, PelvisSolver, SpineSolver, ArmSwingSolver, and PoseComposer.

Confidence: high.

Source cards: joint-kinematics-overview, procedural-animation-overview, ik-foot-placement.

### Pelvis vertical and yaw motion

Rule: pelvis has vertical oscillation and slight yaw coupled to gait rhythm.

Source type: joint kinematics overview and normal gait references.

Used from source: pelvis participates in gait and is not static.

HLS transformation: PelvisSolver receives pelvis vertical, yaw, roll amplitudes as tunable parameters.

Confidence: medium for exact amplitude, high for direction of effect.

Source cards: joint-kinematics-overview, normal-gait-overview.

### Arm-leg opposition

Rule: arms swing opposite to legs.

Source type: joint kinematics overview and normal gait observation.

Used from source: shoulder and arm motion counterbalances lower-body gait.

HLS transformation: ArmSwingSolver uses gait phase with opposite phase relation.

Confidence: high.

Source cards: joint-kinematics-overview, normal-gait-overview.

### Foot target arc during swing

Rule: swinging foot follows a lifted arc toward the next target.

Source type: procedural animation technique and IK foot placement.

Used from source: procedural locomotion controls foot targets and uses lifting arcs to clear terrain.

HLS transformation: FootTargetSolver owns foot lift height and swing interpolation.

Confidence: high for visual/game implementation, medium for exact arc shape.

Source cards: ik-foot-placement, procedural-animation-overview.

## Source Notes

Source cards: normal-gait-overview, gait-cycle-clinical, joint-kinematics-overview, procedural-animation-overview, ik-foot-placement.

## Open Questions

- Whether base implementation should be fully procedural or animation-corrected.
- How much stylization is acceptable before walking becomes cartoony.
- How to preserve foot locking in multiplayer proxies.
