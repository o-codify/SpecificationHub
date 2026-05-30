---
id: source-card-running-biomechanics
title: "Source Card: Running Biomechanics"
status: draft
version: 26.530.1100
tags:
  - research
  - running
  - gait
  - linked-source
  - links
---

# Source Card: Running Biomechanics

## Metadata

| Field | Value |
|---|---|
| Title | Running Biomechanics Overview |
| Type | Biomechanics overview / research topic |
| Reliability | Medium |
| Relevance | High |
| Access status | Accessible overview sources, more primary papers needed |

## Links

- Review-style overview: https://www.ncbi.nlm.nih.gov/pmc/articles/PMC7575155/
- Running gait cycle overview: https://www.physio-pedia.com/Running_Biomechanics

## What it says

Running differs from walking by support timing and body dynamics. Running has no walking-style double support, includes flight, uses shorter stance timing, stronger rebound, stronger arm motion, and more forward torso commitment.

## What HLS Used

- Running is not a sped-up walk.
- Running includes flight phase.
- Running stance is shorter than walking stance.
- Arm drive and vertical body motion are stronger than walking.
- Load and injury should degrade running more strongly than walking.

## What HLS Did Not Use

- Exact sports-performance optimization.
- Medical injury diagnosis.
- Detailed foot strike classification as a required first-pass runtime state.

## Extracted HLS Facts

- Running support mode can include flight.
- Run stance ratio should be lower than walk stance ratio.
- Running needs stronger pelvis vertical amplitude and arm swing.
- Forward torso lean should increase with speed.

## Candidate HLS Rules

```text
RunStanceRatio < WalkStanceRatio
RunSupportMode may become Flight
RunArmSwingAmplitude > WalkArmSwingAmplitude
RunPelvisVerticalAmplitude > WalkPelvisVerticalAmplitude
```

## Numeric Data

| Value | Meaning | Usage in HLS |
|---|---|---|
| Run stance shorter than walk stance | qualitative source-backed relationship | `RunStanceRatio` lower than walking |
| Flight phase exists | qualitative source-backed relationship | `supportMode = flight` |

HLS tuning values such as `RunStanceRatio = 0.30..0.45` are gameplay defaults, not treated as fixed scientific constants.

## HLS Transformation

```text
running biomechanics distinction
  -> supportMode includes flight
  -> shorter stance ratio
  -> higher arm and pelvis amplitudes
  -> Running solver profile
```

## Uncertainty

- Exact runtime bands for jog versus run.
- Whether slow jog should always include visible flight.
- How much foot-strike pattern matters for Level 3 game motion.

## Used By

- [Running](../../06-running/index.md)
- [Gait Cycle](../../04-gait-cycle/index.md)
- [Gait Phase Generator](../../09-solvers/gait-phase-generator.md)
- [Arm Swing Solver](../../09-solvers/arm-swing-solver.md)
