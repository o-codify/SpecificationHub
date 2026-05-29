---
id: arm-swing-solver
title: Arm Swing Solver
status: draft
version: 26.529.2133
tags:
  - solver
  - arms
  - walking
  - running
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

## Open Questions

- How much procedural arm swing should remain during rifle carry.
- Whether hand IK targets should be solved before or after arm swing.
