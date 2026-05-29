---
id: source-card-cmu-motion-capture-database
title: "Source Card: CMU Motion Capture Database"
status: draft
version: 26.529.2214
tags:
  - research
  - dataset
  - mocap
  - linked-source
---

# Source Card: CMU Motion Capture Database

## Metadata

| Field | Value |
|---|---|
| Title | Carnegie Mellon University Motion Capture Database |
| Type | Motion capture dataset |
| Reliability | High as motion reference |
| Relevance | High |
| Access status | Accessible official dataset page |

## Links

- Official dataset page: http://mocap.cs.cmu.edu/
- Usage notes: http://mocap.cs.cmu.edu/usage.php

## What it contains

The CMU Motion Capture Database contains a broad collection of human motion capture clips, including walking, running, sports, gestures, and everyday actions.

## What HLS Used

- Dataset exists as a reference source for walking and running clips.
- Dataset can be used for validating generated cadence, stride timing, and transitions.
- Dataset supports the HLS principle that mocap is useful for validation but not required at runtime.

## What HLS Did Not Use

- No direct runtime dependency.
- No motion matching requirement.
- No assumption that all clips are clean enough for direct parameter extraction.

## Extracted HLS Facts

- Mocap datasets can provide practical reference clips for gait validation.
- Walking and running should be validated against real motion timing, not only eyeballed.
- HLS procedural output should be compared against datasets offline.

## Candidate HLS Rules

```text
HLS runtime must not require CMU mocap clips.
```

```text
Validation pass may compare generated gait phase, contact timing, and stride length against CMU reference clips.
```

## Numeric Data

No numeric HLS rule is extracted in this first pass.

## License / Usage Notes

The official CMU page should be checked before commercial use, redistribution, or training use. HLS treats CMU as a reference and validation dataset unless usage terms are reviewed.

## Uncertainty

- Which exact subjects and clips are best for normal walk, run, turns, stairs, load, and limp.
- Whether all clips have suitable marker quality for automated extraction.

## Used By

- `docs/research/datasets.md`
- `docs/research/validation-methodology.md`
- `docs/04-gait-cycle/index.md`
- `docs/05-walking/index.md`
- `docs/06-running/index.md`
