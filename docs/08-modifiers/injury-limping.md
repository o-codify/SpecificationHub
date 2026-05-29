---
id: injury-and-limping-modifier
title: Injury and Limping Modifier
status: draft
version: 26.529.2045
tags:
  - modifier
  - injury
  - limp
  - asymmetry
---

# Injury and Limping Modifier

## Purpose

Defines how leg injury changes gait.

## Rules

- Injured limb gets reduced stance time.
- Character avoids loading the injured side.
- Step length becomes asymmetric.
- Pelvis and torso compensate.
- Overall speed drops.
- Higher severity increases stiffness.

## Parameters

- LeftLegPain: 0..1.
- RightLegPain: 0..1.
- InjurySeverity: 0..1.
- InjuredStanceMultiplier: 1.0 to 0.55.
- OppositeStepMultiplier: 1.0 to 0.75.
- SpeedMultiplier: 1.0 to 0.45.
- TorsoStiffness: 0.0 to 0.8.

## Runtime Rule

The painful leg spends less time as the support leg. The whole walk becomes slower, more asymmetric, and more rigid.

## Source Notes

Source cards: antalgic-gait, pathological-gait-asymmetry.
