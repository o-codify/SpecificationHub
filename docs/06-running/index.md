---
id: running
title: Running
status: draft
version: 26.529.2132
tags:
  - running
  - gait
  - locomotion
---

# Running

## Purpose

Defines procedural running for HLS.

Running is not just faster walking. It has different support timing, stronger vertical motion, stronger arm drive, and more forward commitment.

## Visual Target

Level 3 Alive Game Motion.

The character should look like they are projecting the body forward, not simply playing a sped-up walk. Running should show flight, impact, rebound, torso lean, and arm drive.

## Inputs

- speed
- gaitPhase
- direction
- groundNormal
- slope
- load state
- injury state
- fatigue
- weapon or carry state

## Outputs

- left foot target
- right foot target
- pelvis transform
- spine pose
- arm pose
- support mode

## Rules

- Running has no double support.
- Running includes a flight phase.
- Stance is shorter than in walking.
- Swing is longer and more aggressive than walking.
- Pelvis vertical amplitude is higher than walking.
- Arm swing amplitude is higher than walking.
- Torso lean increases with speed.
- Heavy load reduces running quality and may force a jog.
- Injury should reduce running speed strongly and may prevent running at high severity.

## Suggested Parameters

- RunStanceRatio: 0.30 to 0.45.
- RunSwingAndFlightRatio: 0.55 to 0.70.
- PelvisVerticalAmplitude: higher than walking.
- FootLiftHeight: higher than walking.
- ArmSwingAmplitude: higher than walking.
- TorsoLean: higher than walking.

## Runtime Bands

The exact phase bands are implementation ranges, not strict biomechanics.

- 0.00 to 0.35: stance and loading.
- 0.35 to 0.50: push off.
- 0.50 to 0.75: flight and early swing.
- 0.75 to 1.00: terminal swing and next contact preparation.

## Modifier Behavior

Load reduces stride length, cadence ceiling, arm freedom, and vertical bounce.

Injury reduces stance confidence, speed, and symmetry.

Slope changes lean and foot clearance.

Fatigue reduces arm drive, rebound, and stride length.

## Open Questions

- Exact blend between walk, jog, and run.
- Whether flight should be represented explicitly in slow jog.
- How to keep networked foot contacts stable during fast movement.
