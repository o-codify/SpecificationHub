---
id: gait-phase-generator
title: Gait Phase Generator
status: review
version: 26.530.1312
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

Generates stable normalized gait phase for walking and running.

This is the rhythm source for feet, pelvis, spine, and arms.

## Inputs

- deltaTime, seconds
- speed, meters per second
- desiredSpeed, meters per second
- cadence, steps per minute when supplied externally
- gaitType
- modifiers

## Outputs

- gaitPhase: 0..1
- cadence, steps per minute
- leftLegPhase
- rightLegPhase
- supportMode
- stanceRatio
- swingRatio

## Rules

- Phase is normalized from 0 to 1.
- Phase speed is driven by cadence.
- Cadence increases with movement speed.
- Left and right legs are offset by 0.5.
- Walking uses longer stance than swing.
- Running uses shorter stance than walking and may enter flight.
- Modifiers may change cadence, stance ratio, and swing ratio but should not break phase continuity.
- Network smoothing must not reset phase abruptly.
- Cadence, speed, and step length must remain dimensionally consistent.

## Runtime Rule

Each update advances phase by cadence times deltaTime, wraps it into 0..1, and derives leg phases from it.

```text
StepFrequencyHz = CadenceSPM / 60
StrideFrequencyHz = StepFrequencyHz / 2
PhaseDelta = deltaTime * StrideFrequencyHz
GaitPhase = fract(GaitPhase + PhaseDelta)
LeftLegPhase = GaitPhase
RightLegPhase = fract(GaitPhase + 0.5)
SpeedMetersPerSecond = StepLengthMeters * StepFrequencyHz

WalkStanceRatio = clamp(ResolvedWalkStanceRatio, 0.58, 0.62)
WalkSwingRatio = 1 - WalkStanceRatio
RunStanceRatio = clamp(ResolvedRunStanceRatio, 0.30, 0.45)
RunSwingAndFlightRatio = 1 - RunStanceRatio
```

## Implementation Notes

Phase continuity is more important than exact biomechanical timing. A small timing error is less visible than a phase pop.

For first-pass tuning, ordinary walking should start around 100..120 steps/minute. Jog/run should start around 150..190 steps/minute. These values are gameplay scales and should be adjusted by character height, authored movement speed, load, injury, and network smoothing.

## Rule Provenance

### Normalized gait phase

| Field | Value |
|---|---|
| Rule | Gait phase is normalized from 0 to 1 and wraps continuously. |
| Source card | [Normal Gait Overview](../research/source-cards/normal-gait-overview.md), [Procedural Animation Overview](../research/source-cards/procedural-animation-overview.md) |
| External link | https://www.physio-pedia.com/The_Gait_Cycle |
| Source type | gait overview plus procedural animation abstraction |
| Used from source | Walking is cyclic and can be divided into repeated phases. |
| HLS transformation | Converted clinical gait cycle into normalized runtime `gaitPhase` advanced by `PhaseDelta = deltaTime * CadenceSPM / 120`. |
| Confidence | high |
| Applies to | [Walking](../05-walking/index.md), [Running](../06-running/index.md), [Foot Target Solver](./foot-target-solver.md), [Arm Swing Solver](./arm-swing-solver.md) |

### Left and right leg phase offset

| Field | Value |
|---|---|
| Rule | Left and right legs are offset by half a cycle. |
| Source card | [Normal Gait Overview](../research/source-cards/normal-gait-overview.md) |
| External link | https://teachmeanatomy.info/lower-limb/misc/gait-cycle/ |
| Source type | gait overview |
| Used from source | Human walking alternates left and right support/swing phases. |
| HLS transformation | `rightLegPhase = (leftLegPhase + 0.5) % 1.0`. |
| Confidence | high |
| Applies to | [Foot Target Solver](./foot-target-solver.md), [Pelvis Solver](./pelvis-solver.md), [Arm Swing Solver](./arm-swing-solver.md) |

### Walking stance and swing ratio

