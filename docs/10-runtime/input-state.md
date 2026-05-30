---
id: character-input-state
title: Character Input State
status: review
version: 26.530.1456
tags:
  - runtime
  - input
  - state
  - provenance
  - links
  - numeric
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
- treadConfidence

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
- compactReplicationState if applicable

## Rules

- CharacterInputState should not contain final bone transforms.
- CharacterInputState should not contain animation graph state.
- Gameplay owns this state.
- HLS runtime reads this state and generates locomotion intent.
- Missing fields should degrade gracefully to default walking.
- Server-owned gameplay fields should be compact enough for replication.
- Client-only smoothing fields must not become authoritative gameplay state.

## Runtime Contract

```text
GameplayState -> CharacterInputState -> LocomotionStateResolver -> ParameterSystem / ModifierResolver -> Solvers
```

```text
CharacterInputState contains gameplay and environment facts.
CharacterInputState does not contain OutputPose or final skeletal transforms.
```

## Output Consumers

- [Locomotion State Resolver](./locomotion-state-resolver.md)
- [Gait Phase Generator](../09-solvers/gait-phase-generator.md)
- ModifierResolver
- [Foot Target Solver](../09-solvers/foot-target-solver.md)
- [Pelvis Solver](../09-solvers/pelvis-solver.md)
- [Spine Solver](../09-solvers/spine-solver.md)
- [Arm Swing Solver](../09-solvers/arm-swing-solver.md)
- [Pose Composer](../09-solvers/pose-composer.md)

## Rule Provenance

### Runtime input separates gameplay from pose application

| Field | Value |
|---|---|
| Rule | Gameplay fills CharacterInputState; HLS solvers produce pose intent. |
| Source card | [Procedural Animation Overview](../research/source-cards/procedural-animation-overview.md), [Unreal Engine Control Rig](../research/source-cards/unreal-engine-control-rig.md) |
| External link | https://dev.epicgames.com/documentation/en-us/unreal-engine/control-rig-in-unreal-engine |
| Source type | procedural animation / Unreal Engine implementation |
| Used from source | Runtime can compute controls and animation systems can apply them. |
| HLS transformation | Defined CharacterInputState as a gameplay-to-locomotion boundary object. |
| Confidence | high |
| Applies to | [Solver Interfaces](./solver-interfaces.md), [Output Pose](./output-pose.md), [Unreal Engine](../11-unreal-engine/index.md) |

### Movement and trajectory fields

| Field | Value |
|---|---|
| Rule | Input state includes velocity, desired direction, desired speed, and facing direction. |
| Source card | [Motion Matching](../research/source-cards/motion-matching.md), [Pose Warping](../research/source-cards/pose-warping.md) |
| External link | https://dev.epicgames.com/documentation/en-us/unreal-engine/motion-matching-in-unreal-engine |
| Source type | game animation technique / runtime trajectory concept |
| Used from source | Trajectory and desired movement are useful control signals for animation selection or adaptation. |
| HLS transformation | Added movement intent fields for procedural solvers without requiring motion matching. |
| Confidence | high |
| Applies to | [Locomotion State Resolver](./locomotion-state-resolver.md), [Gait Phase Generator](../09-solvers/gait-phase-generator.md), [Pose Composer](../09-solvers/pose-composer.md) |

### Terrain and modifier fields

| Field | Value |
|---|---|
| Rule | Input state includes terrain, load, injury, weapon, carry, and fatigue state. |
| Source card | [Stairs and Slopes](../research/source-cards/stairs-and-slopes.md), [Load Carriage Posture](../research/source-cards/load-carriage-posture.md), [Antalgic Gait](../research/source-cards/antalgic-gait.md) |
| External link | https://www.ncbi.nlm.nih.gov/books/NBK559243/ |
| Source type | terrain, load, and clinical gait references |
| Used from source | Terrain, load, and injury alter gait and posture. |
| HLS transformation | Added modifier fields so state can affect runtime parameters before solving. Added `treadConfidence` for stair override decisions and terrain fallback. |
| Confidence | medium to high |
| Applies to | [Modifier Stacking](./modifier-stacking.md), [Parameter System](./parameter-system.md), [Foot Target Solver](../09-solvers/foot-target-solver.md), [Spine Solver](../09-solvers/spine-solver.md) |

### No final bones in input state

| Field | Value |
|---|---|
| Rule | CharacterInputState should not contain final bone transforms. |
| Source card | [Procedural Animation Overview](../research/source-cards/procedural-animation-overview.md), [Unreal Engine IK Rig](../research/source-cards/unreal-engine-ik-rig.md) |
| External link | https://dev.epicgames.com/documentation/en-us/unreal-engine/ik-rig-in-unreal-engine |
| Source type | implementation constraint |
| Used from source | IK and rig systems apply targets; gameplay state should not directly own final skeleton output. |
| HLS transformation | Input contains state, while OutputPose contains pose intent. |
| Confidence | high |
| Applies to | [Output Pose](./output-pose.md), [Pose Composer](../09-solvers/pose-composer.md), [Unreal Engine](../11-unreal-engine/index.md) |

### Network-safe input boundary

| Field | Value |
|---|---|
| Rule | CharacterInputState should separate server-owned gameplay fields from client-only visual smoothing. |
| Source card | [Networking Model](./networking.md), [Procedural Animation Overview](../research/source-cards/procedural-animation-overview.md) |
| External link | https://dev.epicgames.com/documentation/en-us/unreal-engine/networking-and-multiplayer-in-unreal-engine |
| Source type | HLS networking architecture / procedural animation |
| Used from source | Multiplayer systems replicate gameplay-relevant state while clients reconstruct visual pose locally. |
| HLS transformation | Added network role, correction time, prediction mode, remote smoothing alpha, and compact replication state. Client smoothing values are visual-only and must not become authoritative gameplay transitions. |
| Confidence | high |
| Applies to | [Networking](./networking.md), [Locomotion State Resolver](./locomotion-state-resolver.md), [Output Pose](./output-pose.md) |

## Numeric Data Separation

| Value | Category | Usage |
|---|---|---|
| field list | HLS architecture requirement | runtime implementation |
| terrain confidence | HLS tuning/debug concept | solver fallback logic |
| tread confidence | HLS tuning/debug concept | stairs override and fallback |
| remote smoothing alpha | HLS networking tuning value | simulated proxy smoothing |
| compact replication state | HLS networking contract | multiplayer implementation |

## Open Questions

- Exact serialization format for networked characters.
- Whether terrain confidence should be generated by movement code or HLS.
- Whether stance state belongs in input or state resolver output.
- Which fields are authoritative, predicted, or visual-only in multiplayer.
