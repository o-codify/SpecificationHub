---
id: source-card-amass
title: "Source Card: AMASS"
status: draft
version: 26.529.2203
tags:
  - research
  - dataset
  - mocap
  - linked-source
---

# Source Card: AMASS

## Metadata

| Field | Value |
|---|---|
| Title | AMASS: Archive of Motion Capture as Surface Shapes |
| Type | Dataset / paper |
| Reliability | High |
| Relevance | High |
| Access status | Official dataset page and paper available |

## Links

- Official dataset page: https://amass.is.tue.mpg.de/
- Paper: https://arxiv.org/abs/1904.03278

## What it contains

AMASS is a large unified human motion collection. It converts many marker-based motion capture datasets into a common human body representation.

## What HLS Used

- Broad human motion diversity for validation planning.
- Whole-body coordination reference.
- Walking, running, transition, and posture reference.
- Dataset policy: HLS can use datasets for analysis and validation without requiring them at runtime.

## What HLS Did Not Use

- AMASS is not required as a runtime dependency.
- HLS does not require motion matching over AMASS.
- HLS does not assume AMASS license terms apply uniformly to all underlying datasets.

## Extracted HLS Facts

- Large motion datasets are useful for validating generated gait statistics.
- Whole-body motion data can help tune pelvis, spine, and arm coordination.
- Dataset-backed validation should be separate from runtime procedural generation.

## Candidate HLS Rules

```text
if validationMode == DatasetReference:
    compare generated cadence, support timing, pelvis rhythm, and arm opposition against reference clips
```

```text
HLS runtime must not depend on AMASS being present.
```

## Numeric Data

No numeric gait rule is directly extracted in this first pass.

## License / Usage Notes

AMASS combines many datasets. Underlying datasets may have different licenses. Verify terms before training, redistribution, or commercial use.

## Uncertainty

- Which underlying subsets are best for walking, running, load, injury, stairs, and transitions.
- Whether specific subsets allow training use.

## Used By

- `docs/research/datasets.md`
- `docs/research/validation-methodology.md`
- `docs/03-joints/index.md`
- `docs/05-walking/index.md`
- `docs/06-running/index.md`
