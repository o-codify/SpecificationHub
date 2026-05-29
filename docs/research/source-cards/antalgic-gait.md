---
id: source-card-antalgic-gait
title: "Source Card: Antalgic Gait"
status: draft
version: 26.529.2046
tags:
  - research
  - injury
  - limp
---

# Source Card: Antalgic Gait

## Metadata

Type: clinical gait reference.

Reliability: high.

Relevance: high.

## What it says

Antalgic gait is a pain-related gait pattern. The person reduces loading time on the painful limb.

## Useful HLS Facts

- Painful leg has shorter stance time.
- Limp is mainly visible as asymmetry.
- Walking speed is reduced.
- Torso and pelvis compensate to avoid painful loading.

## Candidate HLS Rules

- If one leg is injured, reduce stance time on that leg.
- Reduce overall speed as injury severity increases.
- Increase spine stiffness as injury severity increases.
- Add pelvis compensation away from painful loading.

## Numeric Data

No universal single value should be hard-coded. HLS uses tunable severity curves.

## Uncertainty

Hip, knee, ankle, and foot pain produce different patterns. First pass uses a generic limp modifier.

## HLS Target Sections

- docs/08-modifiers/injury-limping.md
