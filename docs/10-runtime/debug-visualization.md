---
id: debug-visualization
title: Debug Visualization
status: draft
version: 26.530.1059
tags:
  - runtime
  - debug
  - visualization
  - provenance
  - links
---

# Debug Visualization

## Purpose

Defines required debug visualization for HLS runtime tuning.

Procedural locomotion cannot be tuned reliably without seeing phases, targets, contacts, parameters, and solver outputs.

## Required Debug Views

### Gait Debug

Show:

- gait phase
- left leg phase
- right leg phase
- cadence
- active gait type
- support mode

### Foot Debug

Show:

- left foot target
- right foot target
- current foot bone positions
- stance or swing state
- foot lock state
- ground trace hit point
- surface normal

### Pelvis Debug

Show:

- pelvis target transform
- pelvis vertical offset
- pelvis yaw, roll, and pitch bias
- pelvis smoothing amount
- IK reach warnings

### Spine Debug

Show:

- torso lean
- torso roll
- shoulder counter rotation
- spine stiffness
- head stabilization

### Modifier Debug

Show active modifiers:

- load
- injury
- fatigue
- slope
- stairs
- weapon carry
- front load
- asymmetric load

For each modifier, show raw value and final contribution after stacking.

### Runtime Debug

Show:

- locomotion state
- previous state
- transition time
- resolved parameter profile
- clamped values
- solver warnings

### Network Debug

Show:

- network role
- phase source
- last correction time
- smoothing alpha
- replicated locomotion state

## Rules

- Debug display must be toggleable by category.
- Debug should work in editor and PIE.
- Debug should expose both numbers and world-space drawings.
- Debug should not be required in shipping builds.

## Rule Provenance

### Debug is required for procedural tuning

| Field | Value |
|---|---|
| Rule | HLS solvers must expose debug values for tuning and validation. |
| Source card | [Procedural Animation Overview](../research/source-cards/procedural-animation-overview.md), [Unreal Engine Control Rig](../research/source-cards/unreal-engine-control-rig.md) |
| External link | https://dev.epicgames.com/documentation/en-us/unreal-engine/control-rig-in-unreal-engine |
| Source type | procedural animation / implementation workflow |
| Used from source | Procedural animation systems rely on visible controls, targets, and constraints for iteration. |
| HLS transformation | Added category-based debug for gait, feet, pelvis, spine, modifiers, runtime, and network. |
| Confidence | high |
| Applies to | all runtime solvers |

### Foot and IK debug

| Field | Value |
|---|---|
| Rule | Foot targets, foot lock state, ground traces, and IK warnings must be visible. |
| Source card | [IK Foot Placement](../research/source-cards/ik-foot-placement.md), [Unreal Engine IK Rig](../research/source-cards/unreal-engine-ik-rig.md) |
| External link | https://dev.epicgames.com/documentation/en-us/unreal-engine/ik-rig-in-unreal-engine |
| Source type | IK implementation constraint |
| Used from source | IK target solving requires inspectable targets, constraints, and reach limits. |
| HLS transformation | Foot Debug shows target positions, stance/swing state, foot lock, trace hit, normal, and reach warnings. |
| Confidence | high |
| Applies to | [Foot Target Solver](../09-solvers/foot-target-solver.md), [Pelvis Solver](../09-solvers/pelvis-solver.md), [Runtime Constraints](./constraints.md) |

### Modifier and clamp debug

| Field | Value |
|---|---|
| Rule | Active modifiers and clamped values must be visible. |
| Source card | [Research Provenance Methodology](../research/provenance-methodology.md), [Load Carriage Posture](../research/source-cards/load-carriage-posture.md), [Antalgic Gait](../research/source-cards/antalgic-gait.md) |
| External link | https://www.ncbi.nlm.nih.gov/books/NBK559243/ |
| Source type | provenance methodology / modifier validation |
| Used from source | HLS must distinguish source-backed facts, tuning values, and runtime clamps. |
| HLS transformation | Modifier Debug shows raw value, final contribution, and clamp warnings. |
| Confidence | high |
| Applies to | [Parameter System](./parameter-system.md), [Modifier Stacking](./modifier-stacking.md), [Validation Methodology](../research/validation-methodology.md) |

### Network debug

| Field | Value |
|---|---|
| Rule | Network role, phase source, correction time, and smoothing alpha must be visible for multiplayer debugging. |
| Source card | [LaFAN1](../research/source-cards/lafan1.md), [Motion Matching](../research/source-cards/motion-matching.md) |
| External link | https://github.com/ubisoft/ubisoft-laforge-animation-dataset |
| Source type | animation continuity / networking implementation constraint |
| Used from source | Temporal continuity and transition quality are critical for believable animation. |
| HLS transformation | Network Debug exposes phase source, correction timestamps, and smoothing alpha. |
| Confidence | medium-high |
| Applies to | [Networking](./networking.md), [Gait Phase Generator](../09-solvers/gait-phase-generator.md), [Runtime Constraints](./constraints.md) |

## Numeric Data Separation

| Value | Category | Usage |
|---|---|---|
| debug categories | HLS tooling contract | editor/debug implementation |
| warning thresholds | HLS tuning values | validation and runtime safety |
| smoothing alpha | HLS tuning value | network debug |

## Open Questions

- Exact Unreal debug draw implementation.
- Whether debug output should be available as CSV or telemetry.
- Which values should be shown in animation graph preview.
