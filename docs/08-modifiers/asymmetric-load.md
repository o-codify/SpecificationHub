---
id: asymmetric-load-modifier
title: Asymmetric Load Modifier
status: draft
version: 26.529.2134
tags:
  - modifier
  - load
  - asymmetry
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

## Open Questions

- Whether one-hand carry should use hand IK as the primary constraint.
- How to combine asymmetric load with leg injury on the same side.
