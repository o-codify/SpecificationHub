---
id: parameter-system
title: Parameter System
status: draft
version: 26.530.954
tags:
  - runtime
  - parameters
  - tuning
  - provenance
  - links
---

# Parameter System

## Purpose

Defines how HLS stores, resolves, and tunes locomotion parameters.

Parameters are the bridge between research rules and runtime solvers.

## Parameter Groups

### Gait Parameters

- cadence
- stance ratio
- swing ratio
- step length
- step width
- foot lift height
- gait phase speed

### Pelvis Parameters

- pelvis height
- pelvis vertical amplitude
- pelvis yaw amplitude
- pelvis roll amplitude
- pelvis pitch bias
- pelvis smoothing

### Spine Parameters

- torso lean
- torso roll
- shoulder counter rotation
- spine stiffness
- head stabilization

### Arm Parameters

- arm swing amplitude
- arm phase offset
- elbow bend amount
- arm freedom
- weapon stabilization

### Terrain Parameters

- slope torso pitch
- slope foot lift multiplier
- stair foot clearance
- stair pelvis smoothing
- terrain confidence

### Modifier Parameters

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

## Rule Provenance

### Parameters bridge research and solvers

| Field | Value |
|---|---|
| Rule | Research-backed concepts must become tunable runtime parameters before solvers use them. |
| Source card | [Research Provenance Methodology](../research/provenance-methodology.md), [Procedural Animation Overview](../research/source-cards/procedural-animation-overview.md) |
| External link | https://dev.epicgames.com/documentation/en-us/unreal-engine/control-rig-in-unreal-engine |
| Source type | HLS methodology / procedural implementation constraint |
| Used from source | Procedural systems need explicit controls and targets rather than vague descriptions. |
| HLS transformation | Created grouped parameter system for gait, pelvis, spine, arms, terrain, and modifiers. |
| Confidence | high |
| Applies to | all solvers and modifiers |

### Source numeric data must be separated from tuning values

| Field | Value |
|---|---|
| Rule | Scientific numeric data, HLS defaults, and tuning ranges must be separated. |
| Source card | [Research Provenance Methodology](../research/provenance-methodology.md), [Normal Gait Overview](../research/source-cards/normal-gait-overview.md) |
| External link | https://www.physio-pedia.com/The_Gait_Cycle |
| Source type | provenance methodology / gait overview |
| Used from source | Some values, such as walking stance/swing ratio, are source-backed defaults; many other values are gameplay tuning. |
| HLS transformation | Parameter docs mark tuning ranges separately from source-backed facts. |
| Confidence | high |
| Applies to | [Gait Phase Generator](../09-solvers/gait-phase-generator.md), [Modifier Stacking](./modifier-stacking.md), [Validation Methodology](../research/validation-methodology.md) |

### Modifiers change parameters before solvers

| Field | Value |
|---|---|
| Rule | Modifiers should change parameters before solvers run. |
| Source card | [Procedural Animation Overview](../research/source-cards/procedural-animation-overview.md), [Load Carriage Posture](../research/source-cards/load-carriage-posture.md), [Antalgic Gait](../research/source-cards/antalgic-gait.md) |
| External link | https://www.ncbi.nlm.nih.gov/books/NBK559243/ |
| Source type | procedural architecture plus gait/load evidence |
| Used from source | Gameplay state such as injury, terrain, and load changes locomotion quality and posture. |
| HLS transformation | ModifierResolver resolves gait/load/injury/terrain parameters before FootTarget, Pelvis, Spine, and Arm solvers. |
| Confidence | high as architecture rule |
| Applies to | [Modifier Stacking](./modifier-stacking.md), [Solver Interfaces](./solver-interfaces.md), [Pose Composer](../09-solvers/pose-composer.md) |

### Safety clamps

| Field | Value |
|---|---|
| Rule | Resolved parameters must be clamped before solver use. |
| Source card | [IK Foot Placement](../research/source-cards/ik-foot-placement.md), [Unreal Engine IK Rig](../research/source-cards/unreal-engine-ik-rig.md) |
| External link | https://dev.epicgames.com/documentation/en-us/unreal-engine/full-body-ik-in-unreal-engine |
| Source type | IK / implementation constraint |
| Used from source | IK and skeletal solving require reachable targets and stable constraints. |
| HLS transformation | Added safety clamps for step length, stance ratio, torso lean, pelvis offset, foot lift, and IK reach. |
| Confidence | high |
| Applies to | [Runtime Constraints](./constraints.md), [Foot Target Solver](../09-solvers/foot-target-solver.md), [Pelvis Solver](../09-solvers/pelvis-solver.md) |

## Numeric Data Separation

| Value | Category | Usage |
|---|---|---|
| walking stance/swing ratio | source-backed default | gait phase defaults |
| run stance range | HLS tuning value | run profile |
| pelvis/spine/arm amplitudes | HLS tuning values | visual tuning |
| IK reach limits | implementation constraint / skeleton profile | safety clamp |

## Open Questions

- Exact data asset schema for Unreal Engine.
- Whether profiles should be per character, per skeleton, or per movement style.
- How much parameter blending is required during transitions.
