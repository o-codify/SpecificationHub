---
id: source-card-mixamo-samples
title: "Source Card: Mixamo Samples"
status: draft
version: 26.530.1011
tags:
  - research
  - animation
  - reference
  - linked-source
  - links
---

# Source Card: Mixamo Samples

## Metadata

| Field | Value |
|---|---|
| Title | Mixamo Animation Samples |
| Type | Animation library / practical game animation reference |
| Reliability | Medium as game animation reference |
| Relevance | Medium |
| Access status | Accessible web service, terms must be checked |

## Links

- Mixamo: https://www.mixamo.com/
- Adobe terms entry point: https://www.adobe.com/legal/terms.html

## What it contains

Mixamo provides many humanoid animation clips that can be used as practical game-animation references. It is not a scientific dataset.

## What HLS Used

- Practical reference for how game animations communicate walk, run, turn, carry, and combat states.
- Quick comparison target for Level 2 to Level 3 visual quality.
- Potential Unreal test asset source if licensing permits.

## What HLS Did Not Use

- No scientific gait claims.
- No biomechanical numeric data.
- No mandatory runtime dependency.
- No assumption that animations are physically accurate.

## Extracted HLS Facts

- Game animation readability matters separately from scientific accuracy.
- HLS should be compared against practical game animation examples, not only mocap or papers.
- Authored clips can be used as visual references or overlays, but HLS remains procedural-first.

## Candidate HLS Rules

```text
Use Mixamo-like clips only as visual reference or optional test material, not as scientific evidence.
```

```text
If a procedural pose is less readable than a basic authored game animation, tune HLS parameters before adding more complexity.
```

## Numeric Data

No numeric runtime rule is extracted.

## License / Usage Notes

Check Adobe/Mixamo terms before using downloaded animations in training, redistribution, or commercial projects.

## Uncertainty

- Which clips are best for comparison.
- Whether Mixamo assets are allowed for the specific intended project use.

## Used By

- [Motion Datasets](../datasets.md)
- [Validation Methodology](../validation-methodology.md)
- [Unreal Engine](../../11-unreal-engine/index.md)
