---
id: joints
title: Joints
status: draft
version: 26.529.2147
tags:
  - joints
  - kinematics
  - rules
---

# Joints

## Purpose

Defines game-oriented joint behavior rules for HLS.

HLS does not require exact clinical joint angles in the first pass. It requires consistent visual rules that produce believable Level 3 locomotion.

## Pelvis

Rules:

- moves vertically with gait rhythm
- yaws slightly with leg advancement
- rolls toward stance side
- receives pitch or roll bias from load, slope, and injury

Runtime use:

- PelvisSolver
- SpineSolver
- PoseComposer

## Spine

Rules:

- compensates pelvis movement
- creates posture readability
- becomes stiffer under load, injury, weapon carry, and fatigue
- leans with speed, slope, and acceleration

Runtime use:

- SpineSolver
- PostureResolver

## Head and Neck

Rules:

- head should be more stable than pelvis
- head can lead turns slightly
- head should not inherit all torso noise

Runtime use:

- SpineSolver or future HeadSolver

## Hip

Rules:

- hip follows step direction and pelvis rotation
- hip range should support forward swing and stance extension
- uphill and stairs require more apparent hip flexion

Runtime use:

- FootTargetSolver
- IK output

## Knee

Rules:

- knee flexes during swing for foot clearance
- knee extends during stance but should not lock unnaturally
- injury can reduce confidence and apparent loading

Runtime use:

- IK output
- injury modifier

## Ankle and Foot

Rules:

- foot transitions through contact, flat support, and push-off
- foot aligns to terrain normal within limits
- stance foot should remain locked enough to avoid sliding
- toe-off is important for visual rhythm

Runtime use:

- FootTargetSolver
- IK output

## Shoulders

Rules:

- shoulders counter-rotate against pelvis in normal gait
- shoulder freedom is reduced by weapon carry and heavy load
- running increases shoulder and arm drive

Runtime use:

- SpineSolver
- ArmSwingSolver

## Elbows and Wrists

Rules:

- elbows bend naturally during arm swing
- wrists remain stable unless carrying or aiming
- hand IK can override normal swing

Runtime use:

- ArmSwingSolver
- weapon carry modifier

## Open Questions

- Exact joint angle ranges for the first tuning profile.
- Whether foot roll needs its own solver.
- Whether head stabilization should be a required Level 3 feature.
