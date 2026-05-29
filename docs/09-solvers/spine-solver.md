---
id: spine-solver
title: Spine Solver
status: draft
version: 26.529.2133
tags:
  - solver
  - spine
  - posture
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

## Open Questions

- How much counter-rotation should be preserved with rifles or two-hand carry.
- Whether head stabilization should be part of spine solver or separate head solver.
