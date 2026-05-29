---
id: source-card-gait-transitions-and-turning
title: "Source Card: Gait Transitions and Turning"
status: draft
version: 26.529.2142
tags:
  - research
  - turning
  - transitions
---

# Source Card: Gait Transitions and Turning

## Metadata

Type: locomotion research and game animation topic.

Reliability: medium.

Relevance: high.

## What it says

Starting, stopping, and turning are transitional locomotion states. They require anticipation, support changes, and body segment lead-lag. Visual plausibility depends on feet, pelvis, chest, and head not rotating as a single rigid block.

## Useful HLS Facts

- Starting includes anticipatory lean toward movement.
- Stopping includes backward compensation.
- Turning can include pelvis and chest lead-lag.
- Feet must visibly support turns or pivots.
- Sidestep and backward walking need shorter, more cautious steps.

## Candidate HLS Rules

- Start adds temporary lean toward movement direction.
- Stop shortens steps and adds backward torso compensation.
- Turn uses foot target rotation plus torso lag.
- Turn in place uses pivot steps instead of sliding feet.

## HLS Target Sections

- docs/08-modifiers/turning-start-stop.md
- docs/09-solvers/foot-target-solver.md
- docs/09-solvers/spine-solver.md
