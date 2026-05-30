---
id: backpack-load-modifier
title: Backpack Load Modifier
status: draft
version: 26.530.1231
tags:
  - modifier
  - load
  - backpack
  - provenance
  - numeric
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
- Severe load can downgrade run/sprint before extreme pose offsets are used.

## Parameters

- LoadWeightNormalized: 0..1.
- LoadStability: 0..1.
- TorsoPitchOffset: 0 to 15 degrees.
- StepLengthMultiplier: 1.0 to 0.70.
- CadenceMultiplier: 1.0 to 0.85.
- SpeedMultiplier: 1.0 to 0.70.
- ArmSwingMultiplier: 1.0 to 0.75.
- SpineStiffness: 0.0 to 0.7.
- LoadSwayAmplitude: 0.0 to 0.05 m.
- HeavyLoadThreshold: 0.65 to 0.80.

## Runtime Rule

As load increases, add forward torso pitch, reduce step length, slightly reduce cadence, reduce arm swing, and increase spine stiffness.

```text
Load = clamp(LoadWeightNormalized, 0, 1)
TorsoPitchOffsetDeg = lerp(0, 15, Load)
StepLengthMultiplier = lerp(1.0, 0.70, Load)
CadenceMultiplier = lerp(1.0, 0.85, Load)
SpeedMultiplier = lerp(1.0, 0.70, Load)
ArmSwingMultiplier = lerp(1.0, 0.75, Load)
SpineStiffness = lerp(0.0, 0.7, Load)
LoadSwayAmplitude = lerp(0.05, 0.0, LoadStability)

if Load >= 0.65..0.80:
    restrict sprint or downgrade to loaded run/walk
```

## Rule Provenance

### Forward torso lean

Rule: rear backpack load increases forward torso lean.

Source type: load carriage and backpack gait biomechanics.

Used from source: rear load changes posture and commonly produces forward trunk compensation.

HLS transformation: converted posture change into TorsoPitchOffset controlled by LoadWeightNormalized. First-pass tuning range is 0..15 degrees before global torso clamps.

Confidence: high for direction, medium for exact degree range.

Source cards: [Backpack Load Gait](../research/source-cards/backpack-load-gait.md), [Load Carriage Posture](../research/source-cards/load-carriage-posture.md).

### Step length reduction

Rule: heavier backpack load reduces step length.

Source type: load carriage gait studies.

Used from source: carried load changes gait parameters and walking economy.

HLS transformation: StepLengthMultiplier decreases as LoadWeightNormalized increases. First-pass range is 1.0..0.70, with severe load potentially downgrading locomotion state.

Confidence: medium.

Source cards: [Backpack Load Gait](../research/source-cards/backpack-load-gait.md).

### Spine stiffness increase

Rule: heavy backpack load increases visual stiffness.

Source type: HLS inference from load carriage posture plus gameplay readability.

Used from source: load constrains posture and changes trunk behavior.

HLS transformation: added SpineStiffness parameter so the character looks braced under load. First-pass range is 0.0..0.7 before global stiffness clamp.

Confidence: medium.

Source cards: [Backpack Load Gait](../research/source-cards/backpack-load-gait.md), [Joint Kinematics Overview](../research/source-cards/joint-kinematics-overview.md).

### Delayed sway for unstable load

Rule: loose load can add delayed sway.

Source type: HLS gameplay and animation inference.

Used from source: not a direct numeric biomechanical rule in first pass.

HLS transformation: LoadStability controls secondary sway as optional visual detail. First-pass sway amplitude is 0.0..0.05 m and must be disabled or reduced for network/LOD constraints.

Confidence: low until tested.

Source cards: [Procedural Animation Overview](../research/source-cards/procedural-animation-overview.md).

## Numeric Data Separation

HLS tuning values:

- TorsoPitchOffset 0 to 15 degrees.
- StepLengthMultiplier 1.0 to 0.70.
- CadenceMultiplier 1.0 to 0.85.
- SpeedMultiplier 1.0 to 0.70.
- ArmSwingMultiplier 1.0 to 0.75.
- SpineStiffness 0.0 to 0.7.
- LoadSwayAmplitude 0.0 to 0.05 m.
- HeavyLoadThreshold 0.65 to 0.80.

These are gameplay tuning ranges, not cited scientific constants.

## Source Notes

Source cards: [Backpack Load Gait](../research/source-cards/backpack-load-gait.md), [Load Carriage Posture](../research/source-cards/load-carriage-posture.md), [Joint Kinematics Overview](../research/source-cards/joint-kinematics-overview.md), [Procedural Animation Overview](../research/source-cards/procedural-animation-overview.md).
