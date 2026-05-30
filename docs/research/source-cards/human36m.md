---
id: source-card-human3-6m
title: "Source Card: Human3.6M"
status: draft
version: 26.530.1059
tags:
  - research
  - dataset
  - pose
  - linked-source
  - links
---

# Source Card: Human3.6M

## Metadata

| Field | Value |
|---|---|
| Title | Human3.6M |
| Type | Human pose and motion dataset |
| Reliability | High as pose reference |
| Relevance | Medium |
| Access status | Accessible official dataset page, usage terms must be checked |

## Links

- Official dataset page: http://vision.imar.ro/human3.6m/description.php
- Dataset access / license page: http://vision.imar.ro/human3.6m/eula.php

## What it contains

Human3.6M is a large human pose dataset used widely for 3D human pose estimation and motion analysis.

## What HLS Used

- Reference for joint pose and human motion structure.
- Possible validation source for joint-level output.
- Dataset example for separating research validation from runtime dependency.

## What HLS Did Not Use

- No direct runtime dependency.
- No assumption that Human3.6M is ideal for game locomotion clips.
- No training use without reviewing dataset terms.

## Extracted HLS Facts

- Pose datasets can support joint-level validation.
- HLS should separate skeleton/joint validation from locomotion feel validation.

## Candidate HLS Rules

```text
Validation may compare generated joint ranges against pose datasets.
```

```text
Human3.6M is a reference dataset, not a required runtime asset.
```

## Numeric Data

No numeric runtime rule is extracted in this first pass.

## License / Usage Notes

Human3.6M has dataset access terms. Review the official EULA before using it for training, redistribution, or commercial work.

## Uncertainty

- Whether its action set sufficiently covers game locomotion needs.
- Whether it is useful for load, injury, stairs, or weapon-carry validation.

## Used By

- [Motion Datasets](../datasets.md)
- [Joints](../../03-joints/index.md)
- [Validation Methodology](../validation-methodology.md)
