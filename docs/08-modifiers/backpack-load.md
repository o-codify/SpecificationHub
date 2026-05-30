---
id: backpack-load-modifier
title: Backpack Load Modifier
status: draft
version: 26.530.1058
tags:
  - modifier
  - load
  - backpack
  - provenance
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

## Rule Provenance

### Forward torso lean

Rule: rear backpack load increases forward torso lean.

Source type: load carriage and backpack gait biomechanics.

Used from source: rear load changes posture and commonly produces forward trunk compensation.

HLS transformation: converted posture change into TorsoPitchOffset controlled by LoadWeightNormalized.

Confidence: high for direction, medium for exact degree range.

Source cards: backpack-load-gait, load-carriage-posture.

### Step length reduction

Rule: heavier backpack load reduces step length.

Source type: load carriage gait studies.

Used from source: carried load changes gait parameters and walking economy.

HLS transformation: StepLengthMultiplier decreases as LoadWeightNormalized increases.

Confidence: medium.

Source cards: backpack-load-gait.

### Spine stiffness increase

Rule: heavy backpack load increases visual stiffness.

Source type: HLS inference from load carriage posture plus gameplay readability.

Used from source: load constrains posture and changes trunk behavior.

HLS transformation: added SpineStiffness parameter so the character looks braced under load.

Confidence: medium.

Source cards: backpack-load-gait, joint-kinematics-overview.

### Delayed sway for unstable load

Rule: loose load can add delayed sway.

Source type: HLS gameplay and animation inference.

Used from source: not a direct numeric biomechanical rule in first pass.

HLS transformation: LoadStability controls secondary sway as optional visual detail.

Confidence: low until tested.

Source cards: procedural-animation-overview.

## Numeric Data Separation

HLS tuning values:

- TorsoPitchOffset 0 to 10 degrees.
- StepLengthMultiplier 1.0 to 0.75.
- CadenceMultiplier 1.0 to 0.90.
- ArmSwingMultiplier 1.0 to 0.85.
- SpineStiffness 0.0 to 0.6.

These are gameplay tuning ranges, not cited scientific constants.

## Source Notes

Source cards: backpack-load-gait, load-carriage-posture, joint-kinematics-overview, procedural-animation-overview.
