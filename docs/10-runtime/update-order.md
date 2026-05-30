---
id: runtime-update-order
title: Runtime Update Order
status: review
version: 26.530.1515
tags:
  - runtime
  - architecture
  - update-order
  - provenance
  - links
  - numeric
---

# Runtime Update Order

## Purpose

Defines the order in which HLS runtime systems update.

## Architecture

```text
CharacterInputState
  -> LocomotionStateResolver
  -> ParameterSystem / ModifierResolver
  -> GaitPhaseGenerator
  -> FootTargetSolver
  -> PelvisSolver
  -> SpineSolver
  -> ArmSwingSolver
  -> PoseComposer
  -> RuntimeConstraints
  -> IK/FK Output
```

## CharacterInputState

Collects velocity, desired direction, ground normal, slope, movement mode, load state, injury state, weapon state, and network role.

## LocomotionStateResolver

Chooses idle, walk, run, start, stop, turn, fall, stairs, slope, injured locomotion, or loaded locomotion.

## ParameterSystem / ModifierResolver

Applies base gait profile, character scale, terrain, load, injury, fatigue, and weapon carry to resolved parameters. Modifiers should not directly write bones.

## GaitPhaseGenerator

Produces stable rhythmic phase from resolved cadence and stance settings.

## FootTargetSolver

Computes procedural foot targets from gait phase, resolved step parameters, terrain traces, and stair data.

## PelvisSolver

Computes pelvis transform from phase and foot contacts.

## SpineSolver

Computes torso compensation after pelvis motion is known.

## ArmSwingSolver

Computes arm swing and carry restrictions after gait phase and upper-body restrictions are resolved.

## PoseComposer

Combines all solver outputs into final pose intent and resolves priority conflicts.

## RuntimeConstraints

Applies safety clamps and emits debug warnings before final output.

## IK/FK Output

Applies pose intent to skeleton using Control Rig, AnimBP, IK, or FK.

## Rule

Runtime owns intent. Animation system applies bones.

```text
ResolvedParameters -> Solvers -> PoseComposer -> RuntimeConstraints -> IK/ControlRig -> OutputPose
FootLockPriority > PoseWarpPriority > CosmeticSecondaryMotion
SafetyClamps run before OutputPose
```

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
| HLS transformation | ParameterSystem / ModifierResolver executes before FootTarget, Pelvis, Spine, and Arm solvers. Safety clamps are applied before final output. |
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
| HLS transformation | PoseComposer outputs final intent and IK/FK applies the skeleton. Foot locks and safety clamps remain higher priority than warping or cosmetic secondary motion. |
| Confidence | high |
| Applies to | [Output Pose](./output-pose.md), [Unreal Engine](../11-unreal-engine/index.md) |

### Safety clamps before output

| Field | Value |
|---|---|
| Rule | Runtime safety clamps must run before skeletal output. |
| Source card | [IK Foot Placement](../research/source-cards/ik-foot-placement.md), [Procedural Animation Overview](../research/source-cards/procedural-animation-overview.md) |
| External link | https://dev.epicgames.com/documentation/en-us/unreal-engine/full-body-ik-in-unreal-engine |
| Source type | IK implementation constraint / procedural architecture |
| Used from source | Final targets must remain reachable and stable before animation systems apply them. |
| HLS transformation | RuntimeConstraints run after PoseComposer and before IK/FK output. Clamp changes must be exposed through debug channels. |
| Confidence | high |
| Applies to | [Runtime Constraints](./constraints.md), [Output Pose](./output-pose.md), [Debug Visualization](./debug-visualization.md) |

## Numeric Data Separation

| Value | Category | Usage |
|---|---|---|
| update order | HLS architecture contract | runtime execution |
| `FootLockPriority > PoseWarpPriority` | HLS implementation rule | contact preservation |
| `SafetyClamps before OutputPose` | HLS implementation rule | prevent invalid skeletal output |
| solver timing | implementation detail | engine integration |
| blend weights | HLS tuning values | composition |

## Open Questions

- Exact split between C++, AnimBP, and Control Rig per project implementation.
- Whether RuntimeConstraints should be a distinct pass or integrated into PoseComposer.
- How much of the update order should be replicated versus reconstructed on remote proxies.
