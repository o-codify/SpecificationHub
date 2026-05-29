---
id: source-cards-index
title: Source Cards Index
status: draft
version: 26.529.2043
tags:
  - research
  - sources
  - index
---

# Source Cards Index

This index maps research sources to HLS implementation topics.

## Topic Map

| Topic | Source cards | HLS target docs |
|---|---|---|
| Normal gait | normal-gait-overview, gait-cycle-clinical, joint-kinematics-overview | docs/04-gait-cycle, docs/05-walking |
| Running | running-biomechanics | docs/06-running |
| Starting, stopping, turning | gait-transitions-turning | docs/05-walking, docs/09-solvers |
| Backpack and load | backpack-load-gait, load-carriage-posture | docs/07-posture, docs/08-modifiers/backpack-load.md |
| Injury and limping | antalgic-gait, pathological-gait-asymmetry | docs/08-modifiers/injury-limping.md |
| Slopes and stairs | stairs-and-slopes | docs/08-modifiers/slope.md, docs/08-modifiers/stairs.md |
| Procedural animation | procedural-animation-overview, ik-foot-placement, motion-matching, pose-warping | docs/09-solvers, docs/10-runtime, docs/11-unreal-engine |
| Datasets | cmu-mocap, amass, lafan1, kit-whole-body, human36m | docs/research/datasets.md |

## First Pass Source Cards

- normal-gait-overview.md
- gait-cycle-clinical.md
- joint-kinematics-overview.md
- running-biomechanics.md
- gait-transitions-turning.md
- backpack-load-gait.md
- load-carriage-posture.md
- antalgic-gait.md
- pathological-gait-asymmetry.md
- stairs-and-slopes.md
- procedural-animation-overview.md
- ik-foot-placement.md
- motion-matching.md
- pose-warping.md
- cmu-mocap.md
- amass.md
- human36m.md
- kit-whole-body.md
- lafan1.md
- mixamo-samples.md

## Rule Extraction Principle

A source is useful only if it supports a rule like:

```text
if condition:
    change parameter
    alter phase
    alter pose
    alter solver output
```

Sources that only describe anatomy without runtime consequences are background, not core HLS evidence.
