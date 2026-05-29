---
id: source-card-lafan1
title: "Source Card: LaFAN1"
status: draft
version: 26.529.2214
tags:
  - research
  - dataset
  - animation
  - linked-source
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

## What HLS Used

- Reference for transition validation.
- Reference for animation-quality continuity.
- Validation target for foot sliding and pose continuity.

## What HLS Did Not Use

- No direct runtime dependency.
- No requirement to train a neural model.
- No requirement to replace procedural solvers with learned animation.

## Extracted HLS Facts

- Transition quality is a measurable part of believable locomotion.
- Generated poses should be evaluated for temporal continuity.
- Foot sliding and discontinuities are validation targets.

## Candidate HLS Rules

```text
Validation should check transition continuity, not only steady-state walking.
```

```text
PoseComposer should preserve contact and phase continuity during state changes.
```

## Numeric Data

No numeric runtime rule is extracted in this first pass.

## License / Usage Notes

Check the repository license and dataset terms before training, redistribution, or commercial dataset use.

## Uncertainty

- Which sequences best represent walk-start, stop, turns, and carrying states.
- Whether HLS should include an automated comparison pipeline later.

## Used By

- `docs/research/datasets.md`
- `docs/research/validation-methodology.md`
- `docs/09-solvers/pose-composer.md`
- `docs/10-runtime/constraints.md`
