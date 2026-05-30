---
id: source-card-unreal-engine-control-rig
title: "Source Card: Unreal Engine Control Rig"
status: draft
version: 26.530.1015
tags:
  - research
  - unreal-engine
  - control-rig
  - linked-source
  - links
---

# Source Card: Unreal Engine Control Rig

## Metadata

| Field | Value |
|---|---|
| Title | Unreal Engine Control Rig Documentation |
| Type | Engine documentation |
| Reliability | High |
| Relevance | High |
| Access status | Accessible official documentation |

## Links

- Control Rig documentation: https://dev.epicgames.com/documentation/en-us/unreal-engine/control-rig-in-unreal-engine
- Animation Blueprint documentation: https://dev.epicgames.com/documentation/en-us/unreal-engine/animation-blueprints-in-unreal-engine

## What it says

Control Rig provides rigging and animation controls inside Unreal Engine. Animation Blueprints can evaluate animation logic and pass data into procedural or rig-based animation systems.

## What HLS Used

- Control Rig is a suitable application layer for HLS pose intent.
- AnimBP can pass runtime values into rig controls.
- HLS can separate C++ solver intent from skeleton application.

## What HLS Did Not Use

- HLS does not require all locomotion logic to live inside Control Rig.
- HLS does not require authored animation clips for every locomotion state.

## Extracted HLS Facts

- Unreal Engine supports an architecture where runtime code computes targets and Control Rig applies them.
- Animation Blueprints can bridge gameplay/runtime data and skeletal output.

## Candidate HLS Rules

```text
C++ HLS runtime computes pose intent.
AnimBP exposes pose intent to Control Rig.
Control Rig applies IK/FK to the skeleton.
```

```text
Runtime owns intent; animation applies pose.
```

## Numeric Data

No numeric runtime rule is extracted.

## Uncertainty

- Which parts should live in C++ versus Control Rig in the first implementation.
- How much of the rig should be exposed to designers.

## Used By

- [Unreal Engine](../../11-unreal-engine/index.md)
- [Runtime Update Order](../../10-runtime/update-order.md)
- [Solver Interfaces](../../10-runtime/solver-interfaces.md)
- [Pose Composer](../../09-solvers/pose-composer.md)
