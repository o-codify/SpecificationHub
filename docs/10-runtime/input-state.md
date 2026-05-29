---
id: character-input-state
title: Character Input State
status: draft
version: 26.529.2239
tags:
  - runtime
  - input
  - state
  - provenance
---

# Character Input State

## Purpose

Defines the canonical input packet consumed by HLS runtime.

CharacterInputState is the boundary between gameplay and procedural locomotion. Gameplay fills this state. HLS solvers read it and produce pose intent.

## Core Fields

- world position
- actor rotation
- velocity
- acceleration
- desired movement direction
- desired speed
- current movement mode
- ground contact state
- ground normal
- slope angle
- stairs data
- load state
- injury state
- fatigue
- weapon state
- carry state
- network role

## Movement Fields

- currentSpeed
- desiredSpeed
- movementDirection
- facingDirection
- accelerationDirection
- turnRate
- brakingAmount

## Ground Fields

- isGrounded
- groundNormal
- groundDistance
- slopeAngle
- surfaceType
- hasValidFooting

## Terrain Fields

- isOnSlope
- isOnStairs
- stairStepHeight
- stairStepDepth
- nextStepSurface
- terrainConfidence

## State Fields

- locomotionIntent
- requestedGait
- wantsToSprint
- wantsToCrouch
- wantsToAim
- wantsToTurnInPlace

## Modifier Fields

- load state
- injury state
- fatigue value
- weapon state
- carry state
- stance state

## Network Fields

- networkRole
- lastCorrectionTime
- predictionMode
- remoteSmoothingAlpha

## Rules

- CharacterInputState should not contain final bone transforms.
- CharacterInputState should not contain animation graph state.
- Gameplay owns this state.
- HLS runtime reads this state and generates locomotion intent.
- Missing fields should degrade gracefully to default walking.

## Output Consumers

- LocomotionStateResolver
- GaitPhaseGenerator
- ModifierResolver
- FootTargetSolver
- PelvisSolver
- SpineSolver
- ArmSwingSolver
- PoseComposer

## Rule Provenance

### Runtime input separates gameplay from pose application

| Field | Value |
|---|---|
| Rule | Gameplay fills CharacterInputState; HLS solvers produce pose intent. |
| Source card | `docs/research/source-cards/procedural-animation-overview.md`, `docs/research/source-cards/unreal-engine-control-rig.md` |
| External link | https://dev.epicgames.com/documentation/en-us/unreal-engine/control-rig-in-unreal-engine |
| Source type | procedural animation / Unreal Engine implementation |
| Used from source | Runtime can compute controls and animation systems can apply them. |
| HLS transformation | Defined CharacterInputState as a gameplay-to-locomotion boundary object. |
| Confidence | high |
| Applies to | `Solver Interfaces`, `Output Pose`, `Unreal Engine` |

### Movement and trajectory fields

| Field | Value |
|---|---|
| Rule | Input state includes velocity, desired direction, desired speed, and facing direction. |
| Source card | `docs/research/source-cards/motion-matching.md`, `docs/research/source-cards/pose-warping.md` |
| External link | https://dev.epicgames.com/documentation/en-us/unreal-engine/motion-matching-in-unreal-engine |
| Source type | game animation technique / runtime trajectory concept |
| Used from source | Trajectory and desired movement are useful control signals for animation selection or adaptation. |
| HLS transformation | Added movement intent fields for procedural solvers without requiring motion matching. |
| Confidence | high |
| Applies to | `LocomotionStateResolver`, `GaitPhaseGenerator`, `PoseComposer` |

### Terrain and modifier fields

| Field | Value |
|---|---|
| Rule | Input state includes terrain, load, injury, weapon, carry, and fatigue state. |
| Source card | `docs/research/source-cards/stairs-and-slopes.md`, `docs/research/source-cards/load-carriage-posture.md`, `docs/research/source-cards/antalgic-gait.md` |
| External link | https://www.ncbi.nlm.nih.gov/books/NBK559243/ |
| Source type | terrain, load, and clinical gait references |
| Used from source | Terrain, load, and injury alter gait and posture. |
| HLS transformation | Added modifier fields so state can affect runtime parameters before solving. |
| Confidence | medium to high |
| Applies to | `ModifierStacking`, `ParameterSystem`, `FootTargetSolver`, `SpineSolver` |

### No final bones in input state

| Field | Value |
|---|---|
| Rule | CharacterInputState should not contain final bone transforms. |
| Source card | `docs/research/source-cards/procedural-animation-overview.md`, `docs/research/source-cards/unreal-engine-ik-rig.md` |
| External link | https://dev.epicgames.com/documentation/en-us/unreal-engine/ik-rig-in-unreal-engine |
| Source type | implementation constraint |
| Used from source | IK and rig systems apply targets; gameplay state should not directly own final skeleton output. |
| HLS transformation | Input contains state, while OutputPose contains pose intent. |
| Confidence | high |
| Applies to | `Output Pose`, `PoseComposer`, `Unreal Engine` |

## Numeric Data Separation

| Value | Category | Usage |
|---|---|---|
| field list | HLS architecture requirement | runtime implementation |
| terrain confidence | HLS tuning/debug concept | solver fallback logic |
| remote smoothing alpha | HLS networking tuning value | simulated proxy smoothing |

## Open Questions

- Exact serialization format for networked characters.
- Whether terrain confidence should be generated by movement code or HLS.
- Whether stance state belongs in input or state resolver output.
