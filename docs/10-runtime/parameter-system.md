---
id: parameter-system
title: Parameter System
status: draft
version: 26.530.1046
tags:
  - runtime
  - parameters
  - tuning
  - provenance
  - links
  - numeric
---

# Parameter System

## Purpose

Defines how HLS stores, resolves, and tunes locomotion parameters.

Parameters are the bridge between research rules and runtime solvers.

## Parameter Groups

### Gait Parameters

- cadence: steps per minute, walk 100..120, run 150..190
- stance ratio: walk 0.58..0.62, run 0.30..0.45
- swing ratio: `1 - stanceRatio`
- step length: meters, walk 0.60..0.80, run 0.90..1.60
- step width: meters, 0.08..0.22
- foot lift height: meters, flat walk 0.04..0.10
- gait phase speed: `CadenceSPM / 120` stride cycles per second

### Pelvis Parameters

- pelvis height
- pelvis vertical amplitude: meters, walk 0.02..0.05, run multiplier 1.25..2.00
- pelvis yaw amplitude: degrees, 2..6
- pelvis roll amplitude: degrees, 1..4
- pelvis pitch bias: degrees, modifier clamp -10..15
- pelvis smoothing: seconds, 0.08..0.20

### Spine Parameters

- torso lean: degrees, walk 0..5, run 5..15 before modifiers
- torso roll: degrees, first-pass clamp -10..10
- shoulder counter rotation: degrees, 0.5..1.0 of pelvis yaw in opposite direction
- spine stiffness: normalized 0..1
- head stabilization: normalized 0..1

### Arm Parameters

- arm swing amplitude: degrees, walk 10..35, run multiplier 1.20..1.75
- arm phase offset: default opposite leg phase, 0.5 cycle offset
- elbow bend amount: degrees, character/style dependent
- arm freedom: normalized 0..1
- weapon stabilization: normalized 0..1

### Terrain Parameters

- slope torso pitch: degrees, tuning scale 0.2..0.6 per uphill degree before clamp
- slope foot lift multiplier
- stair foot clearance: meters, base foot lift plus 0.03..0.08
- stair pelvis smoothing: seconds, 0.10..0.25
- terrain confidence: normalized 0..1

### Modifier Parameters

- load weight normalized: 0..1
- injury severity: 0..1
- fatigue: 0..1
- carry restriction: 0..1
- weapon readiness: 0..1

## Rules

- Parameters should be tunable in data assets or equivalent config.
- Parameters should be normalized where possible.
- Character scale converts normalized parameters into world units.
- Modifiers should change parameters before solvers run.
- Solvers should not hard-code gameplay state.
- Default parameters should produce acceptable walking without modifiers.
- All dimensional parameters must declare units.
- All resolver outputs must pass safety clamps before solver use.

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

- minimum step length: 0.20 m or character-scale equivalent
- maximum step length: `0.80..1.10 * LegLength`
- minimum stance ratio: 0.30
- maximum stance ratio: 0.75
- maximum torso lean: 20 degrees first-pass gameplay clamp
- maximum pelvis offset: `0.10..0.18 * LegLength`
- maximum foot lift: 0.30 m before stair-specific override
- maximum IK reach: `0.85..0.95 * LegLength`

## Rule Provenance

### Parameters bridge research and solvers

| Field | Value |
|---|---|
| Rule | Research-backed concepts must become tunable runtime parameters before solvers use them. |
| Source card | [Research Provenance Methodology](../research/provenance-methodology.md), [Procedural Animation Overview](../research/source-cards/procedural-animation-overview.md) |
| External link | https://dev.epicgames.com/documentation/en-us/unreal-engine/control-rig-in-unreal-engine |
| Source type | HLS methodology / procedural implementation constraint |
| Used from source | Procedural systems need explicit controls and targets rather than vague descriptions. |
| HLS transformation | Created grouped parameter system for gait, pelvis, spine, arms, terrain, and modifiers with explicit units and first-pass ranges. |
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
| HLS transformation | Parameter docs mark tuning ranges separately from source-backed facts. Walk stance 0.60 is source-backed; clamps like pelvis offset, foot lift, and torso lean are HLS tuning or implementation safety values. |
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
| HLS transformation | ModifierResolver resolves gait/load/injury/terrain parameters before FootTarget, Pelvis, Spine, and Arm solvers. First-pass severe modifiers may reduce step length or cadence by 10..35 percent before state downgrade. |
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
| HLS transformation | Added safety clamps for step length, stance ratio, torso lean, pelvis offset, foot lift, and IK reach. IK reach uses 0.85..0.95 of leg length as a first-pass safe range. |
| Confidence | high |
| Applies to | [Runtime Constraints](./constraints.md), [Foot Target Solver](../09-solvers/foot-target-solver.md), [Pelvis Solver](../09-solvers/pelvis-solver.md) |

## Numeric Data Separation

| Value | Category | Usage |
|---|---|---|
| walking stance/swing ratio | source-backed default | gait phase defaults |
| `WalkStanceRatio = 0.58..0.62` | HLS tuning range around source default | ordinary walking |
| `RunStanceRatio = 0.30..0.45` | HLS tuning value | run profile |
| `StepWidth = 0.08..0.22 m` | HLS tuning value | foot placement |
| `FootLift = 0.04..0.10 m` | HLS tuning value | flat terrain clearance |
| `PelvisVerticalAmplitude = 0.02..0.05 m` | HLS tuning value | walking pelvis motion |
| `PelvisSmoothing = 0.08..0.20 s` | HLS tuning value | smoothing |
| `IKReach = 0.85..0.95 * LegLength` | implementation constraint / skeleton profile | safety clamp |
| pelvis/spine/arm amplitudes | HLS tuning values | visual tuning |
| IK reach limits | implementation constraint / skeleton profile | safety clamp |

## Open Questions

- Exact data asset schema for Unreal Engine.
- Whether profiles should be per character, per skeleton, or per movement style.
- How much parameter blending is required during transitions.
