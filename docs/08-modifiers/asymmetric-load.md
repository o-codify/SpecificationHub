---
id: asymmetric-load-modifier
title: Asymmetric Load Modifier
status: draft
version: 26.530.1058
tags:
  - modifier
  - load
  - asymmetry
  - provenance
  - links
---

# Asymmetric Load Modifier

## Purpose

Defines how one-sided load changes locomotion.

## Rules

- One-sided load creates lateral torso tilt.
- Pelvis may counter-tilt to preserve balance.
- Arm swing is reduced on the loaded side.
- Step width may increase slightly for stability.
- Step length can become asymmetric.
- Heavy asymmetric load reduces turn speed.

## Parameters

- LoadSide: left or right.
- LoadWeightNormalized: 0..1.
- TorsoRollOffset: 0 to 8 degrees.
- PelvisRollCompensation: 0 to 5 degrees.
- LoadedArmSwingMultiplier: 1.0 to 0.1.
- StepWidthMultiplier: 1.0 to 1.25.
- TurnSpeedMultiplier: 1.0 to 0.75.

## Runtime Rule

The loaded side should visually pull the torso while pelvis and step width compensate for balance.

## Rule Provenance

### Lateral torso tilt

| Field | Value |
|---|---|
| Rule | One-sided load creates lateral torso tilt. |
| Source card | [Load Carriage Posture](../research/source-cards/load-carriage-posture.md), [KIT Whole-Body](../research/source-cards/kit-whole-body.md) |
| External link | https://motion-database.humanoids.kit.edu/ |
| Source type | load carriage topic / whole-body dataset reference / HLS inference |
| Used from source | Load position affects posture and whole-body coordination. |
| HLS transformation | Added `TorsoRollOffset` and `PelvisRollCompensation` for left/right loads. |
| Confidence | medium |
| Applies to | [Posture](../07-posture/index.md), [Spine Solver](../09-solvers/spine-solver.md), [Pelvis Solver](../09-solvers/pelvis-solver.md) |

### Loaded-side arm restriction

| Field | Value |
|---|---|
| Rule | Loaded-side arm swing is reduced. |
| Source card | [Load Carriage Posture](../research/source-cards/load-carriage-posture.md) |
| External link | https://pubmed.ncbi.nlm.nih.gov/?term=load+carriage+posture+gait+trunk+lean |
| Source type | load carriage topic plus implementation inference |
| Used from source | Carrying load occupies or restricts body segments. |
| HLS transformation | Added `LoadedArmSwingMultiplier` and carry-side restriction. |
| Confidence | medium |
| Applies to | [Arm Swing Solver](../09-solvers/arm-swing-solver.md), [Pose Composer](../09-solvers/pose-composer.md) |

### Wider support for balance readability

| Field | Value |
|---|---|
| Rule | Step width can increase under heavy asymmetric load. |
| Source card | [Load Carriage Posture](../research/source-cards/load-carriage-posture.md) |
| External link | https://scholar.google.com/scholar?q=load+carriage+posture+gait+trunk+lean |
| Source type | HLS gameplay readability inference from load carriage |
| Used from source | Asymmetric load changes balance demands. |
| HLS transformation | Added `StepWidthMultiplier` as a tunable stability/readability parameter. |
| Confidence | low to medium |
| Applies to | [Foot Target Solver](../09-solvers/foot-target-solver.md), [Modifier Stacking](../10-runtime/modifier-stacking.md) |

## Numeric Data Separation

| Value | Category | Usage |
|---|---|---|
| one-sided load affects posture | source-backed relationship | enable asymmetric modifier |
| `TorsoRollOffset = 0..8 deg` | HLS tuning range | visual lean |
| `PelvisRollCompensation = 0..5 deg` | HLS tuning range | balance compensation |
| `StepWidthMultiplier = 1.0..1.25` | HLS tuning range | stability readability |

## Open Questions

- Whether one-hand carry should use hand IK as the primary constraint.
- How to combine asymmetric load with leg injury on the same side.
