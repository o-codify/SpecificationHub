---
id: source-card-procedural-animation-overview
title: "Source Card: Procedural Animation Overview"
status: draft
version: 26.529.2142
tags:
  - research
  - procedural-animation
---

# Source Card: Procedural Animation Overview

## Metadata

Type: game development and animation technique topic.

Reliability: medium.

Relevance: high.

## What it says

Procedural animation generates motion from rules, targets, constraints, traces, and solvers instead of playing only authored clips. For HLS, the useful pattern is to compute pose intent in runtime and let IK or animation systems apply the skeleton.

## Useful HLS Facts

- Runtime should own locomotion intent.
- Animation graph should apply or blend solver outputs.
- Foot targets and pelvis targets are more controllable than direct bone animation.
- Debug visualization is essential for tuning procedural motion.

## Candidate HLS Rules

- Generate gait phase in runtime.
- Generate foot targets from phase and terrain.
- Generate pelvis and spine from contacts and modifiers.
- Use IK or Control Rig to apply final pose.

## HLS Target Sections

- docs/09-solvers
- docs/10-runtime
- docs/11-unreal-engine
