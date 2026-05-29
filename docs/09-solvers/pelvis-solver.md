---
id: pelvis-solver
title: Pelvis Solver
status: draft
version: 26.529.2045
tags:
  - solver
  - pelvis
  - gait
---

# Pelvis Solver

## Purpose

Computes pelvis transform from gait phase, feet, speed, and modifiers.

The pelvis is the main visual carrier of weight in HLS.

## Inputs

- gait cycle output
- left foot target
- right foot target
- speed
- ground normal
- locomotion modifiers

## Outputs

- pelvis transform
- pelvis velocity
- debug weight side

## Rules

- Pelvis has vertical oscillation.
- Pelvis yaw follows leg advancement.
- Pelvis roll shifts toward the stance side.
- Load and injury may bias pelvis pitch or roll.
- Pelvis motion must be smoothed.
- Pelvis must not cause foot sliding.

## Parameters

- PelvisVerticalAmplitude
- PelvisYawAmplitude
- PelvisRollAmplitude
- PelvisPitchBias
- PelvisHeightOffset
- PelvisSmoothing

## Runtime Rule

Use gait phase to create vertical motion, stance side to create subtle roll, leg advancement to create yaw, and modifiers to add persistent pitch or roll bias.

## Open Questions

- Should pelvis height be solved from foot contacts or phase first.
- How much pelvis motion should be preserved on simulated network proxies.
