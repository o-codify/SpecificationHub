---
id: source-card-load-carriage-posture
title: "Source Card: Load Carriage Posture"
status: draft
version: 26.530.1100
tags:
  - research
  - load
  - posture
  - linked-source
  - links
---

# Source Card: Load Carriage Posture

## Metadata

| Field | Value |
|---|---|
| Title | Load Carriage and Posture |
| Type | Biomechanics / ergonomics research topic |
| Reliability | Medium |
| Relevance | High |
| Access status | Search links and accessible abstracts; primary paper selection needed later |

## Links

- PubMed search: https://pubmed.ncbi.nlm.nih.gov/?term=load+carriage+posture+gait+trunk+lean
- Google Scholar search: https://scholar.google.com/scholar?q=load+carriage+posture+gait+trunk+lean
- Related dataset source card: [KIT Whole-Body](./kit-whole-body.md)

## What it says

Carrying load changes posture and gait. The effect depends on load position, load weight, stability, and how the object is held.

## What HLS Used

- Load position should control lean direction.
- Heavy load should reduce movement freedom.
- One-sided load should create lateral asymmetry.
- Front load and backpack load should have different posture rules.

## What HLS Did Not Use

- Ergonomic recommendations.
- Energy expenditure models.
- Exact military or occupational load carriage thresholds.

## Extracted HLS Facts

- Load is not just a speed penalty.
- Load should affect silhouette and gait parameters.
- Load position matters: back, front, left, right, hands.
- Load can restrict arms and spine differently depending on carry mode.

## Candidate HLS Rules

```text
if LoadPosition == Back:
    increase forward torso pitch
```

```text
if LoadPosition == Front:
    reduce arm swing
    increase spine stiffness
```

```text
if LoadPosition == Left or Right:
    add torso roll offset
    reduce loaded-side arm swing
```

## Numeric Data

No numeric runtime rule is extracted in this pass.

Load tuning values are stored in individual modifier documents.

## HLS Transformation

```text
load carriage posture concept
  -> LoadState
  -> load-position-specific modifiers
  -> posture and gait parameter changes
```

## Uncertainty

- Need primary papers for backpack, front load, and asymmetric load separately.
- Need playtesting to tune readable but not exaggerated posture.

## Used By

- [Posture](../../07-posture/index.md)
- [Backpack Load Modifier](../../08-modifiers/backpack-load.md)
- [Front Load Modifier](../../08-modifiers/front-load.md)
- [Asymmetric Load Modifier](../../08-modifiers/asymmetric-load.md)
- [Modifier Stacking](../../10-runtime/modifier-stacking.md)
