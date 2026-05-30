---
id: source-card-motion-matching
title: "Source Card: Motion Matching"
status: draft
version: 26.530.1011
tags:
  - research
  - motion-matching
  - animation
  - linked-source
  - links
---

# Source Card: Motion Matching

## Metadata

| Field | Value |
|---|---|
| Title | Motion Matching for Character Animation |
| Type | Game animation technique / papers / talks |
| Reliability | Medium to high |
| Relevance | Medium |
| Access status | Public talks, papers, and engine documentation available |

## Links

- Ubisoft La Forge motion matching context: https://www.ubisoft.com/en-us/studio/laforge/news/6xXL85Q3bF2vEj76xmnmIu/lafan1-a-largescale-motion-dataset-for-animation
- Unreal Motion Matching documentation: https://dev.epicgames.com/documentation/en-us/unreal-engine/motion-matching-in-unreal-engine
- Unreal Pose Search documentation: https://dev.epicgames.com/documentation/en-us/unreal-engine/pose-search-in-unreal-engine

## What it says

Motion matching selects animation frames from a database based on current pose and desired trajectory. It can produce natural animation but depends on authored or captured motion data.

## What HLS Used

- Desired trajectory is a useful runtime control signal.
- Pose continuity is important for believable locomotion.
- Foot contact metadata is important for avoiding foot sliding.
- HLS can borrow trajectory and contact concepts without requiring a motion database.

## What HLS Did Not Use

- HLS does not require motion matching as the core runtime.
- HLS does not require a mocap database for every locomotion state.
- HLS does not use motion matching as a replacement for procedural solvers in first pass.

## Extracted HLS Facts

- Locomotion systems need trajectory intent.
- Contact continuity matters during transitions.
- Dataset-driven systems are useful references for validation.

## Candidate HLS Rules

```text
CharacterInputState should include desired trajectory or desired movement direction.
```

```text
PoseComposer should preserve pose and contact continuity across transitions.
```

## Numeric Data

No numeric runtime rule is extracted.

## HLS Transformation

```text
motion matching trajectory concept
  -> CharacterInputState desired direction / speed
  -> transition validation
  -> PoseComposer continuity rule
```

## Uncertainty

- Whether HLS should later support optional motion matching fallback.
- How to compare procedural output against motion matching quality.

## Used By

- [Character Input State](../../10-runtime/input-state.md)
- [Pose Composer](../../09-solvers/pose-composer.md)
- [Validation Methodology](../validation-methodology.md)
- [Unreal Engine](../../11-unreal-engine/index.md)
