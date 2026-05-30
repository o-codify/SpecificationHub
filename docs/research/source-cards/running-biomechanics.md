---
id: source-card-running-biomechanics
title: "Source Card: Running Biomechanics"
status: draft
version: 26.530.1245
tags:
  - research
  - running
  - gait
  - linked-source
  - links
  - numeric
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
- Sports biomechanics search anchor: https://pubmed.ncbi.nlm.nih.gov/?term=running+biomechanics+stance+phase+flight+cadence

## What it says

Running differs from walking by support timing and body dynamics. Running has no walking-style double support, includes flight, uses shorter stance timing, stronger rebound, stronger arm motion, and more forward torso commitment.

The source-backed relationship is the walking/running distinction: no ordinary walking-style double support, possible flight phase, shorter stance, and stronger whole-body dynamics. Exact stance ratios, cadence bands, and speed thresholds vary with running speed, athlete, task, and measurement method.

## What HLS Used

- Running is not a sped-up walk.
- Running includes flight phase.
- Running stance is shorter than walking stance.
- Arm drive and vertical body motion are stronger than walking.
- Load and injury should degrade running more strongly than walking.
- Cadence and speed ranges only as gameplay scale checks.

## What HLS Did Not Use

- Exact sports-performance optimization.
- Medical injury diagnosis.
- Detailed foot strike classification as a required first-pass runtime state.
- Claims that one cadence or stance value fits all running speeds.

## Extracted HLS Facts

- Running support mode can include flight.
- Run stance ratio should be lower than walk stance ratio.
- Running needs stronger pelvis vertical amplitude and arm swing.
- Forward torso lean should increase with speed.
- Jog/run cadence can start around 150..190 steps/minute for first-pass gameplay tuning.
- HLS run speed scale can start around 2.5..6.0 m/s for ordinary game locomotion, before sprint-specific rules.

## Candidate HLS Rules

```text
RunStanceRatio < WalkStanceRatio
RunStanceRatio = 0.30..0.45 as HLS first-pass tuning
RunCadenceReference = 150..190 steps/minute
RunSpeedReference = 2.5..6.0 m/s
RunSupportMode may become Flight
FlightRatioApprox = max(0, 1 - RunStanceRatio * 2)
RunArmSwingAmplitude > WalkArmSwingAmplitude
RunPelvisVerticalAmplitude > WalkPelvisVerticalAmplitude
RunTorsoLean = 5..15 degrees as HLS first-pass tuning
```

## Numeric Data

| Value | Meaning | Usage in HLS |
|---|---|---|
| Run stance shorter than walk stance | qualitative source-backed relationship | `RunStanceRatio` lower than walking |
| Flight phase exists | qualitative source-backed relationship | `supportMode = flight` |
| `RunStanceRatio = 0.30..0.45` | HLS tuning range | first-pass jog/run timing |
| `RunCadence = 150..190 spm` | HLS tuning range | gameplay cadence scale |
| `RunSpeed = 2.5..6.0 m/s` | HLS tuning range | ordinary run speed scale |
| `RunPelvisMultiplier = 1.25..2.00` | HLS tuning range | stronger rebound than walking |
| `RunArmMultiplier = 1.20..1.75` | HLS tuning range | stronger arm drive than walking |
| `RunTorsoLean = 5..15 deg` | HLS tuning range | forward commitment readability |

HLS tuning values such as `RunStanceRatio = 0.30..0.45` are gameplay defaults, not treated as fixed scientific constants.

## HLS Transformation

```text
running biomechanics distinction
  -> supportMode includes flight
  -> shorter stance ratio
  -> higher arm and pelvis amplitudes
  -> speed/cadence scale checks
  -> Running solver profile
```

## Uncertainty

- Exact runtime bands for jog versus run.
- Whether slow jog should always include visible flight.
- How much foot-strike pattern matters for Level 3 game motion.
- Primary-source extraction still needed for speed-specific stance and flight percentages.

## Used By

- [Running](../../06-running/index.md)
- [Gait Cycle](../../04-gait-cycle/index.md)
- [Gait Phase Generator](../../09-solvers/gait-phase-generator.md)
- [Arm Swing Solver](../../09-solvers/arm-swing-solver.md)
