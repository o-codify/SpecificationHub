---
id: runtime
title: Runtime
status: draft
version: 26.529.2146
tags:
  - runtime
  - architecture
---

# Runtime

## Purpose

Defines the runtime architecture for HLS procedural locomotion.

Runtime is responsible for motion intent. Animation systems are responsible for applying the pose to the skeleton.

## Runtime Pipeline

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

Collects all state needed by locomotion.

Includes:

- current velocity
- desired movement direction
- desired speed
- ground normal
- slope
- stairs information
- load state
- injury state
- fatigue
- weapon or carry state
- network role

## LocomotionStateResolver

Chooses the active locomotion state.

Examples:

- idle
- walk
- run
- start
- stop
- turn
- sidestep
- backward walk
- slope walk
- stairs ascent
- stairs descent
- injured walk
- loaded walk

## GaitPhaseGenerator

Produces normalized phase and cadence. All rhythmic solvers derive timing from this layer.

## ModifierResolver

Converts gameplay state into locomotion parameters.

Examples:

- backpack changes torso lean and step length
- injury changes stance time and speed
- slope changes foot lift and torso pitch
- weapon carry changes arm freedom

## Solvers

Solvers convert parameters into pose intent.

- FootTargetSolver computes foot targets.
- PelvisSolver computes pelvis transform.
- SpineSolver computes torso and head compensation.
- ArmSwingSolver computes arm rhythm or restrictions.
- PoseComposer combines solver outputs.

## Output

Runtime outputs pose intent:

- IK targets
- pelvis transform
- spine offsets
- arm pose intent
- contact states
- debug data

## Network Principle

Server should own gameplay state. Clients can solve visual pose locally from replicated state when possible.

Do not replicate every bone for ordinary locomotion.

## Debug Principle

Every solver should expose debug values:

- gait phase
- stance or swing state
- foot lock state
- foot target
- pelvis offset
- torso lean
- active modifiers
