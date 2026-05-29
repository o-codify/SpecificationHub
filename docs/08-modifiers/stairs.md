---
id: stairs-modifier
title: Stairs Modifier
status: draft
version: 26.529.2133
tags:
  - modifier
  - stairs
  - terrain
---

# Stairs Modifier

## Purpose

Defines procedural locomotion rules for stair ascent and descent.

Stairs are not treated as ordinary slopes. They require discrete foot targets and step-height-aware pelvis motion.

## Inputs

- detected stair step height
- detected stair step depth
- movement direction
- speed
- gait phase
- load state
- injury state

## Outputs

- left foot target on next stair surface
- right foot target on next stair surface
- pelvis height offset
- torso pitch offset
- cadence multiplier
- safety or caution value

## Stair Ascent Rules

- Foot targets snap to stair treads, not slope projection.
- Foot lift increases with step height.
- Pelvis height rises in discrete but smoothed increments.
- Torso leans forward.
- Step length is constrained by tread depth.
- Heavy load reduces speed and increases forward lean.

## Stair Descent Rules

- Foot placement becomes more cautious.
- Pelvis lowers in discrete but smoothed increments.
- Torso may lean slightly back or remain braced.
- Cadence decreases with steepness and injury.
- Foot target should prefer stable tread center.

## Parameters

- StepHeight
- StepDepth
- FootClearance
- PelvisStepHeightSmoothing
- StairCadenceMultiplier
- StairSpeedMultiplier
- StairTorsoPitch

## Runtime Rule

When stairs are detected, FootTargetSolver should switch from continuous ground projection to discrete tread selection. PelvisSolver should follow stair height with smoothing.

## Open Questions

- Whether stairs need a separate gait phase mode.
- How to support partial foot placement on narrow treads.
- How to prevent foot target popping when entering or leaving stairs.
