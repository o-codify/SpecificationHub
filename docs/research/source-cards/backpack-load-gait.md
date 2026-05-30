---
id: source-card-backpack-load-gait
title: "Source Card: Backpack Load Gait"
status: draft
version: 26.530.1355
tags:
  - research
  - load
  - backpack
  - linked-source
  - links
  - numeric
---

# Source Card: Backpack Load Gait

## Metadata

| Field | Value |
|---|---|
| Title | Backpack Load and Gait |
| Type | Load carriage biomechanics research topic |
| Reliability | Medium |
| Relevance | High |
| Access status | Accessible abstracts and papers vary by source |

## Links

- Review / search entry point: https://pubmed.ncbi.nlm.nih.gov/?term=backpack+load+gait+trunk+lean
- Example topic search: https://scholar.google.com/scholar?q=backpack+load+gait+trunk+lean+step+length
- Related source card: [Load Carriage Posture](./load-carriage-posture.md)

## What it says

Backpack carriage changes posture and gait. Rear loads tend to produce forward trunk compensation, shorter or altered steps, and increased upper-body constraint.

The source-backed relationship is directional: backpack load affects trunk posture, step parameters, arm freedom, and stiffness. HLS does not extract one universal numeric backpack rule because effects vary by load mass, pack position, pack stability, body size, walking speed, and terrain.

## What HLS Used

- Backpack load increases forward torso lean.
- Heavier load can shorten step length.
- Load can reduce arm freedom and increase stiffness.
- Unstable load can be represented as optional secondary sway.
- Severe backpack load can downgrade run/sprint before extreme lean is used.

## What HLS Did Not Use

- Exact load carriage physiology.
- Military load carriage optimization.
- Medical recommendations for backpack use.
- Fixed scientific constants for every weight and character.
- A direct mapping from real backpack kilograms to `LoadWeightNormalized`.

## Extracted HLS Facts

- Rear load affects posture.
- Load affects gait parameters.
- Load should be visible in silhouette, not only speed.
- Pack stability can be represented separately from pack weight.
- HLS backpack values are first-pass gameplay tuning, not clinical or ergonomic limits.

## Candidate HLS Rules

```text
if LoadPosition == Back:
    TorsoPitchOffset += f(LoadWeightNormalized)
    StepLength *= g(LoadWeightNormalized)
    Cadence *= c(LoadWeightNormalized)
    Speed *= s(LoadWeightNormalized)
    SpineStiffness = max(SpineStiffness, h(LoadWeightNormalized))
```

```text
LoadSwayAmplitude = lerp(0.05, 0.0, LoadStability)
if LoadWeightNormalized >= 0.65..0.80:
    restrict sprint or downgrade to loaded run/walk
```

## Numeric Data

No fixed numeric runtime values are extracted in this first pass.

| Value | Meaning | Usage in HLS |
|---|---|---|
| rear load changes trunk posture | source-backed relationship | forward torso pitch |
| backpack load changes gait parameters | source-backed relationship | step/cadence/speed modifiers |
| pack stability affects motion quality | HLS gameplay abstraction from carry behavior | optional delayed sway |
| `TorsoPitchOffset = 0..15 deg` | HLS tuning range | readable backpack lean |
| `StepLengthMultiplier = 1.0..0.70` | HLS tuning range | shorter loaded steps |
| `CadenceMultiplier = 1.0..0.85` | HLS tuning range | loaded rhythm penalty |
| `SpeedMultiplier = 1.0..0.70` | HLS tuning range | loaded locomotion penalty |
| `ArmSwingMultiplier = 1.0..0.75` | HLS tuning range | partial arm restriction |
| `SpineStiffness = 0.0..0.7` | HLS tuning range | braced load posture |
| `LoadSwayAmplitude = 0.0..0.05 m` | HLS tuning range | unstable pack secondary motion |
| `HeavyLoadThreshold = 0.65..0.80` | HLS tuning range | state downgrade trigger |

HLS tuning values are stored in [Backpack Load Modifier](../../08-modifiers/backpack-load.md) and must be treated as gameplay defaults.

## HLS Transformation

```text
load carriage posture change
  -> forward torso pitch
  -> shorter step length
  -> lower speed/cadence
  -> increased spine stiffness
  -> optional load sway from stability
  -> backpack load modifier
```

## Uncertainty

- Exact values depend on load mass, body size, speed, pack position, and pack stability.
- Better primary papers should be selected in a later research pass.
- A future pass should define how real mass maps into `LoadWeightNormalized` per character scale.

## Used By

- [Posture](../../07-posture/index.md)
- [Backpack Load Modifier](../../08-modifiers/backpack-load.md)
- [Modifier Stacking](../../10-runtime/modifier-stacking.md)
