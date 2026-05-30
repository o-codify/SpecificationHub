---
id: source-card-backpack-load-gait
title: "Source Card: Backpack Load Gait"
status: draft
version: 26.530.1059
tags:
  - research
  - load
  - backpack
  - linked-source
  - links
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

## What it says

Backpack carriage changes posture and gait. Rear loads tend to produce forward trunk compensation, shorter or altered steps, and increased upper-body constraint.

## What HLS Used

- Backpack load increases forward torso lean.
- Heavier load can shorten step length.
- Load can reduce arm freedom and increase stiffness.
- Unstable load can be represented as optional secondary sway.

## What HLS Did Not Use

- Exact load carriage physiology.
- Military load carriage optimization.
- Medical recommendations for backpack use.
- Fixed scientific constants for every weight and character.

## Extracted HLS Facts

- Rear load affects posture.
- Load affects gait parameters.
- Load should be visible in silhouette, not only speed.

## Candidate HLS Rules

```text
if LoadPosition == Back:
    TorsoPitchOffset += f(LoadWeightNormalized)
    StepLength *= g(LoadWeightNormalized)
    SpineStiffness = max(SpineStiffness, h(LoadWeightNormalized))
```

## Numeric Data

No fixed numeric runtime values are extracted in this first pass.

HLS tuning values are stored in [Backpack Load Modifier](../../08-modifiers/backpack-load.md) and must be treated as gameplay defaults.

## HLS Transformation

```text
load carriage posture change
  -> forward torso pitch
  -> shorter step length
  -> increased spine stiffness
  -> backpack load modifier
```

## Uncertainty

- Exact values depend on load mass, body size, speed, pack position, and pack stability.
- Better primary papers should be selected in a later research pass.

## Used By

- [Posture](../../07-posture/index.md)
- [Backpack Load Modifier](../../08-modifiers/backpack-load.md)
- [Modifier Stacking](../../10-runtime/modifier-stacking.md)
