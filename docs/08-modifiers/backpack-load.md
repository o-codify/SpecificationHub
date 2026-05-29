---
id: backpack-load-modifier
title: Backpack Load Modifier
status: draft
version: 26.529.2044
tags:
  - modifier
  - load
  - backpack
---

# Backpack Load Modifier

## Purpose

Defines how a backpack changes locomotion visually.

## Rules

- Back load increases forward torso lean.
- Heavy back load reduces step length.
- Heavy back load increases visual stiffness.
- Loose load adds small delayed sway.
- Backpack does not fully disable arm swing unless combined with weapon carry.

## Parameters

- LoadWeightNormalized: 0..1.
- LoadStability: 0..1.
- TorsoPitchOffset: 0 to 10 degrees.
- StepLengthMultiplier: 1.0 to 0.75.
- CadenceMultiplier: 1.0 to 0.90.
- ArmSwingMultiplier: 1.0 to 0.85.
- SpineStiffness: 0.0 to 0.6.

## Runtime Rule

As load increases, add forward torso pitch, reduce step length, slightly reduce cadence, reduce arm swing, and increase spine stiffness.

## Source Notes

Source cards: backpack-load-gait, load-carriage-posture.
