---
id: source-card-lafan1
title: "Source Card: LaFAN1"
status: draft
version: 26.530.1301
tags:
  - research
  - dataset
  - animation
  - linked-source
  - links
  - numeric
---

# Source Card: LaFAN1

## Metadata

| Field | Value |
|---|---|
| Title | LaFAN1 Animation Dataset |
| Type | Animation / motion dataset |
| Reliability | High as animation reference |
| Relevance | High for transitions |
| Access status | Accessible project and repository pages |

## Links

- Project page: https://www.ubisoft.com/en-us/studio/laforge/news/6xXL85Q3bF2vEj76xmnmIu/lafan1-a-largescale-motion-dataset-for-animation
- GitHub: https://github.com/ubisoft/ubisoft-laforge-animation-dataset
- Paper: https://arxiv.org/abs/2107.07402

## What it contains

LaFAN1 is a motion dataset created for animation research, especially motion prediction and transition quality. It contains human motion sequences in animation-friendly formats.

The source-backed relationship is validation-oriented: animation quality depends on temporal continuity, transition quality, and plausible contacts. HLS uses the dataset as a reference category, not as a mandatory runtime dependency.

## What HLS Used

- Reference for transition validation.
- Reference for animation-quality continuity.
- Validation target for foot sliding and pose continuity.
- Dataset-style thinking for comparing generated motion over time, not only frame-by-frame pose.

## What HLS Did Not Use

- No direct runtime dependency.
- No requirement to train a neural model.
- No requirement to replace procedural solvers with learned animation.
- No redistribution or training assumption without checking dataset terms.

## Extracted HLS Facts

- Transition quality is a measurable part of believable locomotion.
- Generated poses should be evaluated for temporal continuity.
- Foot sliding and discontinuities are validation targets.
- Validation should include sequences across start, stop, turns, and state changes, not only steady walking.

## Candidate HLS Rules

```text
Validation should check transition continuity, not only steady-state walking.
```

```text
PoseComposer should preserve contact and phase continuity during state changes.
```

```text
TransitionWindow = 0.20..0.60 s
PosePopMetric = max joint-space or marker-space delta across transition frames
FootSlideMetric = stance foot displacement while contact == true
PhaseContinuityMetric = circular gait phase error before/after transition
```

## Numeric Data

No numeric runtime rule is extracted in this first pass.

| Value | Meaning | Usage in HLS |
|---|---|---|
| temporal continuity matters | dataset-backed validation relationship | transition validation |
| foot sliding is visible error | animation validation relationship | stance contact checks |
| transition quality matters | dataset-backed relationship | start/stop/turn validation |
| `TransitionWindow = 0.20..0.60 s` | HLS validation tuning range | measure transition continuity |
| `FootSlideMetric` | HLS validation metric | stance foot displacement during contact |
| `PosePopMetric` | HLS validation metric | abrupt pose delta detection |
| `PhaseContinuityMetric` | HLS validation metric | phase correction and transition checks |

## License / Usage Notes

Check the repository license and dataset terms before training, redistribution, or commercial dataset use.

## Uncertainty

- Which sequences best represent walk-start, stop, turns, and carrying states.
- Whether HLS should include an automated comparison pipeline later.
- Dataset-derived thresholds should be calibrated before being promoted to stable numeric rules.

## Used By

- [Motion Datasets](../datasets.md)
- [Validation Methodology](../validation-methodology.md)
- [Pose Composer](../../09-solvers/pose-composer.md)
- [Runtime Constraints](../../10-runtime/constraints.md)
