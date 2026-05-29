---
id: turning-starting-and-stopping
title: Turning, Starting, and Stopping
status: draft
version: 26.529.2134
tags:
  - modifier
  - turning
  - start
  - stop
---

# Turning, Starting, and Stopping

## Purpose

Defines visual rules for starting, stopping, turning in place, turning while moving, pivot steps, sidestep, and backward walking.

These actions are not full physics. They are visual rules that make momentum and intention readable.

## Starting Rules

- Body leans slightly toward movement direction before full speed.
- First step may be shorter and more deliberate.
- Arms begin moving after lower body starts.
- Loaded characters start more slowly.
- Injured characters avoid starting from the painful side.

## Stopping Rules

- Torso compensates backward during deceleration.
- Step length shortens near stop.
- Foot targets should land under the body to regain support.
- Heavy load increases stopping stiffness.
- Running stop needs stronger torso compensation than walking stop.

## Turning While Walking

- Feet choose new targets in the turn direction.
- Pelvis begins turning before or with the feet.
- Chest and shoulders may lag behind pelvis.
- Head may look toward the target direction earlier than torso.
- Step width can widen slightly for stability.

## Turning In Place

- Use alternating pivot steps.
- Feet should not slide in place without visible support.
- Pelvis rotates in small increments.
- Torso follows with slight lag.

## Sidestep Rules

- Feet move laterally with shorter step length.
- Torso remains more upright than forward walking.
- Arms stabilize more than swing.

## Backward Walking Rules

- Shorter step length.
- Lower cadence.
- Reduced arm swing.
- More cautious foot placement.

## Parameters

- TurnRate
- TurnAnticipation
- TorsoLag
- StepWidthMultiplier
- StopLeanAmount
- StartLeanAmount
- PivotStepThreshold

## Open Questions

- How much lead-lag between head, chest, pelvis, and feet.
- Whether high-speed turning should use a separate banking rule.
- How to handle animation overlays for weapon aiming during turns.
