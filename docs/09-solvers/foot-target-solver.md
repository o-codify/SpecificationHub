---
id: foot-target-solver
title: Foot Target Solver
status: draft
version: 26.529.2133
tags:
  - solver
  - feet
  - ik
---

# Foot Target Solver

## Purpose

Computes procedural foot targets for stance, swing, terrain adaptation, stairs, and modifiers.

The solver outputs intent. IK or Control Rig applies the final bones.

## Inputs

- gait cycle output
- velocity
- desired direction
- ground trace data
- slope or stairs data
- step length
- step width
- foot lift height
- injury and load modifiers

## Outputs

- left foot target transform
- right foot target transform
- contact state for each foot
- foot lock state for each foot

## Rules

- During stance, the foot target should remain locked unless terrain correction is required.
- During swing, the foot follows a lifted arc toward the next target.
- Step length scales with speed and modifiers.
- Step width should stay stable enough to avoid crossing feet.
- Slope increases foot clearance uphill.
- Stairs use discrete tread targets instead of continuous projection.
- Injury can reduce confidence and shorten step length.

## Runtime Notes

Foot locking is more important than exact anatomical motion. Visible foot sliding breaks believability faster than small phase errors.

## Open Questions

- How much stance correction is allowed before it looks like sliding.
- Whether foot roll should be solved here or in a separate foot-contact solver.
