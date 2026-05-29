---
id: output-pose
title: Output Pose
status: draft
version: 26.529.2305
tags:
  - runtime
  - output
  - pose
  - provenance
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

### Pelvis Outputs

- pelvis position offset
- pelvis rotation offset
- pelvis smoothing value
- balance or support side

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

## Rules

- OutputPose should not require a specific Unreal skeleton.
- OutputPose should be convertible to Control Rig controls.
- OutputPose should be serializable for debugging.
- OutputPose should separate intent from final bone transforms.

## Rule Provenance

### OutputPose is pose intent, not final bones

| Field | Value |
|---|---|
| Rule | OutputPose separates runtime intent from final skeletal transforms. |
| Source card | `docs/research/source-cards/procedural-animation-overview.md`, `docs/research/source-cards/unreal-engine-control-rig.md` |
| External link | https://dev.epicgames.com/documentation/en-us/unreal-engine/control-rig-in-unreal-engine |
| Source type | procedural animation / Unreal Engine documentation |
| Used from source | Runtime can compute controls and rig systems can apply them to skeletons. |
| HLS transformation | OutputPose groups foot, pelvis, spine, arm, and debug intent before AnimBP / Control Rig. |
| Confidence | high |
| Applies to | `PoseComposer`, `Unreal Engine`, `Solver Interfaces` |

### Foot and pelvis outputs support IK

| Field | Value |
|---|---|
| Rule | OutputPose includes foot targets, lock states, surface normals, and pelvis offsets. |
| Source card | `docs/research/source-cards/ik-foot-placement.md`, `docs/research/source-cards/unreal-engine-ik-rig.md` |
| External link | https://dev.epicgames.com/documentation/en-us/unreal-engine/ik-rig-in-unreal-engine |
| Source type | IK implementation constraint |
| Used from source | IK systems need targets and constraints to solve skeletal feet and body position. |
| HLS transformation | OutputPose exposes contact and target data instead of hidden solver state. |
| Confidence | high |
| Applies to | `FootTargetSolver`, `PelvisSolver`, `Runtime Constraints` |

### Debug data is part of output contract

| Field | Value |
|---|---|
| Rule | OutputPose includes debug channels and warnings. |
| Source card | `docs/research/source-cards/procedural-animation-overview.md` |
| External link | https://dev.epicgames.com/documentation/en-us/unreal-engine/control-rig-in-unreal-engine |
| Source type | implementation/debugging constraint |
| Used from source | Procedural systems require inspectable controls and solver outputs for tuning. |
| HLS transformation | OutputPose carries gait phase, active state, modifiers, clamp warnings, and solver warnings. |
| Confidence | high |
| Applies to | `Debug Visualization`, `Validation Methodology` |

## Numeric Data Separation

| Value | Category | Usage |
|---|---|---|
| output groups | HLS architecture contract | UE implementation |
| IK targets | implementation output | Control Rig / IK Rig input |
| debug warnings | HLS tooling requirement | validation and tuning |

## Open Questions

- Exact data structure for first C++ implementation.
- Whether hand IK should be part of OutputPose or weapon system output.
- Whether OutputPose should support LOD-reduced variants.
