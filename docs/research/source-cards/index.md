---
id: source-cards-index
title: Source Cards Index
status: draft
version: 26.530.1059
tags:
  - research
  - sources
  - index
  - markdown-standard
  - links
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

- [Research Provenance Methodology](../provenance-methodology.md)

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
| [Normal Gait Overview](./normal-gait-overview.md) | clinical / educational | walking phase model | linked |
| [Antalgic Gait](./antalgic-gait.md) | clinical | injury / limp | linked |
| [Pathological Gait Asymmetry](./pathological-gait-asymmetry.md) | clinical topic | injury asymmetry | linked search card |
| [Backpack Load Gait](./backpack-load-gait.md) | biomechanics topic | backpack modifier | linked search card |
| [Load Carriage Posture](./load-carriage-posture.md) | biomechanics topic | load position rules | linked search card |
| [Running Biomechanics](./running-biomechanics.md) | biomechanics topic | running rules | linked |
| [Stairs and Slopes](./stairs-and-slopes.md) | biomechanics topic | terrain modifiers | linked |
| [Joint Kinematics Overview](./joint-kinematics-overview.md) | biomechanics overview | pelvis / spine / arms | linked |
| [Gait Transitions and Turning](./gait-transitions-turning.md) | locomotion topic | start / stop / turn | linked search card |
| [Procedural Animation Overview](./procedural-animation-overview.md) | game animation technique | runtime solver architecture | linked |
| [IK Foot Placement](./ik-foot-placement.md) | implementation technique | foot targets and IK | linked |
| [Motion Matching](./motion-matching.md) | game animation technique | trajectory / continuity | linked |
| [Pose Warping](./pose-warping.md) | game animation technique | stride / orientation adaptation | linked |
| [CMU Mocap](./cmu-mocap.md) | dataset | gait validation | linked |
| [AMASS](./amass.md) | dataset / paper | broad motion validation | linked |
| [LaFAN1](./lafan1.md) | dataset / paper | transition validation | linked |
| [Human3.6M](./human36m.md) | dataset | joint / pose reference | linked |
| [KIT Whole-Body](./kit-whole-body.md) | dataset | whole-body coordination | linked |
| [Mixamo Samples](./mixamo-samples.md) | animation library | practical game reference | linked |
| [Unreal Engine Control Rig](./unreal-engine-control-rig.md) | engine docs | UE pose application | linked |
| [Unreal Engine IK Rig](./unreal-engine-ik-rig.md) | engine docs | IK application | linked |

## Cards Needing Stronger Primary Sources

Some cards contain stable search links or overview links but need stronger primary source selection in a later pass:

| Source card | Needed work |
|---|---|
| [Backpack Load Gait](./backpack-load-gait.md) | select specific backpack/load carriage papers |
| [Load Carriage Posture](./load-carriage-posture.md) | select specific load posture papers |
| [Pathological Gait Asymmetry](./pathological-gait-asymmetry.md) | select specific injury/asymmetry papers |
| [Gait Transitions and Turning](./gait-transitions-turning.md) | select specific gait initiation / turning papers |
| [Joint Kinematics Overview](./joint-kinematics-overview.md) | select specific joint kinematics papers |

## Topic Map

| Topic | Source cards | HLS target docs |
|---|---|---|
| Normal gait | [Normal Gait Overview](./normal-gait-overview.md), [Joint Kinematics Overview](./joint-kinematics-overview.md) | [Gait Cycle](../../04-gait-cycle/index.md), [Walking](../../05-walking/index.md) |
| Running | [Running Biomechanics](./running-biomechanics.md) | [Running](../../06-running/index.md) |
| Starting / stopping / turning | [Gait Transitions and Turning](./gait-transitions-turning.md), [Motion Matching](./motion-matching.md), [Pose Warping](./pose-warping.md) | [Turning, Starting, and Stopping](../../08-modifiers/turning-start-stop.md), [Pose Composer](../../09-solvers/pose-composer.md) |
| Backpack / load | [Backpack Load Gait](./backpack-load-gait.md), [Load Carriage Posture](./load-carriage-posture.md), [KIT Whole-Body](./kit-whole-body.md) | [Posture](../../07-posture/index.md), [Backpack Load Modifier](../../08-modifiers/backpack-load.md) |
| Injury / limping | [Antalgic Gait](./antalgic-gait.md), [Pathological Gait Asymmetry](./pathological-gait-asymmetry.md) | [Injury and Limping Modifier](../../08-modifiers/injury-limping.md) |
| Slopes / stairs | [Stairs and Slopes](./stairs-and-slopes.md), [IK Foot Placement](./ik-foot-placement.md) | [Slope Modifier](../../08-modifiers/slope.md), [Stairs Modifier](../../08-modifiers/stairs.md) |
| Procedural animation | [Procedural Animation Overview](./procedural-animation-overview.md), [IK Foot Placement](./ik-foot-placement.md), [Motion Matching](./motion-matching.md), [Pose Warping](./pose-warping.md), [Unreal Engine Control Rig](./unreal-engine-control-rig.md), [Unreal Engine IK Rig](./unreal-engine-ik-rig.md) | [Solvers](../../09-solvers/index.md), [Runtime](../../10-runtime/index.md), [Unreal Engine](../../11-unreal-engine/index.md) |
| Datasets | [CMU Mocap](./cmu-mocap.md), [AMASS](./amass.md), [LaFAN1](./lafan1.md), [Human3.6M](./human36m.md), [KIT Whole-Body](./kit-whole-body.md), [Mixamo Samples](./mixamo-samples.md) | [Motion Datasets](../datasets.md), [Validation Methodology](../validation-methodology.md) |

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
