---
id: unreal-engine
title: Unreal Engine
status: draft
version: 26.530.1059
tags:
  - unreal-engine
  - control-rig
  - ik
  - provenance
  - links
---

# Unreal Engine

## Purpose

Defines how HLS maps to Unreal Engine implementation.

HLS should be implementable with C++, Animation Blueprint, Control Rig, IK, and debug visualization.

## Core Rule

Runtime computes intent. Unreal animation systems apply the pose.

```text
UHLSLocomotionComponent
  -> FHLSOutputPose
  -> UHLSAnimInstance variables
  -> Control Rig / IK Rig / Full Body IK
  -> final skeletal pose
```

## Recommended Components

| Component | Responsibility |
|---|---|
| `UHLSLocomotionComponent` | owns runtime state, solvers, parameters, and network-relevant HLS state |
| `UHLSAnimInstance` | exposes HLS output to AnimBP and Control Rig |
| HLS Control Rig | applies foot, pelvis, spine, arm, and hand intent to the skeleton |
| IK Rig / Full Body IK | solves skeletal constraints toward HLS targets |
| HLS debug draw component | visualizes phase, targets, locks, modifiers, and warnings |
| data assets | store gait profiles, modifier curves, solver tuning, and skeleton profiles |

## C++ Runtime

C++ should own deterministic state and solver logic:

- input state collection
- locomotion state resolution
- gait phase
- modifiers
- foot targets
- pelvis intent
- spine intent
- arm intent
- network-friendly state

## Animation Blueprint

AnimBP should not own locomotion logic.

AnimBP should:

- read HLS runtime outputs
- pass values to Control Rig
- blend optional overlays
- handle state visualization
- apply aim or weapon overlays when needed

## Control Rig

Control Rig should apply solver output to the skeleton.

Responsibilities:

- foot IK
- pelvis offset application
- spine offsets
- arm IK or FK offsets
- joint limits
- debug controls

## IK

Foot IK is required for Level 3.

Minimum IK behavior:

- place feet at HLS foot targets
- align feet to ground normal within limits
- preserve locked stance feet
- adjust pelvis height to avoid overextension

## Networking

Server owns gameplay state. Clients can solve pose locally from replicated movement, modifiers, and compact HLS state.

Do not replicate full bone poses for normal locomotion.

## Debug Visualization

Required debug views:

- gait phase
- left and right foot phase
- foot targets
- foot lock state
- pelvis offset
- slope and ground normal
- active modifiers
- final IK target positions

## Related HLS Docs

- [Runtime](../10-runtime/index.md)
- [Runtime Update Order](../10-runtime/update-order.md)
- [Output Pose](../10-runtime/output-pose.md)
- [Solver Interfaces](../10-runtime/solver-interfaces.md)
- [Foot Target Solver](../09-solvers/foot-target-solver.md)
- [Pelvis Solver](../09-solvers/pelvis-solver.md)
- [Pose Composer](../09-solvers/pose-composer.md)

## Rule Provenance

### C++ owns runtime intent

| Field | Value |
|---|---|
| Rule | C++ runtime component owns deterministic HLS state and solver logic. |
| Source card | [Procedural Animation Overview](../research/source-cards/procedural-animation-overview.md) |
| External link | https://dev.epicgames.com/documentation/en-us/unreal-engine/programming-with-cplusplus-in-unreal-engine |
| Source type | Unreal Engine implementation architecture / HLS runtime rule |
| Used from source | UE supports C++ gameplay systems and animation systems as separate layers. |
| HLS transformation | Added `UHLSLocomotionComponent` as the primary runtime owner. |
| Confidence | high |
| Applies to | [Runtime](../10-runtime/index.md), [Solver Interfaces](../10-runtime/solver-interfaces.md), [Networking](../10-runtime/networking.md) |

### AnimBP and Control Rig apply pose intent

| Field | Value |
|---|---|
| Rule | AnimBP and Control Rig consume HLS output and apply it to the skeleton. |
| Source card | [Unreal Engine Control Rig](../research/source-cards/unreal-engine-control-rig.md) |
| External link | https://dev.epicgames.com/documentation/en-us/unreal-engine/control-rig-in-unreal-engine |
| Source type | Unreal Engine documentation |
| Used from source | Control Rig and Animation Blueprints can drive skeletal animation from controls and variables. |
| HLS transformation | HLS separates `FHLSOutputPose` from final skeletal application. |
| Confidence | high |
| Applies to | [Output Pose](../10-runtime/output-pose.md), [Pose Composer](../09-solvers/pose-composer.md), Control Rig |

### IK applies foot and body constraints

| Field | Value |
|---|---|
| Rule | IK systems apply HLS foot targets and pelvis/body constraints. |
| Source card | [Unreal Engine IK Rig](../research/source-cards/unreal-engine-ik-rig.md), [IK Foot Placement](../research/source-cards/ik-foot-placement.md) |
| External link | https://dev.epicgames.com/documentation/en-us/unreal-engine/ik-rig-in-unreal-engine |
| Source type | Unreal Engine IK documentation |
| Used from source | IK Rig and Full Body IK solve skeletons toward targets and constraints. |
| HLS transformation | FootTargetSolver and PelvisSolver output IK-ready target data. |
| Confidence | high |
| Applies to | [Foot Target Solver](../09-solvers/foot-target-solver.md), [Pelvis Solver](../09-solvers/pelvis-solver.md), [Runtime Constraints](../10-runtime/constraints.md) |

### Compact network state

| Field | Value |
|---|---|
| Rule | UE implementation should replicate compact HLS state, not full bone poses. |
| Source card | [Procedural Animation Overview](../research/source-cards/procedural-animation-overview.md) |
| External link | https://dev.epicgames.com/documentation/en-us/unreal-engine/networking-and-multiplayer-in-unreal-engine |
| Source type | Unreal Engine networking / HLS architecture |
| Used from source | Gameplay state and visual reconstruction can be separated in networked animation. |
| HLS transformation | Replicate movement, locomotion state, modifiers, optional compressed phase; solve pose locally. |
| Confidence | high |
| Applies to | [Networking](../10-runtime/networking.md), Network Notes |

## Open Questions

- Whether first implementation should be pure C++ solvers or Control Rig-heavy.
- How much data should be exposed to Blueprints.
- How to handle prediction and smoothing for simulated proxies.
- Exact UE class names and module boundaries.
