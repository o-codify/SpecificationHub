---
id: source-card-unreal-engine-ik-rig-and-full-body-ik
title: "Source Card: Unreal Engine IK Rig and Full Body IK"
status: draft
version: 26.530.1015
tags:
  - research
  - unreal-engine
  - ik
  - linked-source
  - links
---

# Source Card: Unreal Engine IK Rig and Full Body IK

## Metadata

| Field | Value |
|---|---|
| Title | Unreal Engine IK Rig / Full Body IK Documentation |
| Type | Engine documentation |
| Reliability | High |
| Relevance | High |
| Access status | Accessible official documentation |

## Links

- IK Rig documentation: https://dev.epicgames.com/documentation/en-us/unreal-engine/ik-rig-in-unreal-engine
- IK Rig solvers: https://dev.epicgames.com/documentation/en-us/unreal-engine/ik-rig-solvers-in-unreal-engine
- Full Body IK: https://dev.epicgames.com/documentation/en-us/unreal-engine/full-body-ik-in-unreal-engine

## What it says

Unreal Engine provides IK Rig and Full Body IK systems for solving skeletal poses toward targets and constraints.

## What HLS Used

- IK can apply HLS foot targets to skeletal feet.
- Full-body solving can help distribute pelvis, spine, and limb corrections.
- IK target generation should be separate from final bone solving.

## What HLS Did Not Use

- HLS does not require Unreal IK as the only implementation.
- HLS does not move all locomotion decisions into IK nodes.

## Extracted HLS Facts

- FootTargetSolver should output targets, not directly animate bones.
- PoseComposer can output IK intent for Unreal systems.
- Pelvis constraints should avoid IK overextension.

## Candidate HLS Rules

```text
FootTargetSolver -> foot IK targets
PelvisSolver -> pelvis offset intent
Control Rig / IK Rig -> final skeletal solution
```

```text
If IK target exceeds safe reach, clamp target and expose debug warning.
```

## Numeric Data

No numeric runtime rule is extracted.

## Uncertainty

- Whether first implementation should use Control Rig, IK Rig, Full Body IK, or a hybrid.
- How much IK solving cost is acceptable for many networked characters.

## Used By

- [Foot Target Solver](../../09-solvers/foot-target-solver.md)
- [Pelvis Solver](../../09-solvers/pelvis-solver.md)
- [Runtime Constraints](../../10-runtime/constraints.md)
- [Unreal Engine](../../11-unreal-engine/index.md)