| Field | Value |
|---|---|
| Rule | Walking uses longer stance than swing; default stance ratio is about 0.60. |
| Source card | [Normal Gait Overview](../research/source-cards/normal-gait-overview.md) |
| External link | https://www.physio-pedia.com/The_Gait_Cycle |
| Source type | clinical / educational gait overview |
| Used from source | Normal walking is commonly described with stance around 60 percent and swing around 40 percent. |
| HLS transformation | Added `stanceRatio` and `swingRatio` outputs with walk defaults. First-pass ordinary walking clamp is 0.58..0.62. |
| Confidence | high for relationship, medium for exact runtime default |
| Applies to | [Gait Cycle](../04-gait-cycle/index.md), [Walking](../05-walking/index.md) |

### Running support mode and flight

| Field | Value |
|---|---|
| Rule | Running uses a separate phase profile and may include flight. |
| Source card | [Running Biomechanics](../research/source-cards/running-biomechanics.md) |
| External link | https://www.physio-pedia.com/Running_Biomechanics |
| Source type | running biomechanics overview |
| Used from source | Running differs from walking by support timing and aerial behavior. |
| HLS transformation | Added run-specific stance/swing values and `supportMode = flight`. First-pass run stance range is 0.30..0.45. |
| Confidence | high for distinction, medium for exact phase bands |
| Applies to | [Running](../06-running/index.md), [Foot Target Solver](./foot-target-solver.md), [Pelvis Solver](./pelvis-solver.md) |

### Modifier phase warping

| Field | Value |
|---|---|
| Rule | Load, injury, slope, and fatigue may alter cadence or phase ratios but must preserve continuity. |
| Source card | [Load Carriage Posture](../research/source-cards/load-carriage-posture.md), [Antalgic Gait](../research/source-cards/antalgic-gait.md), [Stairs and Slopes](../research/source-cards/stairs-and-slopes.md) |
| External link | https://www.ncbi.nlm.nih.gov/books/NBK559243/ |
| Source type | load carriage, clinical gait, terrain locomotion topics |
| Used from source | Load, pain, and terrain affect gait timing and movement quality. |
| HLS transformation | ModifierResolver changes cadence, stance ratio, and side-specific stance while GaitPhaseGenerator preserves continuous phase. Side-specific injury should bias stance ratio before globally lowering cadence. |
| Confidence | medium |
| Applies to | [Modifier Stacking](../10-runtime/modifier-stacking.md), [Injury and Limping Modifier](../08-modifiers/injury-limping.md), [Slope Modifier](../08-modifiers/slope.md), [Stairs Modifier](../08-modifiers/stairs.md), [Backpack Load Modifier](../08-modifiers/backpack-load.md) |

### Phase continuity priority

| Field | Value |
|---|---|
| Rule | Phase continuity is more important than exact timing during runtime corrections. |
| Source card | [Motion Matching](../research/source-cards/motion-matching.md), [LaFAN1](../research/source-cards/lafan1.md) |
| External link | https://github.com/ubisoft/ubisoft-laforge-animation-dataset |
| Source type | animation continuity / dataset validation reference |
| Used from source | Transition quality and temporal continuity are important for believable animation. |
| HLS transformation | Network smoothing and state transitions should warp phase gradually instead of resetting it. First-pass correction should blend phase error over 0.10..0.30 seconds unless teleporting. |
| Confidence | high as game animation rule |
| Applies to | [Networking](../10-runtime/networking.md), [Pose Composer](./pose-composer.md), [Validation Methodology](../research/validation-methodology.md) |

## Numeric Data Separation

| Value | Category | Usage |
|---|---|---|
| `WalkStanceRatio ≈ 0.60` | source-backed default | walking phase baseline |
| `WalkSwingRatio ≈ 0.40` | source-backed default | walking phase baseline |
| `WalkStanceRatio = 0.58..0.62` | HLS tuning range | ordinary walking clamp |
| `WalkCadence = 100..120 spm` | HLS tuning range | first-pass comfortable walk |
| `RunStanceRatio = 0.30..0.45` | HLS tuning range | running profile |
| `RunCadence = 150..190 spm` | HLS tuning range | first-pass jog/run profile |
| `PhaseCorrectionTime = 0.10..0.30 s` | HLS tuning range | network and transition smoothing |
| cadence curves | HLS tuning values | speed-to-phase mapping |
| modifier phase multipliers | HLS tuning values | load/injury/terrain response |

## Open Questions

- Exact cadence curves for walk, jog, run, sprint.
- Whether slow jog should always include flight.
- How to resync remote proxy phase without visible foot pops.
- Whether injury should modify cadence globally or side-specific stance first.
