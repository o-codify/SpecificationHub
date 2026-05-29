---
id: unreal-engine
title: Unreal Engine
status: draft
version: 26.529.2146
tags:
  - unreal-engine
  - control-rig
  - ik
---

# Unreal Engine

## Purpose

Defines how HLS maps to Unreal Engine implementation.

HLS should be implementable with C++, Animation Blueprint, Control Rig, IK, and debug visualization.

## Core Rule

Runtime computes intent. Unreal animation systems apply the pose.

```text
C++ locomotion component
  -> AnimInstance variables
  -> Control Rig / IK
  -> final skeletal pose
```

## Recommended Components

- UHLSLocomotionComponent
- UHLSAnimInstance
- HLS Control Rig
- Foot IK nodes or FullBodyIK
- debug draw component
- data assets for locomotion profiles

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

Server owns gameplay state. Clients can solve pose locally from replicated movement, modifiers, and compressed HLS state.

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

## Open Questions

- Whether first implementation should be pure C++ solvers or Control Rig-heavy.
- How much data should be exposed to Blueprints.
- How to handle prediction and smoothing for simulated proxies.
