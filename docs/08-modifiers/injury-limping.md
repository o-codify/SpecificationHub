---
id: injury-and-limping-modifier
title: Injury and Limping Modifier
status: draft
version: 26.530.1229
tags:
  - modifier
  - injury
  - limp
  - asymmetry
  - provenance
  - numeric
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
- Severe injury can downgrade run to walk or limp before extreme solver values are used.

## Parameters

- LeftLegPain: 0..1.
- RightLegPain: 0..1.
- InjurySeverity: 0..1.
- InjuredStanceMultiplier: 1.0 to 0.55.
- OppositeStepMultiplier: 1.0 to 0.75.
- SpeedMultiplier: 1.0 to 0.45.
- CadenceMultiplier: 1.0 to 0.70.
- StepLengthMultiplier: 1.0 to 0.65.
- TorsoStiffness: 0.0 to 0.8.
- InjuryStiffnessBias: 0.0 to 0.5.
- PelvisRollBias: -6 to 6 degrees.

## Runtime Rule

The painful leg spends less time as the support leg. The whole walk becomes slower, more asymmetric, and more rigid.

```text
PainSide = max(LeftLegPain, RightLegPain)
InjurySeverity = clamp(max(LeftLegPain, RightLegPain), 0, 1)
InjuredStanceMultiplier = lerp(1.0, 0.55, InjurySeverity)
OppositeStepMultiplier = lerp(1.0, 0.75, InjurySeverity)
SpeedMultiplier = lerp(1.0, 0.45, InjurySeverity)
CadenceMultiplier = lerp(1.0, 0.70, InjurySeverity)
StepLengthMultiplier = lerp(1.0, 0.65, InjurySeverity)
InjuryStiffnessBias = lerp(0.0, 0.5, InjurySeverity)

if InjurySeverity >= 0.65..0.80:
    restrict run or downgrade to injured walk
```

## Rule Provenance

### Reduced stance time on painful limb

Rule: injured or painful limb gets reduced stance time.

Source type: clinical antalgic gait reference.

Used from source: antalgic gait is commonly described as reducing time spent loading the painful limb.

HLS transformation: LeftLegPain or RightLegPain reduces stance ratio on that side. First-pass multiplier range is 1.0..0.55 and is treated as gameplay tuning, not a clinical constant.

Confidence: high for direction, medium for exact multiplier.

Source cards: [Antalgic Gait](../research/source-cards/antalgic-gait.md), [Pathological Gait Asymmetry](../research/source-cards/pathological-gait-asymmetry.md).

### Reduced speed

Rule: injury reduces locomotion speed.

Source type: clinical gait observation plus gameplay readability.

Used from source: painful gait reduces normal walking quality and loading confidence.

HLS transformation: InjurySeverity applies SpeedMultiplier and CadenceMultiplier. First-pass ranges are SpeedMultiplier 1.0..0.45 and CadenceMultiplier 1.0..0.70.

Confidence: medium.

Source cards: [Antalgic Gait](../research/source-cards/antalgic-gait.md).

### Increased stiffness

Rule: injury increases torso and spine stiffness.

Source type: HLS inference from protective posture and game readability.

Used from source: protective gait implies reduced freedom and guarded movement.

HLS transformation: InjurySeverity increases TorsoStiffness and reduces motion amplitude. First-pass InjuryStiffnessBias is 0.0..0.5 and TorsoStiffness can rise toward 0.8.

Confidence: medium to low until playtested.

Source cards: [Antalgic Gait](../research/source-cards/antalgic-gait.md), [Joint Kinematics Overview](../research/source-cards/joint-kinematics-overview.md).

### Asymmetric step length

Rule: injury creates asymmetric step timing and step length.

Source type: pathological gait and antalgic gait references.

Used from source: limping is visually defined by asymmetry and reduced loading of one side.

HLS transformation: injured side and opposite side receive different stance and step multipliers. First-pass opposite step multiplier is 1.0..0.75 and global step length multiplier is 1.0..0.65.

Confidence: medium.

Source cards: [Antalgic Gait](../research/source-cards/antalgic-gait.md), [Pathological Gait Asymmetry](../research/source-cards/pathological-gait-asymmetry.md).

## Numeric Data Separation

HLS tuning values:

- InjuredStanceMultiplier 1.0 to 0.55.
- OppositeStepMultiplier 1.0 to 0.75.
- SpeedMultiplier 1.0 to 0.45.
- CadenceMultiplier 1.0 to 0.70.
- StepLengthMultiplier 1.0 to 0.65.
- TorsoStiffness 0.0 to 0.8.
- InjuryStiffnessBias 0.0 to 0.5.
- PelvisRollBias -6 to 6 degrees.
- SevereInjuryThreshold 0.65 to 0.80.

These are gameplay tuning ranges, not clinical constants.

## Source Notes

Source cards: [Antalgic Gait](../research/source-cards/antalgic-gait.md), [Pathological Gait Asymmetry](../research/source-cards/pathological-gait-asymmetry.md), [Joint Kinematics Overview](../research/source-cards/joint-kinematics-overview.md).

## Open Questions

- Hip, knee, ankle, and foot injuries should later receive separate visual profiles.
- Extreme limp must not break IK or foot locking.
