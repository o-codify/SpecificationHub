---
id: walking
title: Walking
status: review
version: 26.530.1308
tags:
  - walking
  - gait
  - locomotion
  - provenance
  - numeric
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
  speed: number;        // meters per second
  gaitPhase: number;    // normalized 0..1 stride phase
  cadence: number;      // steps per minute
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
StepLength: meters, first-pass adult reference 0.60..0.80 at comfortable speed
StepWidth: meters, first-pass reference 0.08..0.18
Cadence: steps/minute, first-pass comfortable walking reference 100..120
StanceRatio: 0.58..0.62 ordinary walk tuning range
SwingRatio: 1 - StanceRatio
DoubleSupportRatio: 0.20..0.24 reference range
FootLiftHeight: meters, first-pass game tuning 0.04..0.10 on flat ground
PelvisVerticalAmplitude: meters, first-pass game tuning 0.02..0.05
PelvisYawAmplitude: degrees, first-pass game tuning 2..6
PelvisRollAmplitude: degrees, first-pass game tuning 1..4
TorsoLean: degrees, first-pass game tuning 0..5 on flat ground
ArmSwingAmplitude: degrees, first-pass game tuning 10..35
SpineStiffness: normalized 0..1

StepFrequencyHz = Cadence / 60
Speed = StepLength * StepFrequencyHz
CycleDuration = 2 / StepFrequencyHz
StanceDuration = CycleDuration * StanceRatio
SwingDuration = CycleDuration * SwingRatio
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
R12. Speed, cadence, and step length must satisfy Speed = StepLength * Cadence / 60.
```

## Foot Behavior

Heel strike places the foot forward and begins contact. Foot flat aligns the foot to the ground. Mid stance keeps the foot planted while the pelvis moves over it. Toe off raises the heel and prepares swing. Swing lifts the foot, moves it forward, and prepares the next contact.

Foot lift on flat ground should start low, usually 0.04..0.10 m for first-pass game tuning. Terrain, stairs, and caution modifiers may increase this value.

## Pelvis Behavior

The pelvis is the main visual carrier of weight. It should rise and fall subtly, yaw with stepping, and roll toward the stance side. Modifiers can bias pelvis pitch or roll.

First-pass HLS tuning should keep ordinary walking pelvis vertical amplitude subtle, about 0.02..0.05 m, with yaw around 2..6 degrees unless the character style intentionally exaggerates motion.

## Spine Behavior

The spine compensates pelvis motion and expresses state. Load increases forward or lateral lean. Injury increases stiffness. Slope changes pitch. Weapon carry can reduce upper-body freedom.

## Arm Behavior

Arms swing in opposition to legs. Arm swing increases with speed and decreases with weapon carry, two-hand carry, or heavy asymmetric load.

For ordinary unarmed walking, first-pass arm swing amplitude can start around 10..35 degrees and then be scaled by speed, load, and weapon restrictions.

## Rule Provenance

### Full-body walking coordination

Rule: walking is solved as feet, pelvis, spine, and arms together.

Source type: biomechanics overview plus game procedural animation constraint.

Used from source: human walking is coordinated across lower body, pelvis, trunk, and arms; procedural systems need separate targets and solvers.

HLS transformation: split walking into [Foot Target Solver](../09-solvers/foot-target-solver.md), [Pelvis Solver](../09-solvers/pelvis-solver.md), [Spine Solver](../09-solvers/spine-solver.md), [Arm Swing Solver](../09-solvers/arm-swing-solver.md), and [Pose Composer](../09-solvers/pose-composer.md).

Confidence: high.

Source cards: [Joint Kinematics Overview](../research/source-cards/joint-kinematics-overview.md), [Procedural Animation Overview](../research/source-cards/procedural-animation-overview.md), [IK Foot Placement](../research/source-cards/ik-foot-placement.md).

### Pelvis vertical and yaw motion

Rule: pelvis has vertical oscillation and slight yaw coupled to gait rhythm.

Source type: joint kinematics overview and normal gait references.

Used from source: pelvis participates in gait and is not static.

HLS transformation: [Pelvis Solver](../09-solvers/pelvis-solver.md) receives pelvis vertical, yaw, roll amplitudes as tunable parameters. First-pass HLS values are implementation ranges: vertical 0.02..0.05 m, yaw 2..6 degrees, roll 1..4 degrees.

Confidence: medium for exact amplitude, high for direction of effect.

Source cards: [Joint Kinematics Overview](../research/source-cards/joint-kinematics-overview.md), [Normal Gait Overview](../research/source-cards/normal-gait-overview.md).

### Arm-leg opposition

Rule: arms swing opposite to legs.

Source type: joint kinematics overview and normal gait observation.

Used from source: shoulder and arm motion counterbalances lower-body gait.

HLS transformation: [Arm Swing Solver](../09-solvers/arm-swing-solver.md) uses gait phase with opposite phase relation. First-pass unarmed walking amplitude is 10..35 degrees before modifiers.

Confidence: high for opposition, medium for exact amplitude.

Source cards: [Joint Kinematics Overview](../research/source-cards/joint-kinematics-overview.md), [Normal Gait Overview](../research/source-cards/normal-gait-overview.md).

### Foot target arc during swing

Rule: swinging foot follows a lifted arc toward the next target.

Source type: procedural animation technique and IK foot placement.

Used from source: procedural locomotion controls foot targets and uses lifting arcs to clear terrain.

HLS transformation: [Foot Target Solver](../09-solvers/foot-target-solver.md) owns foot lift height and swing interpolation. First-pass flat-ground lift is 0.04..0.10 m before terrain modifiers.

Confidence: high for visual/game implementation, medium for exact arc shape.

Source cards: [IK Foot Placement](../research/source-cards/ik-foot-placement.md), [Procedural Animation Overview](../research/source-cards/procedural-animation-overview.md).

## Source Notes

Source cards: [Normal Gait Overview](../research/source-cards/normal-gait-overview.md), [Joint Kinematics Overview](../research/source-cards/joint-kinematics-overview.md), [Procedural Animation Overview](../research/source-cards/procedural-animation-overview.md), [IK Foot Placement](../research/source-cards/ik-foot-placement.md), [CMU Motion Capture Database](../research/source-cards/cmu-mocap.md).

## Open Questions

- Whether base implementation should be fully procedural or animation-corrected.
- How much stylization is acceptable before walking becomes cartoony.
- How to preserve foot locking in multiplayer proxies.
