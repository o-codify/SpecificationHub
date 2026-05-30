---
id: runtime
title: Runtime
status: review
version: 26.530.1515
tags:
  - runtime
  - architecture
  - provenance
  - links
  - numeric
---

# Runtime

## Purpose

Defines the runtime architecture for HLS procedural locomotion.

Runtime is responsible for motion intent. Animation systems are responsible for applying the pose to the skeleton.

## Runtime Pipeline

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
  -> OutputPose
  -> IK/ControlRig/AnimBP
```

## Runtime Documents

| Document | Responsibility | Status |
|---|---|---|
| [Character Input State](./input-state.md) | gameplay-to-HLS input packet | review |
| [Locomotion State Resolver](./locomotion-state-resolver.md) | active locomotion state selection | review |
| [Parameter System](./parameter-system.md) | parameter groups, defaults, tuning, clamps | review |
| [Modifier Stacking](./modifier-stacking.md) | modifier order and conflict resolution | review |
| [Solver Interfaces](./solver-interfaces.md) | common solver contract | review |
| [Runtime Update Order](./update-order.md) | execution order | review |
| [Runtime Constraints](./constraints.md) | runtime safety rules | review |
| [Output Pose](./output-pose.md) | final pose intent contract | review |
| [Networking Model](./networking.md) | multiplayer state and proxy behavior | review |
| [Debug Visualization](./debug-visualization.md) | debug views and warnings | review |

## Architecture Rule

```text
GameplayState
  -> CharacterInputState
  -> HLSRuntimeIntent
  -> SolverPoseIntent
  -> RuntimeConstraints
  -> OutputPose
  -> AnimationSystemApplication
  -> FinalSkeletalPose
```

## Responsibility Map

| Layer | Owns | Does not own |
|---|---|---|
| Gameplay | input state, gameplay truth, replicated state | final bone solving |
| HLS Runtime | locomotion state, parameters, modifiers, solver outputs | engine-specific skeleton details |
| PoseComposer | final pose intent, conflict priority | low-level IK internals |
| RuntimeConstraints | safety clamps, warnings, fallback flags | gameplay authority |
| OutputPose | pose intent, priorities, debug channels | authoritative final bone transforms |
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

## Key Runtime Contracts

```text
CharacterInputState + ResolvedParameters + PreviousSolverState
  -> Solver
  -> PoseIntent + DebugValues + WarningFlags
```

```text
ReplicatedCompactState
  -> LocalParameterResolution
  -> LocalSolvers
  -> PoseComposer
  -> OutputPose
```

```text
FootLockPriority > PoseWarpPriority > CosmeticSecondaryMotion
SafetyClamps run before OutputPose
```

## Key Numeric References

| Value | First-pass range | Used by |
|---|---:|---|
| PoseSmoothing | 0.08..0.20 s | PoseComposer / OutputPose / proxies |
| PhaseCorrectionTime | 0.10..0.30 s | GaitPhaseGenerator / Networking |
| MinimumStateTime | 0.15..0.35 s | LocomotionStateResolver |
| IKReach | 0.85..0.95 * LegLength | FootTargetSolver / RuntimeConstraints |
| StepLengthMultiplier | 0.65..1.20 | ModifierStacking |
| CadenceMultiplier | 0.70..1.15 | ModifierStacking |
| TurnSpeedMultiplier | 0.40..1.10 | ModifierStacking / turning |
| TeleportPhaseSnapThreshold | 0.35..0.50 cycle | Networking |

## Rule Provenance

### Runtime owns intent

| Field | Value |
|---|---|
| Rule | Runtime computes locomotion intent; animation systems apply pose. |
| Source card | [Procedural Animation Overview](../research/source-cards/procedural-animation-overview.md), [Unreal Engine Control Rig](../research/source-cards/unreal-engine-control-rig.md) |
| External link | https://dev.epicgames.com/documentation/en-us/unreal-engine/control-rig-in-unreal-engine |
| Source type | procedural animation architecture / Unreal Engine documentation |
| Used from source | Runtime can compute controls and animation systems can apply them to the skeleton. |
| HLS transformation | HLS pipeline separates input, state, parameters, solvers, pose intent, runtime constraints, output pose, and IK/FK output. |
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
| HLS transformation | Runtime documents include Markdown `Rule Provenance` tables, confidence values, and numeric data separation. |
| Confidence | high |
| Applies to | all runtime and solver documents |

### Safety and debug before output

| Field | Value |
|---|---|
| Rule | Runtime constraints and warning flags must run before OutputPose and remain debug-visible. |
| Source card | [IK Foot Placement](../research/source-cards/ik-foot-placement.md), [Procedural Animation Overview](../research/source-cards/procedural-animation-overview.md) |
| External link | https://dev.epicgames.com/documentation/en-us/unreal-engine/full-body-ik-in-unreal-engine |
| Source type | IK implementation constraint / procedural architecture |
| Used from source | Procedural targets must remain reachable, stable, and inspectable before final rig application. |
| HLS transformation | RuntimeConstraints clamp invalid values before OutputPose. OutputPose carries debug channels and warnings for Debug Visualization and Validation Methodology. |
| Confidence | high |
| Applies to | [Runtime Constraints](./constraints.md), [Output Pose](./output-pose.md), [Debug Visualization](./debug-visualization.md) |

## Current Status

The primary runtime documents include Markdown provenance sections, external links, source-card references, HLS transformation notes, confidence values, and numeric data separation.

## Open Work

- Unreal Engine implementation docs should be updated next.
- Runtime structs and C++ API docs should be created in a later implementation pass.
