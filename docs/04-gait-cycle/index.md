---
id: gait-cycle
title: Gait Cycle
status: review
version: 26.530.1547
tags:
  - gait
  - phase
  - walking
  - running
  - provenance
  - links
  - numeric
---

# Gait Cycle

## Purpose

Defines the shared timing model for walking and running.

The gait cycle is the base rhythm used by walking, running, modifiers, and procedural solvers.

## Core Concepts

- A stride is one full cycle of the same foot.
- A step is the interval from one foot contact to the opposite foot contact.
- Walking has stance, swing, and double support.
- Running has shorter stance and may include flight.
- Left and right legs are half a cycle apart in ordinary symmetrical gait.

## Runtime Phase Model

```text
StepFrequencyHz = CadenceSPM / 60
StrideFrequencyHz = StepFrequencyHz / 2
StrideDurationSeconds = 1 / StrideFrequencyHz
StanceDurationSeconds = StrideDurationSeconds * StanceRatio
SwingDurationSeconds = StrideDurationSeconds * (1 - StanceRatio)
SpeedMetersPerSecond = StepLengthMeters * StepFrequencyHz
```

```text
LeftLegPhase = GaitPhase
RightLegPhase = fract(GaitPhase + 0.5)
```

## Walking Reference Values

| Value | First-pass range | Usage |
|---|---:|---|
| WalkStanceRatio | 0.58..0.62 | stance duration |
| WalkSwingRatio | 0.38..0.42 | swing duration |
| DoubleSupportReference | 0.20..0.24 | visual support sanity check |
| WalkCadence | 100..120 spm | comfortable walk tuning |
| ComfortableWalkingSpeed | 1.2..1.4 m/s | sanity check |

## Running Reference Values

| Value | First-pass range | Usage |
|---|---:|---|
| RunStanceRatio | 0.30..0.45 | stance duration |
| RunSwingAndFlightRatio | 0.55..0.70 | swing plus flight |
| RunCadence | 150..190 spm | ordinary run tuning |
| RunStepLength | 0.90..1.60 m | ordinary run tuning |
| RunSpeed | 2.5..6.0 m/s | ordinary run sanity check |

## Rules

- Gait phase should be continuous unless teleport, ragdoll recovery, or hard reset occurs.
- Walking should preserve alternating stance and swing with double support.
- Running should use shorter stance and stronger swing/flight timing.
- Runtime modifiers may change cadence, step length, stance ratio, and phase correction time, but must remain clamped.
- Foot locking should use contact state from phase and terrain, not phase alone.

## Rule Provenance

### Walking stance and swing split

| Field | Value |
|---|---|
| Rule | Walking stance is longer than swing and includes double support. |
| Source card | [Normal Gait Overview](../../research/source-cards/normal-gait-overview.md) |
| External link | https://www.physio-pedia.com/The_Gait_Cycle |
| Source type | gait overview |
| Used from source | Normal walking divides the cycle into stance and swing, with stance longer than swing and double support present. |
| HLS transformation | First-pass walking uses WalkStanceRatio 0.58..0.62 and DoubleSupportReference 0.20..0.24. |
| Confidence | high |
| Applies to | [Walking](../05-walking/index.md), [Gait Phase Generator](../09-solvers/gait-phase-generator.md) |

### Running stance and flight

| Field | Value |
|---|---|
| Rule | Running has shorter stance than walking and may include flight. |
| Source card | [Running Biomechanics](../../research/source-cards/running-biomechanics.md) |
| External link | https://www.physio-pedia.com/Running_Biomechanics |
| Source type | running biomechanics overview |
| Used from source | Running differs from walking through shorter stance and flight dynamics. |
| HLS transformation | First-pass running uses RunStanceRatio 0.30..0.45 and RunSwingAndFlightRatio 0.55..0.70. |
| Confidence | medium-high |
| Applies to | [Running](../06-running/index.md), [Gait Phase Generator](../09-solvers/gait-phase-generator.md) |

### Cadence, step length, and speed relationship

| Field | Value |
|---|---|
| Rule | Speed is derived from step length and step frequency. |
| Source card | [Normal Gait Overview](../../research/source-cards/normal-gait-overview.md), [Running Biomechanics](../../research/source-cards/running-biomechanics.md) |
| External link | https://www.physio-pedia.com/The_Gait_Cycle |
| Source type | gait timing relationship |
| Used from source | Cadence and step length describe locomotion timing and displacement. |
| HLS transformation | Runtime uses `SpeedMetersPerSecond = StepLengthMeters * StepFrequencyHz` as a consistency formula. |
| Confidence | high |
| Applies to | [Parameter System](../10-runtime/parameter-system.md), [Foot Target Solver](../09-solvers/foot-target-solver.md) |

## Numeric Data Separation

| Value | Category | Usage |
|---|---|---|
| stance longer than swing in walking | source-backed relationship | walking timing |
| double support in walking | source-backed relationship | contact sanity check |
| running shorter stance / possible flight | source-backed relationship | running timing |
| `WalkStanceRatio = 0.58..0.62` | HLS tuning range | walk phase generator |
| `RunStanceRatio = 0.30..0.45` | HLS tuning range | run phase generator |
| `Speed = StepLength * StepFrequency` | implementation formula | runtime consistency |

## Open Questions

- Whether sprinting should be a separate gait profile or an extension of running.
- How much asymmetric injury timing should be allowed before switching to a limping state.
