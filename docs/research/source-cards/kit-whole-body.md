---
id: source-card-kit-whole-body-human-motion-database
title: "Source Card: KIT Whole-Body Human Motion Database"
status: draft
version: 26.530.1059
tags:
  - research
  - dataset
  - whole-body
  - linked-source
  - links
---

# Source Card: KIT Whole-Body Human Motion Database

## Metadata

| Field | Value |
|---|---|
| Title | KIT Whole-Body Human Motion Database |
| Type | Whole-body human motion dataset |
| Reliability | High as motion reference |
| Relevance | Medium to high |
| Access status | Accessible official database page, account or request may be required |

## Links

- Official database page: https://motion-database.humanoids.kit.edu/
- KIT H2T project page: https://h2t.iar.kit.edu/english/545.php

## What it contains

The KIT Whole-Body Human Motion Database contains captured and processed whole-body human motions. It is useful for studying coordination between locomotion, posture, and object interaction.

## What HLS Used

- Reference for whole-body coordination.
- Reference for carrying and action-context motion.
- Dataset example for validating posture and object interaction rules.

## What HLS Did Not Use

- No direct runtime dependency.
- No assumption that all motions map directly to game locomotion.
- No license assumption without checking database terms.

## Extracted HLS Facts

- Whole-body datasets are useful for posture, carrying, and interaction validation.
- Locomotion should not be solved as legs only.
- Object interaction can affect torso, arms, pelvis, and gait parameters.

## Candidate HLS Rules

```text
if CarryState != None:
    restrict arm freedom
    adjust torso posture
    modify step length and turn speed
```

```text
Validation should include whole-body coordination, not only foot placement.
```

## Numeric Data

No numeric runtime rule is extracted in this first pass.

## License / Usage Notes

Check official database access terms before training, redistribution, or commercial use.

## Uncertainty

- Which motions are best for backpack, front load, asymmetric load, and weapon-like carrying.
- Whether the dataset can be used for automated tuning or only reference.

## Used By

- [Motion Datasets](../datasets.md)
- [Posture](../../07-posture/index.md)
- [Front Load Modifier](../../08-modifiers/front-load.md)
- [Asymmetric Load Modifier](../../08-modifiers/asymmetric-load.md)
- [Validation Methodology](../validation-methodology.md)
