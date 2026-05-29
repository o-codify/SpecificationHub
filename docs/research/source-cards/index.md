---
id: source-cards-index
title: Source Cards Index
status: draft
version: 26.529.2217
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

## Current Linked Source Cards

| Source card | Type | Main use | Status |
|---|---|---|---|
| `normal-gait-overview.md` | clinical / educational | walking phase model | linked |
| `antalgic-gait.md` | clinical | injury / limp | linked |
| `cmu-mocap.md` | dataset | gait validation | linked |
| `amass.md` | dataset / paper | broad motion validation | linked |
| `lafan1.md` | dataset / paper | transition validation | linked |
| `human36m.md` | dataset | joint / pose reference | linked |
| `kit-whole-body.md` | dataset | whole-body coordination | linked |
| `unreal-engine-control-rig.md` | engine docs | UE pose application | linked |
| `unreal-engine-ik-rig.md` | engine docs | IK application | linked |
| `ik-foot-placement.md` | implementation technique | foot targets and IK | linked |
| `motion-matching.md` | game animation technique | trajectory / continuity | linked |
| `pose-warping.md` | game animation technique | stride / orientation adaptation | linked |

## Cards Still Needing Link Upgrade

| Source card | Needed work |
|---|---|
| `running-biomechanics.md` | add paper / official source links |
| `stairs-and-slopes.md` | add paper / review links |
| `backpack-load-gait.md` | add load carriage paper links |
| `joint-kinematics-overview.md` | add gait kinematics references |
| `gait-transitions-turning.md` | add transition / turning references |
| `procedural-animation-overview.md` | add game animation / engine links |
| `pathological-gait-asymmetry.md` | create or link to injury asymmetry sources |
| `load-carriage-posture.md` | create or merge into backpack card |
| `mixamo-samples.md` | create with usage notes |

## Topic Map

| Topic | Source cards | HLS target docs |
|---|---|---|
| Normal gait | `normal-gait-overview.md`, `joint-kinematics-overview.md` | `docs/04-gait-cycle`, `docs/05-walking` |
| Running | `running-biomechanics.md` | `docs/06-running` |
| Starting / stopping / turning | `gait-transitions-turning.md`, `motion-matching.md`, `pose-warping.md` | `docs/08-modifiers/turning-start-stop.md`, `docs/09-solvers/pose-composer.md` |
| Backpack / load | `backpack-load-gait.md`, `kit-whole-body.md` | `docs/07-posture`, `docs/08-modifiers/backpack-load.md` |
| Injury / limping | `antalgic-gait.md` | `docs/08-modifiers/injury-limping.md` |
| Slopes / stairs | `stairs-and-slopes.md`, `ik-foot-placement.md` | `docs/08-modifiers/slope.md`, `docs/08-modifiers/stairs.md` |
| Procedural animation | `ik-foot-placement.md`, `motion-matching.md`, `pose-warping.md`, `unreal-engine-control-rig.md`, `unreal-engine-ik-rig.md` | `docs/09-solvers`, `docs/10-runtime`, `docs/11-unreal-engine` |
| Datasets | `cmu-mocap.md`, `amass.md`, `lafan1.md`, `human36m.md`, `kit-whole-body.md` | `docs/research/datasets.md`, `docs/research/validation-methodology.md` |

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
