---
id: source-card-normal-gait-overview
title: "Source Card: Normal Gait Overview"
status: draft
version: 26.530.1004
tags:
  - research
  - gait
  - walking
  - linked-source
  - links
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

## What it says

Normal walking is described as a repeated gait cycle divided into **stance** and **swing**. Stance is the foot-contact part of the cycle. Swing is the recovery and forward movement part of the cycle. Walking also includes double support.

## What HLS Used

- The stance / swing split as the base gait model.
- The approximate 60 / 40 stance-to-swing timing for normal walking.
- The concept of double support in walking.
- Clinical subphase names as readable runtime labels.

## What HLS Did Not Use

- Medical diagnosis logic.
- Patient-specific pathology interpretation.
- Exact clinical measurement workflow.
- Full clinical phase taxonomy as a required runtime model.

## Extracted HLS Facts

- Walking can be represented as a repeated normalized phase cycle.
- Stance is longer than swing in ordinary walking.
- Walking has double support.
- Opposite legs are offset in phase.

## Candidate HLS Rules

```text
WalkStanceRatio = 0.60
WalkSwingRatio = 0.40
RightLegPhase = (LeftLegPhase + 0.5) % 1.0
WalkingSupportMode includes double support
```

## Numeric Data

| Value | Meaning | Usage in HLS |
|---|---|---|
| ~60% | walking stance phase | default `WalkStanceRatio` |
| ~40% | walking swing phase | default `WalkSwingRatio` |

## HLS Transformation

Clinical gait descriptions are converted into a compact runtime phase model:

```text
clinical gait phase description
  -> normalized gaitPhase 0..1
  -> stance / swing ratio
  -> supportMode
  -> foot target state
```

## Uncertainty

The 60 / 40 split is a useful default, not a mandatory value for every character, speed, or style. HLS may tune it for stylized Level 3 motion.

## Used By

- [Gait Cycle](../../04-gait-cycle/index.md)
- [Walking](../../05-walking/index.md)
- [Gait Phase Generator](../../09-solvers/gait-phase-generator.md)
