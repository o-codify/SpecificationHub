---
id: solver-interfaces
title: Solver Interfaces
status: draft
version: 26.529.2149
tags:
  - runtime
  - solver
  - interfaces
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

## Open Questions

- Exact binary serialization format for solver state.
- Whether solver state should live in C++ component or AnimInstance.
- How to expose solver warnings in Unreal debug UI.
