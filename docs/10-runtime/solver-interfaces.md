---
id: solver-interfaces
title: Solver Interfaces
status: review
version: 26.530.1447
tags:
  - runtime
  - solver
  - interfaces
  - provenance
  - links
  - numeric
---

# Solver Interfaces

## Purpose

Defines common interface expectations for HLS solvers.

A solver consumes resolved state and parameters, then produces pose intent. Solvers should be deterministic, debuggable, and independent where possible.

## Common Solver Inputs

- delta time
- CharacterInputState
- resolved locomotion state
- resolved parameters
- previous solver state
- debug settings

## Common Solver Outputs

- pose intent data
- contact data if relevant
- debug values
- warnings or constraint flags

## Solver State

Some solvers need persistent state:

- gait phase
- foot lock positions
- previous foot targets
- previous pelvis transform
- smoothed spine offsets
- previous arm swing values

Persistent state should be explicit and resettable.

## Determinism Rule

Given the same input state, parameters, and previous solver state, a solver should produce the same output.

## Error Handling

If input is invalid, solvers should degrade gracefully.

Examples:

- no ground trace: keep previous foot target for a short time
- invalid stair data: fall back to slope or flat ground
- IK overreach: clamp target and raise warning
- missing modifier: use neutral value

## Debug Requirements

Each solver should expose:

- input summary
- resolved parameters used
- output transforms or values
- clamped values
- active warnings

## Solver Contracts

GaitPhaseGenerator outputs phase and cadence.

FootTargetSolver outputs foot targets, contact states, and lock states.

PelvisSolver outputs pelvis transform and balance intent.

SpineSolver outputs torso, chest, neck, and head intent.

ArmSwingSolver outputs arm swing or carry restrictions.

PoseComposer outputs final pose intent and priority decisions.

## Runtime Interface Contract

```text
CharacterInputState + ResolvedParameters + PreviousSolverState
  -> Solver
  -> PoseIntent + DebugValues + WarningFlags
```

```text
SolverOutput must be valid before PoseComposer.
RuntimeConstraints must clamp invalid values before OutputPose.
```

## Rule Provenance

### Common solver inputs and outputs

| Field | Value |
|---|---|
| Rule | Solvers consume resolved state and parameters and output pose intent plus debug data. |
| Source card | [Procedural Animation Overview](../research/source-cards/procedural-animation-overview.md) |
| External link | https://dev.epicgames.com/documentation/en-us/unreal-engine/control-rig-in-unreal-engine |
| Source type | procedural animation architecture |
| Used from source | Procedural systems use controls, targets, and solver outputs that are later applied to a rig. |
| HLS transformation | Defined common input/output contract for all HLS solvers. |
| Confidence | high |
| Applies to | all solver documents |

### Persistent solver state must be explicit

| Field | Value |
|---|---|
| Rule | Persistent solver state must be explicit and resettable. |
| Source card | [Motion Matching](../research/source-cards/motion-matching.md), [LaFAN1](../research/source-cards/lafan1.md) |
| External link | https://github.com/ubisoft/ubisoft-laforge-animation-dataset |
| Source type | animation continuity and transition validation reference |
| Used from source | Temporal continuity and previous pose context matter for animation quality. |
| HLS transformation | Solver state includes gait phase, foot locks, smoothed offsets, and previous targets. Solver state reset is required for teleport, respawn, ragdoll recovery, and hard state reinitialization. |
| Confidence | high as implementation rule |
| Applies to | [Gait Phase Generator](../09-solvers/gait-phase-generator.md), [Foot Target Solver](../09-solvers/foot-target-solver.md), [Networking](./networking.md) |

### Debug and warning outputs

| Field | Value |
|---|---|
| Rule | Each solver exposes debug values and warnings. |
| Source card | [Procedural Animation Overview](../research/source-cards/procedural-animation-overview.md), [Research Provenance Methodology](../research/provenance-methodology.md) |
| External link | [Research Provenance Methodology](../research/provenance-methodology.md) |
| Source type | HLS methodology / implementation workflow |
| Used from source | Runtime rules and tuning values must be inspectable and traceable. |
| HLS transformation | Solver outputs include clamped values, warnings, and debug summaries. |
| Confidence | high |
| Applies to | [Debug Visualization](./debug-visualization.md), [Validation Methodology](../research/validation-methodology.md) |

### Graceful fallback

| Field | Value |
|---|---|
| Rule | Solvers degrade gracefully when inputs are invalid. |
| Source card | [IK Foot Placement](../research/source-cards/ik-foot-placement.md), [Stairs and Slopes](../research/source-cards/stairs-and-slopes.md) |
| External link | https://dev.epicgames.com/documentation/en-us/unreal-engine/full-body-ik-in-unreal-engine |
| Source type | IK / terrain implementation constraint |
| Used from source | Terrain traces, IK targets, and constraints can fail or become invalid at runtime. |
| HLS transformation | Added fallback rules for missing traces, invalid stairs, IK overreach, and missing modifiers. |
| Confidence | high |
| Applies to | [Runtime Constraints](./constraints.md), [Foot Target Solver](../09-solvers/foot-target-solver.md), [Pelvis Solver](../09-solvers/pelvis-solver.md) |

### Interface validity before composition

| Field | Value |
|---|---|
| Rule | Solver output must be valid before PoseComposer consumes it. |
| Source card | [Procedural Animation Overview](../research/source-cards/procedural-animation-overview.md), [IK Foot Placement](../research/source-cards/ik-foot-placement.md) |
| External link | https://dev.epicgames.com/documentation/en-us/unreal-engine/ik-rig-in-unreal-engine |
| Source type | procedural architecture / IK implementation constraint |
| Used from source | Procedural targets must remain valid before rig application. |
| HLS transformation | Solvers emit warning flags when output is clamped, stale, fallback-generated, or unsafe. PoseComposer and OutputPose must preserve those flags for debug and validation. |
| Confidence | high |
| Applies to | [Pose Composer](../09-solvers/pose-composer.md), [Output Pose](./output-pose.md), [Runtime Update Order](./update-order.md) |

## Numeric Data Separation

| Value | Category | Usage |
|---|---|---|
| solver interface fields | HLS architecture contract | implementation |
| warning thresholds | HLS tuning values | debug and validation |
| persistent state layout | implementation detail | C++ API / networking |
| solver validity flags | HLS implementation rule | PoseComposer and OutputPose |

## Open Questions

- Exact binary serialization format for solver state.
- Whether solver state should live in C++ component or AnimInstance.
- How to expose solver warnings in Unreal debug UI.
