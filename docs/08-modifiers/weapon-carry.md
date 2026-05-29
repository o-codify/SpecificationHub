---
id: weapon-carry-modifier
title: Weapon Carry Modifier
status: draft
version: 26.529.2141
tags:
  - modifier
  - weapon
  - carry
---

# Weapon Carry Modifier

## Purpose

Defines how weapon carry changes locomotion.

## Rules

- Weapon carry reduces normal arm swing.
- Two-hand weapon carry stabilizes the upper body.
- Aiming reduces torso counter-rotation.
- Heavy weapon carry shortens step length.
- Heavy weapon carry increases spine stiffness.
- Sprinting with weapon should either lower the weapon or heavily restrict aim.

## Parameters

- WeaponWeightNormalized: 0..1.
- AimState: relaxed, ready, aiming.
- ArmSwingMultiplier: 1.0 to 0.0.
- SpineStiffness: 0.0 to 0.8.
- StepLengthMultiplier: 1.0 to 0.8.
- TorsoCounterRotationMultiplier: 1.0 to 0.2.
- AimStability: 0..1.

## Runtime Rule

Weapon pose has higher priority than normal arm swing. Lower body locomotion continues, but upper body becomes more constrained as weapon readiness increases.

## Open Questions

- How to blend weapon aim offsets with procedural spine compensation.
- How much arm swing can remain during low-ready movement.
