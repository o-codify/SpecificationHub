---
id: runtime-update-order
title: Runtime Update Order
status: draft
version: 26.529.2045
tags:
  - runtime
  - architecture
  - update-order
---

# Runtime Update Order

## Purpose

Defines the order in which HLS runtime systems update.

## Architecture

```text
CharacterInputState
  -> LocomotionStateResolver
  -> GaitPhaseGenerator
  -> ModifierResolver
  -> FootTargetSolver
  -> PelvisSolver
  -> SpineSolver
  -> ArmSwingSolver
  -> PoseComposer
  -> IK/FK Output
```

## CharacterInputState

Collects velocity, desired direction, ground normal, slope, movement mode, load state, injury state, weapon state, and network role.

## LocomotionStateResolver

Chooses idle, walk, run, start, stop, turn, fall, stairs, slope, injured locomotion, or loaded locomotion.

## GaitPhaseGenerator

Produces stable rhythmic phase.

## ModifierResolver

Applies load, injury, fatigue, slope, stairs, and weapon carry to parameters. Modifiers should not directly write bones.

## FootTargetSolver

Computes procedural foot targets.

## PelvisSolver

Computes pelvis transform from phase and foot contacts.

## SpineSolver

Computes torso compensation.

## ArmSwingSolver

Computes arm swing and carry restrictions.

## PoseComposer

Combines all solver outputs into final pose intent.

## IK/FK Output

Applies pose intent to skeleton using Control Rig, AnimBP, IK, or FK.

## Rule

Runtime owns intent. Animation system applies bones.
