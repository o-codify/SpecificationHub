---
id: solvers
title: Solvers
status: draft
version: 26.529.2238
tags:
  - solvers
  - runtime
  - provenance
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
| GaitPhaseGenerator | `docs/09-solvers/gait-phase-generator.md` | cadence, phase, stance/swing timing | upgraded |
| FootTargetSolver | `docs/09-solvers/foot-target-solver.md` | foot targets, contact, lock state | upgraded |
| PelvisSolver | `docs/09-solvers/pelvis-solver.md` | pelvis rhythm, weight carrier, IK reach | upgraded |
| SpineSolver | `docs/09-solvers/spine-solver.md` | torso compensation, posture, stiffness | upgraded |
| ArmSwingSolver | `docs/09-solvers/arm-swing-solver.md` | arm swing, carry/weapon restrictions | upgraded |
| PoseComposer | `docs/09-solvers/pose-composer.md` | priority, conflict resolution, final pose intent | upgraded |

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
| stance / swing / phase | `normal-gait-overview.md`, `running-biomechanics.md` |
| foot target and locking | `ik-foot-placement.md`, `unreal-engine-ik-rig.md` |
| terrain foot placement | `stairs-and-slopes.md`, `ik-foot-placement.md` |
| pelvis rhythm | `joint-kinematics-overview.md`, `normal-gait-overview.md` |
| load and posture | `load-carriage-posture.md`, `backpack-load-gait.md`, `kit-whole-body.md` |
| injury asymmetry | `antalgic-gait.md`, `pathological-gait-asymmetry.md` |
| arm swing | `joint-kinematics-overview.md`, `running-biomechanics.md` |
| phase continuity | `motion-matching.md`, `lafan1.md` |
| pose composition | `procedural-animation-overview.md`, `unreal-engine-control-rig.md`, `pose-warping.md` |

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
