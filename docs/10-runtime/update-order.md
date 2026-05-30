---
id: runtime-update-order
title: Runtime Update Order
status: draft
version: 26.530.1059
tags:
  - runtime
  - architecture
  - update-order
  - provenance
  - links
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

## Rule Provenance

### Runtime owns intent, animation applies pose

| Field | Value |
|---|---|
| Rule | Runtime computes locomotion intent and animation systems apply bones. |
| Source card | [Procedural Animation Overview](../research/source-cards/procedural-animation-overview.md), [Unreal Engine Control Rig](../research/source-cards/unreal-engine-control-rig.md) |
| External link | https://dev.epicgames.com/documentation/en-us/unreal-engine/control-rig-in-unreal-engine |
| Source type | procedural animation architecture |
| Used from source | Procedural systems generate controls and targets; animation systems apply skeletal output. |
| HLS transformation | Defined full runtime pipeline ending in IK/FK output. |
| Confidence | high |
| Applies to | all runtime layers |

### Modifiers before solvers

| Field | Value |
|---|---|
| Rule | Modifiers resolve parameters before solver execution. |
| Source card | [Load Carriage Posture](../research/source-cards/load-carriage-posture.md), [Antalgic Gait](../research/source-cards/antalgic-gait.md), [Stairs and Slopes](../research/source-cards/stairs-and-slopes.md) |
| External link | https://www.ncbi.nlm.nih.gov/books/NBK559243/ |
| Source type | load, injury, and terrain locomotion references |
| Used from source | Modifiers affect posture, timing, and gait quality. |
| HLS transformation | ModifierResolver executes before FootTarget, Pelvis, Spine, and Arm solvers. |
| Confidence | high as architecture rule |
| Applies to | [Parameter System](./parameter-system.md), [Modifier Stacking](./modifier-stacking.md) |

### Foot before pelvis before spine

| Field | Value |
|---|---|
| Rule | Feet define support, pelvis follows support, spine compensates pelvis. |
| Source card | [Joint Kinematics Overview](../research/source-cards/joint-kinematics-overview.md), [IK Foot Placement](../research/source-cards/ik-foot-placement.md) |
| External link | https://www.physio-pedia.com/The_Gait_Cycle |
| Source type | gait kinematics and IK implementation |
| Used from source | Support contacts influence body balance and posture. |
| HLS transformation | Ordered FootTargetSolver -> PelvisSolver -> SpineSolver. |
| Confidence | medium-high |
| Applies to | [Pose Composer](../09-solvers/pose-composer.md), [Runtime Constraints](./constraints.md) |

### Pose composition before IK

| Field | Value |
|---|---|
| Rule | Pose intent is composed before skeletal IK/FK application. |
| Source card | [Procedural Animation Overview](../research/source-cards/procedural-animation-overview.md), [Unreal Engine IK Rig](../research/source-cards/unreal-engine-ik-rig.md) |
| External link | https://dev.epicgames.com/documentation/en-us/unreal-engine/ik-rig-in-unreal-engine |
| Source type | procedural architecture / engine implementation |
| Used from source | IK solves targets; it should not own locomotion logic. |
| HLS transformation | PoseComposer outputs final intent and IK/FK applies the skeleton. |
| Confidence | high |
| Applies to | [Output Pose](./output-pose.md), [Unreal Engine](../11-unreal-engine/index.md) |

## Numeric Data Separation

| Value | Category | Usage |
|---|---|---|
| update order | HLS architecture contract | runtime execution |
| solver timing | implementation detail | engine integration |
| blend weights | HLS tuning values | composition |
