---
id: pose-composer
title: Pose Composer
status: draft
version: 26.529.2133
tags:
  - solver
  - pose
  - runtime
---

# Pose Composer

## Purpose

Combines solver outputs into final pose intent before IK or FK application.

Pose Composer is the layer that prevents feet, pelvis, spine, arms, and modifiers from fighting each other.

## Inputs

- foot target output
- pelvis output
- spine output
- arm swing output
- modifier output
- locomotion state
- network role

## Outputs

- final pose intent
- IK targets
- FK offsets
- debug channels

## Rules

- Foot contact stability has high priority.
- Pelvis should support foot targets, not break them.
- Spine compensates pelvis and expresses state.
- Arms follow gait unless carry or weapon states override them.
- Modifiers change parameters before final composition where possible.
- Final pose must respect joint limits and gameplay readability.

## Priority Order

1. Ground contact and foot locking.
2. Pelvis height and balance.
3. Spine compensation and posture.
4. Arm swing or carry pose.
5. Secondary motion and cosmetic offsets.

## Runtime Rule

Pose Composer outputs intent. Control Rig or AnimBP applies the final skeletal solution.

## Open Questions

- Whether Pose Composer should run entirely in C++ or partly in Control Rig.
- How to expose debug views for each solver contribution.
