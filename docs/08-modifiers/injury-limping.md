---
id: injury-and-limping-modifier
title: Injury and Limping Modifier
status: draft
version: 26.530.1058
tags:
  - modifier
  - injury
  - limp
  - asymmetry
  - provenance
---

# Injury and Limping Modifier

## Purpose

Defines how leg injury changes gait.

The goal is not medical diagnosis. The goal is visible cause and effect: injured leg means the character protects that leg.

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

## Rule Provenance

### Reduced stance time on painful limb

Rule: injured or painful limb gets reduced stance time.

Source type: clinical antalgic gait reference.

Used from source: antalgic gait is commonly described as reducing time spent loading the painful limb.

HLS transformation: LeftLegPain or RightLegPain reduces stance ratio on that side.

Confidence: high for direction, medium for exact multiplier.

Source cards: antalgic-gait, pathological-gait-asymmetry.

### Reduced speed

Rule: injury reduces locomotion speed.

Source type: clinical gait observation plus gameplay readability.

Used from source: painful gait reduces normal walking quality and loading confidence.

HLS transformation: InjurySeverity applies SpeedMultiplier.

Confidence: medium.

Source cards: antalgic-gait.

### Increased stiffness

Rule: injury increases torso and spine stiffness.

Source type: HLS inference from protective posture and game readability.

Used from source: protective gait implies reduced freedom and guarded movement.

HLS transformation: InjurySeverity increases TorsoStiffness and reduces motion amplitude.

Confidence: medium to low until playtested.

Source cards: antalgic-gait, joint-kinematics-overview.

### Asymmetric step length

Rule: injury creates asymmetric step timing and step length.

Source type: pathological gait and antalgic gait references.

Used from source: limping is visually defined by asymmetry and reduced loading of one side.

HLS transformation: injured side and opposite side receive different stance and step multipliers.

Confidence: medium.

Source cards: antalgic-gait, pathological-gait-asymmetry.

## Numeric Data Separation

HLS tuning values:

- InjuredStanceMultiplier 1.0 to 0.55.
- OppositeStepMultiplier 1.0 to 0.75.
- SpeedMultiplier 1.0 to 0.45.
- TorsoStiffness 0.0 to 0.8.

These are gameplay tuning ranges, not clinical constants.

## Source Notes

Source cards: antalgic-gait, pathological-gait-asymmetry, joint-kinematics-overview.

## Open Questions

- Hip, knee, ankle, and foot injuries should later receive separate visual profiles.
- Extreme limp must not break IK or foot locking.
