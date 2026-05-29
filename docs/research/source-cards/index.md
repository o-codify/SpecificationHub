---
id: source-cards-index
title: Source Cards Index
status: draft
version: 26.529.2221
tags:
  - research
  - sources
  - index
  - markdown-standard
---

# Source Cards Index

## Purpose

This index maps research sources to HLS implementation topics.

A source card is not just a note. It must explain:

- where the source is located;
- what HLS used from it;
- what HLS did not use;
- what facts were extracted;
- what rules were derived;
- what documents depend on it.

## Source Card Standard

All source cards should follow the format defined in:

- `docs/research/provenance-methodology.md`

Minimum required sections:

1. `## Metadata`
2. `## Links`
3. `## What it says`
4. `## What HLS Used`
5. `## What HLS Did Not Use`
6. `## Extracted HLS Facts`
7. `## Candidate HLS Rules`
8. `## Numeric Data`
9. `## Uncertainty`
10. `## Used By`

## Linked Source Cards

| Source card | Type | Main use | Status |
|---|---|---|---|
| `normal-gait-overview.md` | clinical / educational | walking phase model | linked |
| `antalgic-gait.md` | clinical | injury / limp | linked |
| `pathological-gait-asymmetry.md` | clinical topic | injury asymmetry | linked search card |
| `backpack-load-gait.md` | biomechanics topic | backpack modifier | linked search card |
| `load-carriage-posture.md` | biomechanics topic | load position rules | linked search card |
| `running-biomechanics.md` | biomechanics topic | running rules | linked |
| `stairs-and-slopes.md` | biomechanics topic | terrain modifiers | linked |
| `joint-kinematics-overview.md` | biomechanics overview | pelvis / spine / arms | linked |
| `gait-transitions-turning.md` | locomotion topic | start / stop / turn | linked search card |
| `procedural-animation-overview.md` | game animation technique | runtime solver architecture | linked |
| `ik-foot-placement.md` | implementation technique | foot targets and IK | linked |
| `motion-matching.md` | game animation technique | trajectory / continuity | linked |
| `pose-warping.md` | game animation technique | stride / orientation adaptation | linked |
| `cmu-mocap.md` | dataset | gait validation | linked |
| `amass.md` | dataset / paper | broad motion validation | linked |
| `lafan1.md` | dataset / paper | transition validation | linked |
| `human36m.md` | dataset | joint / pose reference | linked |
| `kit-whole-body.md` | dataset | whole-body coordination | linked |
| `mixamo-samples.md` | animation library | practical game reference | linked |
| `unreal-engine-control-rig.md` | engine docs | UE pose application | linked |
| `unreal-engine-ik-rig.md` | engine docs | IK application | linked |

## Cards Needing Stronger Primary Sources

Some cards contain stable search links or overview links but need stronger primary source selection in a later pass:

| Source card | Needed work |
|---|---|
| `backpack-load-gait.md` | select specific backpack/load carriage papers |
| `load-carriage-posture.md` | select specific load posture papers |
| `pathological-gait-asymmetry.md` | select specific injury/asymmetry papers |
| `gait-transitions-turning.md` | select specific gait initiation / turning papers |
| `joint-kinematics-overview.md` | select specific joint kinematics papers |

## Topic Map

| Topic | Source cards | HLS target docs |
|---|---|---|
| Normal gait | `normal-gait-overview.md`, `joint-kinematics-overview.md` | `docs/04-gait-cycle`, `docs/05-walking` |
| Running | `running-biomechanics.md` | `docs/06-running` |
| Starting / stopping / turning | `gait-transitions-turning.md`, `motion-matching.md`, `pose-warping.md` | `docs/08-modifiers/turning-start-stop.md`, `docs/09-solvers/pose-composer.md` |
| Backpack / load | `backpack-load-gait.md`, `load-carriage-posture.md`, `kit-whole-body.md` | `docs/07-posture`, `docs/08-modifiers/backpack-load.md` |
| Injury / limping | `antalgic-gait.md`, `pathological-gait-asymmetry.md` | `docs/08-modifiers/injury-limping.md` |
| Slopes / stairs | `stairs-and-slopes.md`, `ik-foot-placement.md` | `docs/08-modifiers/slope.md`, `docs/08-modifiers/stairs.md` |
| Procedural animation | `procedural-animation-overview.md`, `ik-foot-placement.md`, `motion-matching.md`, `pose-warping.md`, `unreal-engine-control-rig.md`, `unreal-engine-ik-rig.md` | `docs/09-solvers`, `docs/10-runtime`, `docs/11-unreal-engine` |
| Datasets | `cmu-mocap.md`, `amass.md`, `lafan1.md`, `human36m.md`, `kit-whole-body.md`, `mixamo-samples.md` | `docs/research/datasets.md`, `docs/research/validation-methodology.md` |

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
