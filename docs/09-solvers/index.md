---
id: solvers
title: Solvers
status: draft
version: 26.529.2339
tags:
  - solvers
  - runtime
  - provenance
  - links
---

# Solvers

## Purpose

Maps the HLS solver layer and shows how solver documents connect to source-backed rules.

Solvers convert resolved locomotion state and parameters into pose intent.

## Solver Pipeline

```text
GaitPhaseGenerator
  -> FootTargetSolver
  -> PelvisSolver
  -> SpineSolver
  -> ArmSwingSolver
  -> PoseComposer
  -> IK/FK Output
```

## Solver Documents

| Solver | Document | Main responsibility | Provenance status |
|---|---|---|---|
| GaitPhaseGenerator | [Gait Phase Generator](./gait-phase-generator.md) | cadence, phase, stance/swing timing | upgraded |
| FootTargetSolver | [Foot Target Solver](./foot-target-solver.md) | foot targets, contact, lock state | upgraded |
| PelvisSolver | [Pelvis Solver](./pelvis-solver.md) | pelvis rhythm, weight carrier, IK reach | upgraded |
| SpineSolver | [Spine Solver](./spine-solver.md) | torso compensation, posture, stiffness | upgraded |
| ArmSwingSolver | [Arm Swing Solver](./arm-swing-solver.md) | arm swing, carry/weapon restrictions | upgraded |
| PoseComposer | [Pose Composer](./pose-composer.md) | priority, conflict resolution, final pose intent | upgraded |

## Shared Solver Principles

- Runtime owns intent.
- Animation applies pose.
- Solvers output intent, not final bones.
- ModifierResolver changes parameters before solvers where possible.
- PoseComposer resolves conflicts.
- IK/FK applies final skeletal result.

## Evidence Map

| Solver topic | Source cards |
|---|---|
| stance / swing / phase | [Normal Gait Overview](../research/source-cards/normal-gait-overview.md), [Running Biomechanics](../research/source-cards/running-biomechanics.md) |
| foot target and locking | [IK Foot Placement](../research/source-cards/ik-foot-placement.md), [Unreal Engine IK Rig](../research/source-cards/unreal-engine-ik-rig.md) |
| terrain foot placement | [Stairs and Slopes](../research/source-cards/stairs-and-slopes.md), [IK Foot Placement](../research/source-cards/ik-foot-placement.md) |
| pelvis rhythm | [Joint Kinematics Overview](../research/source-cards/joint-kinematics-overview.md), [Normal Gait Overview](../research/source-cards/normal-gait-overview.md) |
| load and posture | [Load Carriage Posture](../research/source-cards/load-carriage-posture.md), [Backpack Load Gait](../research/source-cards/backpack-load-gait.md), [KIT Whole-Body](../research/source-cards/kit-whole-body.md) |
| injury asymmetry | [Antalgic Gait](../research/source-cards/antalgic-gait.md), [Pathological Gait Asymmetry](../research/source-cards/pathological-gait-asymmetry.md) |
| arm swing | [Joint Kinematics Overview](../research/source-cards/joint-kinematics-overview.md), [Running Biomechanics](../research/source-cards/running-biomechanics.md) |
| phase continuity | [Motion Matching](../research/source-cards/motion-matching.md), [LaFAN1](../research/source-cards/lafan1.md) |
| pose composition | [Procedural Animation Overview](../research/source-cards/procedural-animation-overview.md), [Unreal Engine Control Rig](../research/source-cards/unreal-engine-control-rig.md), [Pose Warping](../research/source-cards/pose-warping.md) |

## Runtime Contract

Each solver should expose:

- inputs used;
- resolved parameters;
- output intent;
- clamp warnings;
- debug values;
- source-backed rules if the solver has non-trivial behavior.

## Current Status

All primary solver documents now include Markdown `Rule Provenance` tables that link solver rules to source cards and external links.
