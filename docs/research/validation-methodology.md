---
id: validation-methodology
title: Validation Methodology
status: draft
version: 26.529.2150
tags:
  - research
  - validation
  - testing
---

# Validation Methodology

## Purpose

Defines how to validate HLS procedural locomotion.

Validation does not mean proving perfect biomechanical realism. It means checking whether generated motion reaches Level 3 Alive Game Motion and remains stable in runtime.

## Visual Validation

Check whether players can read state from motion:

- normal walking looks human enough
- running is not just sped-up walking
- backpack visibly changes posture
- injury visibly creates limp and asymmetry
- slope changes lean and foot lift
- stairs use believable discrete foot placement
- weapon carry restricts arm swing
- stopping and turning show intention

## Technical Validation

Check runtime stability:

- foot sliding is limited
- gait phase does not pop
- IK does not overextend
- pelvis does not jitter
- modifiers do not exceed safety clamps
- network smoothing does not create violent pose pops

## Dataset Validation

Use datasets as reference, not runtime dependency.

Compare generated motion against reference clips for:

- cadence range
- stance and swing timing
- pelvis vertical rhythm
- arm and leg opposition
- running flight behavior
- transition plausibility

## Gameplay Validation

Check whether state is readable during play:

- player can see heavy load
- player can see injury severity
- player can see uphill or downhill effort
- player can see weapon readiness
- player can see stop, start, and turn intent

## Debug Validation

Each solver should expose debug values. Testers should be able to inspect phase, targets, locks, parameters, active modifiers, and clamped values.

## Pass Criteria

Research pass validation is acceptable when a developer can implement a prototype and tune it using documented parameters without inventing the architecture from scratch.

## Open Questions

- Exact numeric thresholds for foot sliding.
- Whether automated tests should compare generated poses to mocap statistics.
- How to define Level 3 acceptance in playtests.
