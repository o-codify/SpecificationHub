---
id: source-card-pathological-gait-asymmetry
title: "Source Card: Pathological Gait Asymmetry"
status: draft
version: 26.529.2220
tags:
  - research
  - pathological-gait
  - asymmetry
  - linked-source
---

# Source Card: Pathological Gait Asymmetry

## Metadata

| Field | Value |
|---|---|
| Title | Pathological Gait Asymmetry |
| Type | Clinical gait research topic |
| Reliability | Medium |
| Relevance | High |
| Access status | Search links and overview sources; specific primary papers needed later |

## Links

- PubMed search: https://pubmed.ncbi.nlm.nih.gov/?term=pathological+gait+asymmetry+stance+time+step+length
- Google Scholar search: https://scholar.google.com/scholar?q=pathological+gait+asymmetry+stance+time+step+length
- Related clinical source card: `docs/research/source-cards/antalgic-gait.md`

## What it says

Many pathological gait patterns are visible through asymmetry: different stance times, step lengths, loading behavior, pelvis motion, and trunk compensation.

## What HLS Used

- Asymmetry is the key visual language of limp and injury.
- Injury can affect timing, step length, pelvis compensation, and stiffness.
- Different injury locations may need different profiles later.

## What HLS Did Not Use

- Medical diagnosis classification.
- Pathology-specific treatment rules.
- Exact patient-specific gait curves.

## Extracted HLS Facts

- Limp should not only slow the character down.
- Limp needs left-right differences.
- Stance time and step length are useful runtime parameters for injury.
- Pelvis and torso compensation make injury more readable.

## Candidate HLS Rules

```text
if LegPainSide == Left:
    LeftStanceRatio *= InjuredStanceMultiplier
    RightStepLength *= OppositeStepMultiplier
    SpineStiffness += InjuryStiffnessBias
```

```text
if LegPainSide == Right:
    RightStanceRatio *= InjuredStanceMultiplier
    LeftStepLength *= OppositeStepMultiplier
    SpineStiffness += InjuryStiffnessBias
```

## Numeric Data

No numeric runtime rule is extracted in this pass.

HLS injury multipliers are gameplay tuning values and should not be treated as clinical constants.

## HLS Transformation

```text
pathological gait asymmetry
  -> side-specific stance changes
  -> asymmetric step length
  -> pelvis / torso compensation
  -> injury modifier
```

## Uncertainty

- Need better primary papers for hip, knee, ankle, and foot injury profiles.
- Generic injury model is only a first pass.

## Used By

- `docs/08-modifiers/injury-limping.md`
- `docs/09-solvers/gait-phase-generator.md`
- `docs/09-solvers/pelvis-solver.md`
- `docs/10-runtime/modifier-stacking.md`
