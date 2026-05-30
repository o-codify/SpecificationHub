---
id: running
title: Running
status: review
version: 26.530.1542
tags:
  - running
  - gait
  - provenance
  - links
  - numeric
---

# Running

## Purpose

Defines first-pass running locomotion values and rules.

Running is a faster grounded gait with shorter stance than walking, larger whole-body motion, and possible flight timing.

## Reference Parameters

| Parameter | First-pass range | Usage |
|---|---:|---|
| RunStanceRatio | 0.30..0.45 | stance duration |
| RunSwingAndFlightRatio | 0.55..0.70 | swing plus flight duration |
| RunCadence | 150..190 spm | ordinary running cadence |
| RunStepLength | 0.90..1.60 m | ordinary running step length |
| RunSpeed | 2.5..6.0 m/s | ordinary running sanity check |
| FlightRatio | `max(0, 1 - RunStanceRatio * 2)` | approximate flight visibility |
| PelvisVerticalAmplitude | 1.25..2.00 * walking | stronger vertical motion |
| FootLiftHeight | 1.25..2.00 * walking | stronger swing clearance |
| ArmSwingAmplitude | 1.20..1.75 * walking | stronger arm drive |
| TorsoLean | 5..15 deg | running posture |

## Runtime Formula

```text
StepFrequencyHz = Cadence / 60
Speed = StepLength * StepFrequencyHz
StrideFrequencyHz = StepFrequencyHz / 2
StrideDuration = 1 / StrideFrequencyHz
StanceDuration = StrideDuration * RunStanceRatio
SwingAndFlightDuration = StrideDuration * (1 - RunStanceRatio)
```

## Rules

- Running uses shorter stance than walking.
- Running may include flight timing when both feet are visually unweighted.
- Running should increase pelvis motion, foot lift, arm drive, and torso lean relative to walking.
- Running must remain clamp-safe under injury, load, weapon aiming, and fatigue modifiers.
- Severe injury or heavy load may downgrade running to walking or limping through the Locomotion State Resolver.

## Rule Provenance

### Running differs from walking

| Field | Value |
|---|---|
| Rule | Running uses shorter stance than walking and may include flight. |
| Source card | [Running Biomechanics](../research/source-cards/running-biomechanics.md) |
| External link | https://www.physio-pedia.com/Running_Biomechanics |
| Source type | running biomechanics overview |
| Used from source | Running differs from walking through shorter stance and possible flight phase. |
| HLS transformation | First-pass running uses RunStanceRatio 0.30..0.45 and RunSwingAndFlightRatio 0.55..0.70. |
| Confidence | medium-high |
| Applies to | [Gait Cycle](../04-gait-cycle/index.md), [Gait Phase Generator](../09-solvers/gait-phase-generator.md) |

### Running speed relationship

| Field | Value |
|---|---|
| Rule | Running speed follows step length times step frequency. |
| Source card | [Running Biomechanics](../research/source-cards/running-biomechanics.md), [Normal Gait Overview](../research/source-cards/normal-gait-overview.md) |
| External link | https://www.physio-pedia.com/Running_Biomechanics |
| Source type | gait timing relationship |
| Used from source | Cadence and step length describe locomotion timing and displacement. |
| HLS transformation | Runtime uses `Speed = StepLength * StepFrequencyHz` as a consistency formula for running and walking. |
| Confidence | high |
| Applies to | [Parameter System](../10-runtime/parameter-system.md), [Foot Target Solver](../09-solvers/foot-target-solver.md) |

### Running whole-body amplification

| Field | Value |
|---|---|
| Rule | Running has stronger whole-body dynamics than walking. |
| Source card | [Running Biomechanics](../research/source-cards/running-biomechanics.md), [Joint Kinematics Overview](../research/source-cards/joint-kinematics-overview.md) |
| External link | https://www.physio-pedia.com/Running_Biomechanics |
| Source type | running biomechanics overview / gait kinematics overview |
| Used from source | Running increases movement intensity and whole-body coordination demands. |
| HLS transformation | First-pass running multiplies walking pelvis motion, foot lift, and arm swing by 1.20..2.00 depending on channel. |
| Confidence | medium |
| Applies to | [Pelvis Solver](../09-solvers/pelvis-solver.md), [Spine Solver](../09-solvers/spine-solver.md), [Arm Swing Solver](../09-solvers/arm-swing-solver.md) |

## Numeric Data Separation

| Value | Category | Usage |
|---|---|---|
| shorter stance than walking | source-backed relationship | running phase |
| possible flight | source-backed relationship | run visualization |
| `RunStanceRatio = 0.30..0.45` | HLS tuning range | run phase generator |
| `RunCadence = 150..190 spm` | HLS tuning range | running profile |
| `RunStepLength = 0.90..1.60 m` | HLS tuning range | running profile |
| running multipliers | HLS tuning values | procedural readability |

## Open Questions

- Whether sprinting should use a separate stance ratio and torso lean range.
- How much weapon aiming should restrict running before state downgrade.
