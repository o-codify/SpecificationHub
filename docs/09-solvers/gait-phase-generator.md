---
id: gait-phase-generator
title: Gait Phase Generator
status: review
version: 26.530.1623
tags:
  - solver
  - gait
  - phase
  - provenance
  - links
  - numeric
---

# Gait Phase Generator

## Purpose

Computes stable gait phase, leg phase offsets, stance/swing timing, and cadence-derived cycle timing.

The phase generator is the timing source for foot targets, pelvis rhythm, arm swing, and network phase correction.

## Inputs

- delta time
- resolved gait type
- resolved cadence
- resolved step length
- resolved stance ratio
- current speed
- previous phase
- network correction state

## Outputs

- gait phase
- left leg phase
- right leg phase
- step frequency
- stride frequency
- stance ratio
- swing ratio
- contact timing hints
- phase correction/debug values

## Runtime Formula

```text
StepFrequencyHz = CadenceSPM / 60
StrideFrequencyHz = StepFrequencyHz / 2
PhaseDelta = deltaTime * StrideFrequencyHz
GaitPhase = fract(GaitPhase + PhaseDelta)
LeftLegPhase = GaitPhase
RightLegPhase = fract(GaitPhase + 0.5)
SpeedMetersPerSecond = StepLengthMeters * StepFrequencyHz
```

```text
WalkStanceRatio = clamp(ResolvedWalkStanceRatio, 0.58, 0.62)
WalkSwingRatio = 1 - WalkStanceRatio
RunStanceRatio = clamp(ResolvedRunStanceRatio, 0.30, 0.45)
RunSwingAndFlightRatio = 1 - RunStanceRatio
```

## Reference Parameters

| Parameter | First-pass range | Usage |
|---|---:|---|
| WalkCadence | 100..120 spm | ordinary walking |
| RunCadence | 150..190 spm | ordinary running |
| WalkStanceRatio | 0.58..0.62 | walk contact timing |
| RunStanceRatio | 0.30..0.45 | run contact timing |
| PhaseCorrectionTime | 0.10..0.30 s | networking / correction smoothing |
| TeleportPhaseSnapThreshold | 0.35..0.50 cycle | hard reset threshold |

## Rules

- Left and right leg phases are offset by 0.5 cycle for ordinary symmetrical gait.
- Cadence controls phase speed.
- Step length and cadence should remain consistent with target speed.
- Walking uses longer stance and visible double support.
- Running uses shorter stance and may include flight.
- Phase should be continuous across small corrections.
- Teleport, ragdoll recovery, or large correction may reset phase.

## Rule Provenance

### Alternating leg phase

| Field | Value |
|---|---|
| Rule | Ordinary gait alternates left and right legs about half a cycle apart. |
| Source card | [Normal Gait Overview](../research/source-cards/normal-gait-overview.md) |
| External link | https://www.physio-pedia.com/The_Gait_Cycle |
| Source type | gait overview |
| Used from source | Human gait alternates support and swing between legs. |
| HLS transformation | Runtime uses `RightLegPhase = fract(GaitPhase + 0.5)` for the first-pass symmetrical model. |
| Confidence | high |
| Applies to | [Gait Cycle](../04-gait-cycle/index.md), [Walking](../05-walking/index.md), [Arm Swing Solver](./arm-swing-solver.md) |

### Cadence drives phase speed

| Field | Value |
|---|---|
| Rule | Cadence determines step frequency and stride frequency. |
| Source card | [Normal Gait Overview](../research/source-cards/normal-gait-overview.md), [Running Biomechanics](../research/source-cards/running-biomechanics.md) |
| External link | https://www.physio-pedia.com/The_Gait_Cycle |
| Source type | gait timing relationship |
| Used from source | Cadence describes steps per minute and relates to locomotion timing. |
| HLS transformation | `StepFrequencyHz = CadenceSPM / 60`, `StrideFrequencyHz = StepFrequencyHz / 2`, and phase advances by stride cycles. |
| Confidence | high |
| Applies to | [Parameter System](../10-runtime/parameter-system.md), [Networking](../10-runtime/networking.md) |

### Walking and running timing ranges

| Field | Value |
|---|---|
| Rule | Walking uses longer stance; running uses shorter stance and may include flight. |
| Source card | [Normal Gait Overview](../research/source-cards/normal-gait-overview.md), [Running Biomechanics](../research/source-cards/running-biomechanics.md) |
| External link | https://www.physio-pedia.com/Running_Biomechanics |
| Source type | gait overview / running biomechanics overview |
| Used from source | Walking and running differ in stance/swing structure and support timing. |
| HLS transformation | First-pass values: WalkStanceRatio 0.58..0.62, RunStanceRatio 0.30..0.45. |
| Confidence | medium-high |
| Applies to | [Walking](../05-walking/index.md), [Running](../06-running/index.md) |

### Phase continuity under networking

| Field | Value |
|---|---|
| Rule | Phase should be corrected gradually on proxies unless there is a large discontinuity. |
| Source card | [Motion Matching](../research/source-cards/motion-matching.md), [LaFAN1](../research/source-cards/lafan1.md) |
| External link | https://github.com/ubisoft/ubisoft-laforge-animation-dataset |
| Source type | animation continuity / transition validation reference |
| Used from source | Temporal continuity and transition quality matter for believable animation. |
| HLS transformation | First-pass PhaseCorrectionTime is 0.10..0.30 s; large correction above 0.35..0.50 cycle may snap. |
| Confidence | high as implementation rule |
| Applies to | [Networking](../10-runtime/networking.md), [Debug Visualization](../10-runtime/debug-visualization.md) |

## Numeric Data Separation

| Value | Category | Usage |
|---|---|---|
| alternating legs | source-backed relationship | leg phase offset |
| cadence controls timing | source-backed relationship | phase speed |
| `WalkStanceRatio = 0.58..0.62` | HLS tuning range | walk contact timing |
| `RunStanceRatio = 0.30..0.45` | HLS tuning range | run contact timing |
| `PhaseCorrectionTime = 0.10..0.30 s` | HLS tuning range | networking smoothing |

## Open Questions

- How to represent asymmetric limping phase offsets without breaking ordinary gait assumptions.
- Whether sprinting should have a distinct phase profile.
