---
id: source-card-normal-gait-overview
title: "Source Card: Normal Gait Overview"
status: draft
version: 26.530.1245
tags:
  - research
  - gait
  - walking
  - linked-source
  - links
  - numeric
---

# Source Card: Normal Gait Overview

## Metadata

| Field | Value |
|---|---|
| Title | Normal Gait / The Gait Cycle |
| Type | Clinical / educational overview |
| Reliability | Medium |
| Relevance | High |
| Access status | Accessible web pages |

## Links

- Physiopedia: https://www.physio-pedia.com/The_Gait_Cycle
- TeachMeAnatomy: https://teachmeanatomy.info/lower-limb/misc/gait-cycle/
- StatPearls / NCBI Bookshelf gait reference: https://www.ncbi.nlm.nih.gov/books/NBK559243/

## What it says

Normal walking is described as a repeated gait cycle divided into **stance** and **swing**. Stance is the foot-contact part of the cycle. Swing is the recovery and forward movement part of the cycle. Walking also includes double support.

The source-backed relationship is the structure of walking: stance, swing, alternating limbs, and double support. The exact numeric values are population-, speed-, and measurement-dependent, so HLS treats them as defaults or reference ranges rather than immutable constants.

## What HLS Used

- The stance / swing split as the base gait model.
- The approximate 60 / 40 stance-to-swing timing for normal walking.
- The concept of double support in walking.
- Clinical subphase names as readable runtime labels.
- Walking speed and cadence only as scale sanity checks, not strict character requirements.

## What HLS Did Not Use

- Medical diagnosis logic.
- Patient-specific pathology interpretation.
- Exact clinical measurement workflow.
- Full clinical phase taxonomy as a required runtime model.
- Claims that one cadence, step length, or double-support value fits all characters.

## Extracted HLS Facts

- Walking can be represented as a repeated normalized phase cycle.
- Stance is longer than swing in ordinary walking.
- Walking has double support.
- Opposite legs are offset in phase.
- Comfortable adult walking is commonly near 1.2..1.4 m/s as a broad scale check.
- Ordinary walking cadence for first-pass HLS tuning can start around 100..120 steps/minute.

## Candidate HLS Rules

```text
WalkStanceRatio = 0.60
WalkSwingRatio = 0.40
WalkStanceClamp = 0.58..0.62
DoubleSupportReference = 0.20..0.24 of gait cycle
ComfortableWalkSpeedReference = 1.2..1.4 m/s
WalkCadenceReference = 100..120 steps/minute
RightLegPhase = (LeftLegPhase + 0.5) % 1.0
WalkingSupportMode includes double support
```

## Numeric Data

| Value | Meaning | Usage in HLS |
|---|---|---|
| ~60% | walking stance phase | source-backed default for `WalkStanceRatio` |
| ~40% | walking swing phase | source-backed default for `WalkSwingRatio` |
| 0.58..0.62 | ordinary walking stance clamp | HLS tuning around the 60% source default |
| ~20..24% | double support reference range | HLS support blending / foot lock reference |
| ~1.2..1.4 m/s | comfortable adult walking speed scale | sanity check for character movement tuning |
| 100..120 steps/minute | first-pass comfortable walk cadence | HLS tuning range, not a universal clinical constant |

## HLS Transformation

Clinical gait descriptions are converted into a compact runtime phase model:

```text
clinical gait phase description
  -> normalized gaitPhase 0..1
  -> stance / swing ratio
  -> supportMode
  -> foot target state
  -> cadence / speed sanity checks
```

## Uncertainty

The 60 / 40 split is a useful default, not a mandatory value for every character, speed, or style. HLS may tune it for stylized Level 3 motion.

Comfortable walking speed, cadence, and double-support ranges vary by measurement method, age, body size, terrain, and task. HLS uses them as broad sanity checks and labels gameplay-only values separately.

## Used By

- [Gait Cycle](../../04-gait-cycle/index.md)
- [Walking](../../05-walking/index.md)
- [Gait Phase Generator](../../09-solvers/gait-phase-generator.md)
