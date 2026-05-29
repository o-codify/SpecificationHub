---
id: debug-visualization
title: Debug Visualization
status: draft
version: 26.529.2149
tags:
  - runtime
  - debug
  - visualization
---

# Debug Visualization

## Purpose

Defines required debug visualization for HLS runtime tuning.

Procedural locomotion cannot be tuned reliably without seeing phases, targets, contacts, parameters, and solver outputs.

## Required Debug Views

## Gait Debug

Show:

- gait phase
- left leg phase
- right leg phase
- cadence
- active gait type
- support mode

## Foot Debug

Show:

- left foot target
- right foot target
- current foot bone positions
- stance or swing state
- foot lock state
- ground trace hit point
- surface normal

## Pelvis Debug

Show:

- pelvis target transform
- pelvis vertical offset
- pelvis yaw, roll, and pitch bias
- pelvis smoothing amount
- IK reach warnings

## Spine Debug

Show:

- torso lean
- torso roll
- shoulder counter rotation
- spine stiffness
- head stabilization

## Modifier Debug

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

## Runtime Debug

Show:

- locomotion state
- previous state
- transition time
- resolved parameter profile
- clamped values
- solver warnings

## Network Debug

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

## Open Questions

- Exact Unreal debug draw implementation.
- Whether debug output should be available as CSV or telemetry.
- Which values should be shown in animation graph preview.
