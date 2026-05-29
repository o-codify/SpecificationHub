---
id: source-card-antalgic-gait
title: "Source Card: Antalgic Gait"
status: draft
version: 26.529.2159
tags:
  - research
  - injury
  - limp
  - linked-source
---

# Source Card: Antalgic Gait

## Metadata

Title: Antalgic Gait in Adults.

Type: clinical gait reference.

URL:

- https://www.ncbi.nlm.nih.gov/books/NBK559243/

Access status: accessible NCBI Bookshelf page.

Reliability: high.

Relevance: high.

## What it says

Antalgic gait is a pain-related gait pattern. The person reduces loading time on the painful limb.

## What HLS Used

- painful limb has reduced stance time
- limp is visible as asymmetry
- gait changes are protective
- speed and loading confidence can be reduced

## What HLS Did Not Use

- diagnostic workflow
- disease-specific treatment information
- medical recommendations

## Useful HLS Facts

- Painful leg has shorter stance time.
- Limp is mainly visible as asymmetry.
- Walking speed is reduced in many protective gait patterns.
- Torso and pelvis may compensate to avoid painful loading.

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
- docs/09-solvers/gait-phase-generator.md
- docs/09-solvers/pelvis-solver.md
