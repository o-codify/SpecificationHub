---
id: source-card-load-carriage-posture
title: "Source Card: Load Carriage Posture"
status: draft
version: 26.530.1353
tags:
  - research
  - load
  - posture
  - linked-source
  - links
  - numeric
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

The source-backed relationship is directional: load changes posture, gait, balance strategy, arm availability, and movement economy. HLS does not extract one universal numeric load threshold from this card because load effects depend heavily on mass, placement, body size, task, and equipment.

## What HLS Used

- Load position should control lean direction.
- Heavy load should reduce movement freedom.
- One-sided load should create lateral asymmetry.
- Front load and backpack load should have different posture rules.
- Load should influence step length, cadence, speed, arm freedom, spine stiffness, and turning.

## What HLS Did Not Use

- Ergonomic recommendations.
- Energy expenditure models.
- Exact military or occupational load carriage thresholds.
- A claim that one load percentage maps to all characters and carry styles.

## Extracted HLS Facts

- Load is not just a speed penalty.
- Load should affect silhouette and gait parameters.
- Load position matters: back, front, left, right, hands.
- Load can restrict arms and spine differently depending on carry mode.
- A normalized `LoadWeightNormalized` value is an HLS gameplay abstraction, not a direct biomechanics metric.

## Candidate HLS Rules

```text
if LoadPosition == Back:
    increase forward torso pitch
    reduce step length and speed
    increase spine stiffness
```

```text
if LoadPosition == Front:
    reduce arm swing strongly
    increase spine stiffness
    reduce step length, speed, and turn speed
```

```text
if LoadPosition == Left or Right:
    add torso roll offset
    add pelvis counter-roll
    reduce loaded-side arm swing
    increase step width for readability
```

## Numeric Data

No universal numeric runtime rule is extracted in this pass.

| Value | Meaning | Usage in HLS |
|---|---|---|
| load changes posture | source-backed relationship | posture modifiers |
| load position matters | source-backed relationship | back/front/asymmetric profiles |
| load can restrict arms | source-backed relationship | arm freedom and carry priority |
| `LoadWeightNormalized = 0..1` | HLS gameplay abstraction | modifier input |
| `BackpackTorsoPitch = 0..15 deg` | HLS tuning range | backpack load modifier |
| `FrontLoadArmSwingMultiplier = 1.0..0.10` | HLS tuning range | front load modifier |
| `AsymmetricTorsoRoll = 0..10 deg` | HLS tuning range | asymmetric load modifier |
| `StepLengthMultiplier ≈ 1.0..0.65/0.70` | HLS tuning range | load slowdown/readability |
| `TurnSpeedMultiplier ≈ 1.0..0.60/0.70` | HLS tuning range | loaded turning |

Load tuning values are stored in individual modifier documents.

## HLS Transformation

```text
load carriage posture concept
  -> LoadState
  -> load-position-specific modifiers
  -> posture and gait parameter changes
  -> safety clamps and possible locomotion downgrade
```

## Uncertainty

- Need primary papers for backpack, front load, and asymmetric load separately.
- Need playtesting to tune readable but not exaggerated posture.
- Need body-size and skeleton-scale calibration for load thresholds.

## Used By

- [Posture](../../07-posture/index.md)
- [Backpack Load Modifier](../../08-modifiers/backpack-load.md)
- [Front Load Modifier](../../08-modifiers/front-load.md)
- [Asymmetric Load Modifier](../../08-modifiers/asymmetric-load.md)
- [Modifier Stacking](../../10-runtime/modifier-stacking.md)
