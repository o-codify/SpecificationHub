---
id: research-provenance-methodology
title: Research Provenance Methodology
status: draft
version: 26.529.2158
tags:
  - research
  - provenance
  - sources
  - links
---

# Research Provenance Methodology

## Purpose

Defines how HLS records where rules came from, what was used, what was inferred, and how confident the specification is.

HLS must not only contain final rules. It must preserve research provenance so future developers can inspect the original source whenever possible.

## Core Requirement

Every non-trivial HLS rule should be traceable to one of these categories:

- biomechanics source
- clinical gait source
- game animation source
- procedural animation technique
- motion dataset observation
- implementation constraint
- gameplay readability decision
- HLS inference

## Link Requirement

Whenever possible, provenance must include a real external link.

Preferred identifiers:

1. DOI link
2. publisher page
3. PubMed or NCBI page
4. official dataset page
5. official engine documentation
6. official talk or slide page
7. stable GitHub repository
8. archived page if original is unavailable

Avoid using unsourced claims when a source can be linked.

## Source Card Requirement

Each source card should include:

- source identity
- source type
- URL or DOI
- access status: accessible, abstract-only, paywalled, unavailable, unknown
- reliability
- relevance
- what it says
- what HLS used from it
- what HLS did not use
- extracted facts
- candidate rules
- numeric data if available
- uncertainty
- target HLS documents

## Rule Provenance Block

When a document contains important rules, it should include a section named Rule Provenance.

Recommended format:

```text
Rule: walking stance is longer than swing.
Source: Normal gait overview source card.
External link: official URL or DOI.
Used from source: stance and swing phase relationship.
HLS transformation: converted clinical phase description into default runtime stance ratio.
Confidence: high.
Applies to: GaitPhaseGenerator, Walking.
```

## Confidence Levels

High confidence:

- supported by multiple reliable sources
- common in biomechanics or clinical gait literature
- directly observable in datasets or real motion

Medium confidence:

- supported by sources but simplified for games
- depends on subject, speed, load, or context
- useful but needs tuning

Low confidence:

- mostly HLS inference
- based on gameplay readability
- requires playtesting

## What Counts As Used

A source is considered used only if it changes a rule, parameter, solver, validation method, or open question.

Examples:

- stance ratio informs gait cycle defaults
- antalgic gait informs injury stance reduction
- backpack research informs forward torso lean and step reduction
- IK foot placement material informs FootTargetSolver and Unreal notes

## What Must Be Marked As Inference

Mark as HLS inference when the document converts broad scientific knowledge into a game-specific parameter.

Example:

```text
Scientific fact: painful limb has reduced stance time.
HLS inference: InjurySeverity 1.0 maps to stance multiplier around 0.55.
```

## Numeric Data Rule

Do not present tuned gameplay numbers as scientific facts.

Separate them:

- observed or cited numeric data
- HLS default values
- tuning ranges
- open questions

## Dataset Usage Rule

Datasets can be used for analysis and validation. They are not required runtime dependencies unless explicitly stated.

Dataset cards must mention:

- official link
- what the dataset contains
- license or usage uncertainty
- possible HLS use
- whether it is suitable for training, validation, or only reference

## Implementation Constraint Sources

Some rules come from engine or runtime constraints, not biomechanics.

Examples:

- foot locking priority comes from visual/game animation constraints
- not replicating every bone comes from multiplayer bandwidth constraints
- Control Rig use comes from Unreal Engine implementation constraints

These should be labeled as implementation constraints and linked to engine docs or implementation notes where possible.

## Review Checklist

For each HLS document, reviewers should ask:

- Which source cards support this document.
- Which source cards contain real links.
- Which rules are source-backed.
- Which rules are HLS inference.
- Which numbers are scientific and which are tuned defaults.
- What remains uncertain.
