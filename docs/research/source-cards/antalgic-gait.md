---
id: source-card-antalgic-gait
title: "Source Card: Antalgic Gait"
status: draft
version: 26.529.2203
tags:
  - research
  - injury
  - limp
  - linked-source
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

## What it says

Antalgic gait is a pain-related gait pattern. The person changes gait to reduce loading and discomfort on the painful limb.

## What HLS Used

- Painful limb should spend less time in stance.
- Limp should be visible as asymmetry.
- Injury should reduce locomotion quality.
- Protective posture can be represented by stiffness and compensation.

## What HLS Did Not Use

- Diagnostic workflow.
- Disease-specific treatment information.
- Medical recommendations.
- Exact pathology classification.

## Extracted HLS Facts

- Painful leg has reduced loading time.
- Limping is visually readable through asymmetry.
- Speed and confidence can be reduced.
- Pelvis and torso can compensate away from painful loading.

## Candidate HLS Rules

```text
if LeftLegPain > 0:
    LeftStanceRatio *= InjuryStanceMultiplier
    Speed *= InjurySpeedMultiplier
    SpineStiffness += InjuryStiffnessBias
```

```text
if RightLegPain > 0:
    RightStanceRatio *= InjuryStanceMultiplier
    Speed *= InjurySpeedMultiplier
    SpineStiffness += InjuryStiffnessBias
```

## Numeric Data

No universal numeric multiplier is extracted from this source in first pass.

HLS tuning values are stored in `docs/08-modifiers/injury-limping.md` and should be treated as gameplay defaults, not clinical constants.

## HLS Transformation

```text
clinical pain-avoidance gait
  -> reduced stance time on painful side
  -> asymmetric step pattern
  -> lower speed
  -> protective stiffness
```

## Uncertainty

Hip, knee, ankle, and foot injuries can produce different patterns. First pass uses a generic injury modifier.

## Used By

- `docs/08-modifiers/injury-limping.md`
- `docs/09-solvers/gait-phase-generator.md`
- `docs/09-solvers/pelvis-solver.md`
- `docs/research/validation-methodology.md`
