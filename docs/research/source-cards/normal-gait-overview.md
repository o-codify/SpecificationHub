---
id: source-card-normal-gait-overview
title: "Source Card: Normal Gait Overview"
status: draft
version: 26.529.2158
tags:
  - research
  - gait
  - walking
  - linked-source
---

# Source Card: Normal Gait Overview

## Metadata

Title: The Gait Cycle / Normal Gait Overview.

Type: clinical and educational gait overview.

URL:

- https://www.physio-pedia.com/The_Gait_Cycle
- https://teachmeanatomy.info/lower-limb/misc/gait-cycle/

Access status: accessible web pages.

Reliability: medium.

Relevance: high.

## What it says

Normal gait is divided into stance and swing. Stance is the foot contact part of the cycle. Swing is the forward recovery part of the cycle. Walking includes double support.

## What HLS Used

- stance and swing as the basic phase model
- stance being longer than swing in ordinary walking
- double support as walking-only support mode
- clinical subphase names as labels for runtime bands

## What HLS Did Not Use

- exact clinical diagnosis logic
- patient-specific pathology interpretation
- medical measurement procedures

## Useful HLS Facts

- Walking can be represented as a repeated normalized cycle.
- Stance is longer than swing in walking.
- Walking includes double support.
- The two legs are offset in phase.

## Candidate HLS Rules

- Walk stance ratio defaults to about 0.60.
- Walk swing ratio defaults to about 0.40.
- Opposite leg phase is gait phase plus 0.5.
- Double support exists only in walking, not running.

## Numeric Data

- Stance: approximately 60 percent.
- Swing: approximately 40 percent.

## Uncertainty

Clinical timing is not always ideal for stylized game animation. HLS should use these values as defaults and tune visually.

## HLS Target Sections

- docs/04-gait-cycle
- docs/05-walking
- docs/09-solvers/gait-phase-generator.md
