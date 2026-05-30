---
id: source-card-gait-transitions-and-turning
title: "Source Card: Gait Transitions and Turning"
status: draft
version: 26.530.1059
tags:
  - research
  - turning
  - transitions
  - linked-source
  - links
---

# Source Card: Gait Transitions and Turning

## Metadata

| Field | Value |
|---|---|
| Title | Gait Transitions and Turning |
| Type | Locomotion research / game animation topic |
| Reliability | Medium |
| Relevance | High |
| Access status | Accessible search and reference sources; primary paper set still needs refinement |

## Links

- PubMed search: https://pubmed.ncbi.nlm.nih.gov/?term=gait+initiation+turning+walking+biomechanics
- Google Scholar search: https://scholar.google.com/scholar?q=gait+initiation+turning+walking+biomechanics
- Unreal Pose Warping reference: https://dev.epicgames.com/documentation/en-us/unreal-engine/pose-warping-in-unreal-engine
- Unreal Motion Matching reference: https://dev.epicgames.com/documentation/en-us/unreal-engine/motion-matching-in-unreal-engine

## What it says

Starting, stopping, and turning are transitional locomotion states. They require anticipation, support changes, body segment coordination, and contact continuity.

## What HLS Used

- Start should include anticipatory body lean toward movement.
- Stop should include deceleration compensation.
- Turning should not rotate the whole body as one rigid block.
- Feet must visibly support turns and pivots.
- Pose continuity matters during transition states.

## What HLS Did Not Use

- Exact laboratory force-plate timing.
- Medical fall-risk analysis.
- Complete predictive control model.
- Motion matching as a required runtime solution.

## Extracted HLS Facts

- Start, stop, and turn need explicit transition rules.
- Head, torso, pelvis, and feet can lead or lag each other.
- Foot contact stability remains important during transitions.
- State resolver should distinguish start/stop/turn from steady walking.

## Candidate HLS Rules

```text
if state == Start:
    add temporary lean toward movement direction
    use short first step
```

```text
if state == Stop:
    shorten step length
    add backward torso compensation
```

```text
if state == TurnInPlace:
    use pivot steps instead of sliding feet
```

## Numeric Data

No numeric runtime rule is extracted in this pass.

HLS values for start lean, stop lean, torso lag, and pivot thresholds are tuning values.

## HLS Transformation

```text
transition locomotion concept
  -> start / stop / turn states
  -> torso lead-lag rules
  -> foot target pivot rules
  -> PoseComposer continuity constraints
```

## Uncertainty

- Exact timing for head, chest, pelvis, and foot lead-lag.
- Primary scientific papers should be selected in a later pass.
- Weapon aiming during turning needs additional implementation constraints.

## Used By

- [Turning, Starting, and Stopping](../../08-modifiers/turning-start-stop.md)
- [Foot Target Solver](../../09-solvers/foot-target-solver.md)
- [Spine Solver](../../09-solvers/spine-solver.md)
- [Pose Composer](../../09-solvers/pose-composer.md)
- [Locomotion State Resolver](../../10-runtime/locomotion-state-resolver.md)
