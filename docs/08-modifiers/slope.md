---
id: slope-modifier
title: Slope Modifier
status: draft
version: 26.529.2132
tags:
  - modifier
  - slope
  - terrain
---

# Slope Modifier

## Purpose

Defines how uphill and downhill terrain changes locomotion.

The goal is visual plausibility for games, not exact biomechanical simulation.

## Inputs

- slope angle
- movement direction
- ground normal
- speed
- gait type
- load state
- fatigue

## Outputs

- torso pitch offset
- pelvis pitch offset
- step length multiplier
- foot lift multiplier
- cadence multiplier
- downhill caution value

## Uphill Rules

- Increase forward torso lean.
- Reduce step length.
- Increase foot lift.
- Increase knee and hip flexion visually through foot target height.
- Reduce top speed.
- Heavy load exaggerates forward lean.

## Downhill Rules

- Add slight backward torso compensation.
- Reduce cadence or make steps more cautious.
- Reduce stride confidence at steep angles.
- Increase foot placement precision.
- Reduce speed when slope is steep.

## Suggested Parameters

- UphillTorsoLean: 0 to 12 degrees.
- DownhillTorsoLean: 0 to -6 degrees.
- UphillStepLengthMultiplier: 1.0 to 0.75.
- DownhillStepLengthMultiplier: 1.0 to 0.85.
- UphillFootLiftMultiplier: 1.0 to 1.5.
- SteepSlopeSpeedMultiplier: 1.0 to 0.6.

## Runtime Rule

Slope should modify posture and foot targets before IK. It should not be a separate animation state unless the slope is extreme.

## Open Questions

- Exact transition between level ground and slope rules.
- Whether downhill should bias heel-first or flat-foot placement.
- How to combine slope with stairs and uneven terrain.
