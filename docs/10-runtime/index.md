---
id: runtime
title: Runtime
status: draft
version: 26.529.2335
tags:
  - runtime
  - architecture
  - provenance
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

## Runtime Documents

| Document | Responsibility | Provenance status |
|---|---|---|
| [Character Input State](input-state.md) | gameplay-to-HLS input packet | upgraded |
| [Locomotion State Resolver](locomotion-state-resolver.md) | active locomotion state selection | upgraded |
| [Parameter System](parameter-system.md) | parameter groups, defaults, tuning, clamps | upgraded |
| [Modifier Stacking](modifier-stacking.md) | modifier order and conflict resolution | upgraded |
| [Solver Interfaces](solver-interfaces.md) | common solver contract | upgraded |
| [Output Pose](output-pose.md) | final pose intent contract | upgraded |
| [Runtime Constraints](constraints.md) | runtime safety rules | upgraded |
| [Networking Model](networking.md) | multiplayer state and proxy behavior | upgraded |
| [Debug Visualization](debug-visualization.md) | debug views and warnings | upgraded |
| [Runtime Update Order](update-order.md) | execution order | upgraded |

## Architecture Rule

```text
Gameplay state
  -> HLS runtime intent
  -> pose intent
  -> animation system application
  -> final skeletal pose
```

## Responsibility Map

| Layer | Owns | Does not own |
|---|---|---|
| Gameplay | input state, gameplay truth, replicated state | final bone solving |
| HLS Runtime | locomotion state, parameters, modifiers, solver outputs | engine-specific skeleton details |
| PoseComposer | final pose intent, conflict priority | low-level IK internals |
| Animation System | IK/FK application, Control Rig controls | gameplay locomotion decisions |
| Debug | visualization, warnings, validation data | gameplay authority |

## Evidence Map

| Runtime decision | Source cards / docs |
|---|---|
| runtime owns intent | [Procedural Animation Overview](../research/source-cards/procedural-animation-overview.md), [Unreal Engine Control Rig](../research/source-cards/unreal-engine-control-rig.md) |
| input includes movement trajectory | [Motion Matching](../research/source-cards/motion-matching.md), [Pose Warping](../research/source-cards/pose-warping.md) |
| terrain modifies foot targets | [Stairs and Slopes](../research/source-cards/stairs-and-slopes.md), [IK Foot Placement](../research/source-cards/ik-foot-placement.md) |
| load/injury modify parameters | [Load Carriage Posture](../research/source-cards/load-carriage-posture.md), [Antalgic Gait](../research/source-cards/antalgic-gait.md), [Pathological Gait Asymmetry](../research/source-cards/pathological-gait-asymmetry.md) |
| output pose is intent, not bones | [Procedural Animation Overview](../research/source-cards/procedural-animation-overview.md), [Unreal Engine IK Rig](../research/source-cards/unreal-engine-ik-rig.md) |
| compact replication | [Procedural Animation Overview](../research/source-cards/procedural-animation-overview.md), [Unreal Engine](../11-unreal-engine/index.md) |
| debug is required for tuning | [Research Provenance Methodology](../research/provenance-methodology.md), [Procedural Animation Overview](../research/source-cards/procedural-animation-overview.md) |

## Rule Provenance

### Runtime owns intent

| Field | Value |
|---|---|
| Rule | Runtime computes locomotion intent; animation systems apply pose. |
| Source card | [Procedural Animation Overview](../research/source-cards/procedural-animation-overview.md), [Unreal Engine Control Rig](../research/source-cards/unreal-engine-control-rig.md) |
| External link | https://dev.epicgames.com/documentation/en-us/unreal-engine/control-rig-in-unreal-engine |
| Source type | procedural animation architecture / Unreal Engine documentation |
| Used from source | Runtime can compute controls and animation systems can apply them to the skeleton. |
| HLS transformation | HLS pipeline separates input, state, parameters, solvers, pose intent, and IK/FK output. |
| Confidence | high |
| Applies to | all runtime documents |

### Source-backed runtime rules

| Field | Value |
|---|---|
| Rule | Runtime rules must identify source-backed facts, HLS inference, and tuning values. |
| Source card | [Research Provenance Methodology](../research/provenance-methodology.md) |
| External link | [Research Provenance Methodology](../research/provenance-methodology.md) |
| Source type | HLS methodology |
| Used from source | Provenance must show where rules come from and how they are transformed into implementation. |
| HLS transformation | Runtime documents now include Markdown `Rule Provenance` tables. |
| Confidence | high |
| Applies to | all runtime and solver documents |

## Current Status

The primary runtime documents now include Markdown provenance sections, external links, source-card references, HLS transformation notes, confidence values, and numeric data separation.

## Open Work

- Unreal Engine implementation docs should be updated next.
- Runtime structs and C++ API docs should be created in a later implementation pass.
