---
id: source-card-running-biomechanics
title: "Source Card: Running Biomechanics"
status: draft
version: 26.529.2142
tags:
  - research
  - running
  - gait
---

# Source Card: Running Biomechanics

## Metadata

Type: biomechanics research topic.

Reliability: medium to high.

Relevance: high.

## What it says

Running differs from walking by support timing and body dynamics. It has no double support, includes flight, uses shorter stance, stronger rebound, stronger arm motion, and more forward torso commitment.

## Useful HLS Facts

- Running has flight phase.
- Running stance is shorter than walking stance.
- Arm swing is stronger than walking.
- Pelvis vertical motion is stronger than walking.
- Forward torso lean increases with speed.

## Candidate HLS Rules

- RunStanceRatio should be lower than WalkStanceRatio.
- Support mode can become flight.
- Pelvis vertical amplitude increases with running speed.
- ArmSwingAmplitude increases with running speed.
- Load and injury reduce running quality strongly.

## HLS Target Sections

- docs/04-gait-cycle
- docs/06-running
- docs/09-solvers/gait-phase-generator.md
