---
id: output-pose
title: Output Pose
status: draft
version: 26.529.2150
tags:
  - runtime
  - output
  - pose
---

# Output Pose

## Purpose

Defines the final data produced by HLS runtime before animation application.

OutputPose is not the final skeletal pose. It is pose intent for IK, FK, Control Rig, or AnimBP.

## Output Groups

## Foot Outputs

- left foot target
- right foot target
- left foot contact state
- right foot contact state
- left foot lock state
- right foot lock state
- foot surface normals

## Pelvis Outputs

- pelvis position offset
- pelvis rotation offset
- pelvis smoothing value
- balance or support side

## Spine Outputs

- lumbar offset
- thoracic offset
- torso lean
- shoulder counter rotation
- neck offset
- head stabilization

## Arm Outputs

- left arm swing intent
- right arm swing intent
- arm freedom values
- weapon or carry override values
- hand IK intent if needed

## Debug Outputs

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

## Open Questions

- Exact data structure for first C++ implementation.
- Whether hand IK should be part of OutputPose or weapon system output.
- Whether OutputPose should support LOD-reduced variants.
