---
id: gait-phase-generator
title: Gait Phase Generator
status: draft
version: 26.529.2045
tags:
  - solver
  - gait
  - phase
---

# Gait Phase Generator

## Purpose

Generates stable normalized gait phase for walking and running.

This is the rhythm source for feet, pelvis, spine, and arms.

## Inputs

- deltaTime
- speed
- desiredSpeed
- gaitType
- modifiers

## Outputs

- gaitPhase: 0..1
- cadence
- leftLegPhase
- rightLegPhase

## Rules

- Phase is normalized from 0 to 1.
- Phase speed is driven by cadence.
- Cadence increases with movement speed.
- Left and right legs are offset by 0.5.
- Modifiers may change cadence but should not break phase continuity.
- Network smoothing must not reset phase abruptly.

## Runtime Rule

Each update advances phase by cadence times deltaTime, wraps it into 0..1, and derives leg phases from it.

## Implementation Notes

Phase continuity is more important than exact biomechanical timing. A small timing error is less visible than a phase pop.
