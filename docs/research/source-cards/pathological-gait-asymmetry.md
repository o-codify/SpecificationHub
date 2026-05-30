---
id: source-card-pathological-gait-asymmetry
title: "Source Card: Pathological Gait Asymmetry"
status: draft
version: 26.530.1250
tags:
  - research
  - pathological-gait
  - asymmetry
  - linked-source
  - links
  - numeric
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
- Related clinical source card: [Antalgic Gait](./antalgic-gait.md)

## What it says

Many pathological gait patterns are visible through asymmetry: different stance times, step lengths, loading behavior, pelvis motion, and trunk compensation.

The source-backed relationship is asymmetry itself. HLS does not extract a universal numeric limp multiplier from this card because pathological gait depends on cause, severity, pain location, age, and compensation strategy.

## What HLS Used

- Asymmetry is the key visual language of limp and injury.
- Injury can affect timing, step length, pelvis compensation, and stiffness.
- Different injury locations may need different profiles later.
- Side-specific parameters are preferred over only reducing global speed.

## What HLS Did Not Use

- Medical diagnosis classification.
- Pathology-specific treatment rules.
- Exact patient-specific gait curves.
- A claim that one stance or step multiplier fits every pathology.

## Extracted HLS Facts

- Limp should not only slow the character down.
- Limp needs left-right differences.
- Stance time and step length are useful runtime parameters for injury.
- Pelvis and torso compensation make injury more readable.
- Generic injury is first-pass gameplay abstraction, not clinical modeling.

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

```text
AsymmetryIndexRuntime = abs(LeftMetric - RightMetric) / max((LeftMetric + RightMetric) * 0.5, epsilon)
Debug if AsymmetryIndexRuntime exceeds gameplay readability threshold
```

## Numeric Data

No universal clinical numeric runtime rule is extracted in this pass.

| Value | Meaning | Usage in HLS |
|---|---|---|
| left-right stance difference | source-backed relationship | side-specific stance modifier |
| left-right step-length difference | source-backed relationship | asymmetric step length |
| pelvis/trunk compensation | source-backed relationship | pelvis and spine bias |
| `InjuredStanceMultiplier = 1.0..0.55` | HLS tuning range | readable limp timing |
| `OppositeStepMultiplier = 1.0..0.75` | HLS tuning range | asymmetric step pattern |
| `PelvisRollBias = -6..6 deg` | HLS tuning range | compensation readability |
| `AsymmetryIndexRuntime` | HLS debug metric | validation/debug visualization |

HLS injury multipliers are gameplay tuning values and should not be treated as clinical constants.

## HLS Transformation

```text
pathological gait asymmetry
  -> side-specific stance changes
  -> asymmetric step length
  -> pelvis / torso compensation
  -> injury modifier
  -> asymmetry debug metric
```

## Uncertainty

- Need better primary papers for hip, knee, ankle, and foot injury profiles.
- Generic injury model is only a first pass.
- Numeric thresholds for debug asymmetry should be calibrated from animation review and, later, primary datasets.

## Used By

- [Injury and Limping Modifier](../../08-modifiers/injury-limping.md)
- [Gait Phase Generator](../../09-solvers/gait-phase-generator.md)
- [Pelvis Solver](../../09-solvers/pelvis-solver.md)
- [Modifier Stacking](../../10-runtime/modifier-stacking.md)
