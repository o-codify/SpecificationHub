---
id: parameter-system
title: Parameter System
status: draft
version: 26.529.2149
tags:
  - runtime
  - parameters
  - tuning
---

# Parameter System

## Purpose

Defines how HLS stores, resolves, and tunes locomotion parameters.

Parameters are the bridge between research rules and runtime solvers.

## Parameter Groups

## Gait Parameters

- cadence
- stance ratio
- swing ratio
- step length
- step width
- foot lift height
- gait phase speed

## Pelvis Parameters

- pelvis height
- pelvis vertical amplitude
- pelvis yaw amplitude
- pelvis roll amplitude
- pelvis pitch bias
- pelvis smoothing

## Spine Parameters

- torso lean
- torso roll
- shoulder counter rotation
- spine stiffness
- head stabilization

## Arm Parameters

- arm swing amplitude
- arm phase offset
- elbow bend amount
- arm freedom
- weapon stabilization

## Terrain Parameters

- slope torso pitch
- slope foot lift multiplier
- stair foot clearance
- stair pelvis smoothing
- terrain confidence

## Modifier Parameters

- load weight normalized
- injury severity
- fatigue
- carry restriction
- weapon readiness

## Rules

- Parameters should be tunable in data assets or equivalent config.
- Parameters should be normalized where possible.
- Character scale converts normalized parameters into world units.
- Modifiers should change parameters before solvers run.
- Solvers should not hard-code gameplay state.
- Default parameters should produce acceptable walking without modifiers.

## Resolution Order

1. load base profile for current gait
2. apply character scale
3. apply locomotion state adjustments
4. apply terrain modifiers
5. apply load and carry modifiers
6. apply injury and fatigue modifiers
7. clamp to safe limits
8. send resolved parameters to solvers

## Safety Clamps

- minimum step length
- maximum step length
- minimum stance ratio
- maximum stance ratio
- maximum torso lean
- maximum pelvis offset
- maximum foot lift
- maximum IK reach

## Open Questions

- Exact data asset schema for Unreal Engine.
- Whether profiles should be per character, per skeleton, or per movement style.
- How much parameter blending is required during transitions.
