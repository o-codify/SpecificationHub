---
id: source-card-motion-matching
title: "Source Card: Motion Matching"
status: draft
version: 26.529.2143
tags:
  - research
  - motion-matching
  - animation
---

# Source Card: Motion Matching

## Metadata

Type: game animation technique.

Reliability: medium to high.

Relevance: medium.

## What it says

Motion matching selects animation frames from a database based on current pose and desired trajectory. It can create highly natural motion, but it depends on authored or captured motion data.

## Useful HLS Facts

- Trajectory intent is a useful control signal.
- Pose continuity matters for believable movement.
- Foot contact data is important for avoiding sliding.
- HLS can borrow trajectory and contact concepts without requiring a motion database.

## Candidate HLS Rules

- Store desired trajectory in CharacterInputState.
- Preserve contact continuity across state changes.
- Use motion matching as optional validation or fallback, not core HLS runtime.

## What Does Not Fit HLS First Pass

HLS should not require a large motion database or mocap coverage for every state.

## HLS Target Sections

- docs/10-runtime
- docs/11-unreal-engine
