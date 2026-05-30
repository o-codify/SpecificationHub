---
id: source-card-motion-matching
title: "Source Card: Motion Matching"
status: draft
version: 26.530.1355
tags:
  - research
  - motion-matching
  - animation
  - linked-source
  - links
  - numeric
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

The source-backed implementation relationship is that pose continuity, trajectory intent, and contact metadata matter for believable transitions. HLS uses those ideas without requiring motion matching as the primary runtime.

## What HLS Used

- Desired trajectory is a useful runtime control signal.
- Pose continuity is important for believable locomotion.
- Foot contact metadata is important for avoiding foot sliding.
- HLS can borrow trajectory and contact concepts without requiring a motion database.
- Transition quality should be evaluated by contact continuity, phase continuity, and pose pop severity.

## What HLS Did Not Use

- HLS does not require motion matching as the core runtime.
- HLS does not require a mocap database for every locomotion state.
- HLS does not use motion matching as a replacement for procedural solvers in first pass.
- HLS does not treat database frame selection as the only valid animation architecture.

## Extracted HLS Facts

- Locomotion systems need trajectory intent.
- Contact continuity matters during transitions.
- Dataset-driven systems are useful references for validation.
- Phase correction should prefer gradual warping over abrupt reset unless teleporting.
- Foot contact errors are more visible than small timing errors.

## Candidate HLS Rules

```text
CharacterInputState should include desired trajectory or desired movement direction.
```

```text
PoseComposer should preserve pose and contact continuity across transitions.
```

```text
PhaseCorrectionTime = 0.10..0.30 s
PoseSmoothingTime = 0.08..0.20 s
MinimumStateTime = 0.15..0.35 s
FootLockPriority > TransitionBlendPriority
```

## Numeric Data

No numeric runtime rule is extracted directly from motion matching references in this pass.

| Value | Meaning | Usage in HLS |
|---|---|---|
| trajectory intent matters | implementation relationship | CharacterInputState desired direction/speed |
| contact continuity matters | implementation relationship | foot lock and transition validation |
| pose continuity matters | implementation relationship | PoseComposer and networking smoothing |
| `PhaseCorrectionTime = 0.10..0.30 s` | HLS tuning range | remote phase / transition correction |
| `PoseSmoothingTime = 0.08..0.20 s` | HLS tuning range | avoid pose pops |
| `MinimumStateTime = 0.15..0.35 s` | HLS tuning range | avoid state flicker |
| `FootLockPriority > TransitionBlendPriority` | HLS implementation rule | preserve stance contacts |

## HLS Transformation

```text
motion matching trajectory concept
  -> CharacterInputState desired direction / speed
  -> transition validation
  -> PoseComposer continuity rule
  -> networking phase correction rule
```

## Uncertainty

- Whether HLS should later support optional motion matching fallback.
- How to compare procedural output against motion matching quality.
- Exact continuity thresholds should be calibrated with animation review and, later, datasets.

## Used By

- [Character Input State](../../10-runtime/input-state.md)
- [Pose Composer](../../09-solvers/pose-composer.md)
- [Validation Methodology](../validation-methodology.md)
- [Unreal Engine](../../11-unreal-engine/index.md)
