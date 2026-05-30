---
id: output-pose
title: Output Pose
status: review
version: 26.530.1515
tags:
  - runtime
  - output
  - pose
  - provenance
  - links
  - numeric
---

# Output Pose

## Purpose

Defines the final data produced by HLS runtime before animation application.

OutputPose is not the final skeletal pose. It is pose intent for IK, FK, Control Rig, or AnimBP.

## Output Groups

### Foot Outputs

- left foot target
- right foot target
- left foot contact state
- right foot contact state
- left foot lock state
- right foot lock state
- foot surface normals
- foot reach warning state

### Pelvis Outputs

- pelvis position offset
- pelvis rotation offset
- pelvis smoothing value
- balance or support side
- pelvis reach warning state

### Spine Outputs

- lumbar offset
- thoracic offset
- torso lean
- shoulder counter rotation
- neck offset
- head stabilization

### Arm Outputs

- left arm swing intent
- right arm swing intent
- arm freedom values
- weapon or carry override values
- hand IK intent if needed

### Debug Outputs

- gait phase
- active locomotion state
- resolved parameter profile
- active modifiers
- clamp warnings
- solver warnings
- pose smoothing value
- phase correction value

## Rules

- OutputPose should not require a specific Unreal skeleton.
- OutputPose should be convertible to Control Rig controls.
- OutputPose should be serializable for debugging.
- OutputPose should separate intent from final bone transforms.
- OutputPose must expose clamp/debug state when runtime constraints modify a value.
- OutputPose must preserve foot contact and lock state so animation application does not erase solver intent.

## Runtime Contract

```text
PoseComposer -> RuntimeConstraints -> OutputPose -> AnimBP / ControlRig / IK
```

```text
OutputPose contains intent, targets, priorities, clamps, and debug channels.
OutputPose does not contain authoritative final bone transforms for normal locomotion.
FootLockPriority > PoseWarpPriority > CosmeticSecondaryMotion
```

## Rule Provenance

### OutputPose is pose intent, not final bones

| Field | Value |
|---|---|
| Rule | OutputPose separates runtime intent from final skeletal transforms. |
| Source card | [Procedural Animation Overview](../research/source-cards/procedural-animation-overview.md), [Unreal Engine Control Rig](../research/source-cards/unreal-engine-control-rig.md) |
| External link | https://dev.epicgames.com/documentation/en-us/unreal-engine/control-rig-in-unreal-engine |
| Source type | procedural animation / Unreal Engine documentation |
| Used from source | Runtime can compute controls and rig systems can apply them to skeletons. |
| HLS transformation | OutputPose groups foot, pelvis, spine, arm, and debug intent before AnimBP / Control Rig. |
| Confidence | high |
| Applies to | [Pose Composer](../09-solvers/pose-composer.md), [Unreal Engine](../11-unreal-engine/index.md), [Solver Interfaces](./solver-interfaces.md) |

### Foot and pelvis outputs support IK

| Field | Value |
|---|---|
| Rule | OutputPose includes foot targets, lock states, surface normals, and pelvis offsets. |
| Source card | [IK Foot Placement](../research/source-cards/ik-foot-placement.md), [Unreal Engine IK Rig](../research/source-cards/unreal-engine-ik-rig.md) |
| External link | https://dev.epicgames.com/documentation/en-us/unreal-engine/ik-rig-in-unreal-engine |
| Source type | IK implementation constraint |
| Used from source | IK systems need targets and constraints to solve skeletal feet and body position. |
| HLS transformation | OutputPose exposes contact and target data instead of hidden solver state. Foot and pelvis reach warnings are exposed before skeletal application. |
| Confidence | high |
| Applies to | [Foot Target Solver](../09-solvers/foot-target-solver.md), [Pelvis Solver](../09-solvers/pelvis-solver.md), [Runtime Constraints](./constraints.md) |

### Debug data is part of output contract

| Field | Value |
|---|---|
| Rule | OutputPose includes debug channels and warnings. |
| Source card | [Procedural Animation Overview](../research/source-cards/procedural-animation-overview.md) |
| External link | https://dev.epicgames.com/documentation/en-us/unreal-engine/control-rig-in-unreal-engine |
| Source type | implementation/debugging constraint |
| Used from source | Procedural systems require inspectable controls and solver outputs for tuning. |
| HLS transformation | OutputPose carries gait phase, active state, modifiers, clamp warnings, solver warnings, smoothing values, and phase correction values. |
| Confidence | high |
| Applies to | [Debug Visualization](./debug-visualization.md), [Validation Methodology](../research/validation-methodology.md) |

### Output preserves composition priority

| Field | Value |
|---|---|
| Rule | OutputPose must preserve contact and priority decisions made by PoseComposer. |
| Source card | [Pose Warping](../research/source-cards/pose-warping.md), [IK Foot Placement](../research/source-cards/ik-foot-placement.md), [Procedural Animation Overview](../research/source-cards/procedural-animation-overview.md) |
| External link | https://dev.epicgames.com/documentation/en-us/unreal-engine/pose-warping-in-unreal-engine |
| Source type | pose adaptation / IK implementation constraint |
| Used from source | Pose adaptation is useful only if contact timing and foot locks remain stable. |
| HLS transformation | OutputPose carries foot lock state, priority flags, and clamp warnings so downstream animation cannot silently override contact constraints. |
| Confidence | high as implementation rule |
| Applies to | [Pose Composer](../09-solvers/pose-composer.md), [Runtime Update Order](./update-order.md), [Runtime Constraints](./constraints.md) |

## Numeric Data Separation

| Value | Category | Usage |
|---|---|---|
| output groups | HLS architecture contract | UE implementation |
| IK targets | implementation output | Control Rig / IK Rig input |
| debug warnings | HLS tooling requirement | validation and tuning |
| `FootLockPriority > PoseWarpPriority` | HLS implementation rule | contact preservation |
| `PoseSmoothing = 0.08..0.20 s` | HLS tuning range | debug/output channel |
| `PhaseCorrectionTime = 0.10..0.30 s` | HLS tuning range | debug/output channel |

## Open Questions

- Exact data structure for first C++ implementation.
- Whether hand IK should be part of OutputPose or weapon system output.
- Whether OutputPose should support LOD-reduced variants.
- Whether remote proxies need a reduced OutputPose schema.
