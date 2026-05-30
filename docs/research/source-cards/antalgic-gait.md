---
id: source-card-antalgic-gait
title: "Source Card: Antalgic Gait"
status: draft
version: 26.530.1354
tags:
  - research
  - injury
  - limp
  - linked-source
  - links
  - numeric
---

# Source Card: Antalgic Gait

## Metadata

| Field | Value |
|---|---|
| Title | Antalgic Gait in Adults |
| Type | Clinical reference |
| Reliability | High |
| Relevance | High |
| Access status | Accessible NCBI Bookshelf page |

## Links

- NCBI Bookshelf: https://www.ncbi.nlm.nih.gov/books/NBK559243/
- PubMed search anchor: https://pubmed.ncbi.nlm.nih.gov/?term=antalgic+gait+stance+time+painful+limb

## What it says

Antalgic gait is a pain-related gait pattern. The person changes gait to reduce loading and discomfort on the painful limb.

The source-backed relationship is directional: pain leads to protective gait behavior and reduced loading time on the painful side. HLS does not claim that one numeric multiplier applies clinically to all injuries.

## What HLS Used

- Painful limb should spend less time in stance.
- Limp should be visible as asymmetry.
- Injury should reduce locomotion quality.
- Protective posture can be represented by stiffness and compensation.
- Severe normalized injury can downgrade run to injured walk or limp before extreme solver values are used.

## What HLS Did Not Use

- Diagnostic workflow.
- Disease-specific treatment information.
- Medical recommendations.
- Exact pathology classification.
- Universal clinical stance, speed, or step-length multipliers.

## Extracted HLS Facts

- Painful leg has reduced loading time.
- Limping is visually readable through asymmetry.
- Speed and confidence can be reduced.
- Pelvis and torso can compensate away from painful loading.
- HLS injury severity is normalized gameplay state, not a medical severity score.

## Candidate HLS Rules

```text
if LeftLegPain > 0:
    LeftStanceRatio *= InjuryStanceMultiplier
    Speed *= InjurySpeedMultiplier
    Cadence *= InjuryCadenceMultiplier
    SpineStiffness += InjuryStiffnessBias
```

```text
if RightLegPain > 0:
    RightStanceRatio *= InjuryStanceMultiplier
    Speed *= InjurySpeedMultiplier
    Cadence *= InjuryCadenceMultiplier
    SpineStiffness += InjuryStiffnessBias
```

```text
InjurySeverity = max(LeftLegPain, RightLegPain)
if InjurySeverity >= 0.65..0.80:
    restrict run or downgrade to injured walk
```

## Numeric Data

No universal numeric multiplier is extracted from this source in first pass.

| Value | Meaning | Usage in HLS |
|---|---|---|
| reduced painful-limb loading time | source-backed relationship | reduce injured-side stance |
| visible asymmetry | source-backed relationship | side-specific stance and step multipliers |
| `InjuredStanceMultiplier = 1.0..0.55` | HLS tuning range | gameplay limp readability |
| `SpeedMultiplier = 1.0..0.45` | HLS tuning range | injury slowdown |
| `CadenceMultiplier = 1.0..0.70` | HLS tuning range | guarded rhythm |
| `StepLengthMultiplier = 1.0..0.65` | HLS tuning range | shortened injured gait |
| `InjuryStiffnessBias = 0.0..0.5` | HLS tuning range | protective stiffness |
| `SevereInjuryThreshold = 0.65..0.80` | HLS tuning range | state downgrade trigger |

HLS tuning values are stored in [Injury and Limping Modifier](../../08-modifiers/injury-limping.md) and should be treated as gameplay defaults, not clinical constants.

## HLS Transformation

```text
clinical pain-avoidance gait
  -> reduced stance time on painful side
  -> asymmetric step pattern
  -> lower speed and cadence
  -> protective stiffness
  -> possible locomotion downgrade
```

## Uncertainty

Hip, knee, ankle, and foot injuries can produce different patterns. First pass uses a generic injury modifier.

Primary-source extraction is still needed for injury-location-specific stance-time and step-length changes.

## Used By

- [Injury and Limping Modifier](../../08-modifiers/injury-limping.md)
- [Gait Phase Generator](../../09-solvers/gait-phase-generator.md)
- [Pelvis Solver](../../09-solvers/pelvis-solver.md)
- [Validation Methodology](../validation-methodology.md)
