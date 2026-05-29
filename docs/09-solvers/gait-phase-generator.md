---
id: gait-phase-generator
title: Gait Phase Generator
status: draft
version: 26.529.2238
tags:
  - solver
  - gait
  - phase
  - provenance
---

# Gait Phase Generator

## Purpose

Generates stable normalized gait phase for walking and running.

This is the rhythm source for feet, pelvis, spine, and arms.

## Inputs

- deltaTime
- speed
- desiredSpeed
- gaitType
- modifiers

## Outputs

- gaitPhase: 0..1
- cadence
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

## Runtime Rule

Each update advances phase by cadence times deltaTime, wraps it into 0..1, and derives leg phases from it.

## Implementation Notes

Phase continuity is more important than exact biomechanical timing. A small timing error is less visible than a phase pop.

## Rule Provenance

### Normalized gait phase

| Field | Value |
|---|---|
| Rule | Gait phase is normalized from 0 to 1 and wraps continuously. |
| Source card | `docs/research/source-cards/normal-gait-overview.md`, `docs/research/source-cards/procedural-animation-overview.md` |
| External link | https://www.physio-pedia.com/The_Gait_Cycle |
| Source type | gait overview plus procedural animation abstraction |
| Used from source | Walking is cyclic and can be divided into repeated phases. |
| HLS transformation | Converted clinical gait cycle into normalized runtime `gaitPhase`. |
| Confidence | high |
| Applies to | `Walking`, `Running`, `FootTargetSolver`, `ArmSwingSolver` |

### Left and right leg phase offset

| Field | Value |
|---|---|
| Rule | Left and right legs are offset by half a cycle. |
| Source card | `docs/research/source-cards/normal-gait-overview.md` |
| External link | https://teachmeanatomy.info/lower-limb/misc/gait-cycle/ |
| Source type | gait overview |
| Used from source | Human walking alternates left and right support/swing phases. |
| HLS transformation | `rightLegPhase = (leftLegPhase + 0.5) % 1.0`. |
| Confidence | high |
| Applies to | `FootTargetSolver`, `PelvisSolver`, `ArmSwingSolver` |

### Walking stance and swing ratio

| Field | Value |
|---|---|
| Rule | Walking uses longer stance than swing; default stance ratio is about 0.60. |
| Source card | `docs/research/source-cards/normal-gait-overview.md` |
| External link | https://www.physio-pedia.com/The_Gait_Cycle |
| Source type | clinical / educational gait overview |
| Used from source | Normal walking is commonly described with stance around 60 percent and swing around 40 percent. |
| HLS transformation | Added `stanceRatio` and `swingRatio` outputs with walk defaults. |
| Confidence | high for relationship, medium for exact runtime default |
| Applies to | `docs/04-gait-cycle/index.md`, `docs/05-walking/index.md` |

### Running support mode and flight

| Field | Value |
|---|---|
| Rule | Running uses a separate phase profile and may include flight. |
| Source card | `docs/research/source-cards/running-biomechanics.md` |
| External link | https://www.physio-pedia.com/Running_Biomechanics |
| Source type | running biomechanics overview |
| Used from source | Running differs from walking by support timing and aerial behavior. |
| HLS transformation | Added run-specific stance/swing values and `supportMode = flight`. |
| Confidence | high for distinction, medium for exact phase bands |
| Applies to | `docs/06-running/index.md`, `FootTargetSolver`, `PelvisSolver` |

### Modifier phase warping

| Field | Value |
|---|---|
| Rule | Load, injury, slope, and fatigue may alter cadence or phase ratios but must preserve continuity. |
| Source card | `docs/research/source-cards/load-carriage-posture.md`, `docs/research/source-cards/antalgic-gait.md`, `docs/research/source-cards/stairs-and-slopes.md` |
| External link | https://www.ncbi.nlm.nih.gov/books/NBK559243/ |
| Source type | load carriage, clinical gait, terrain locomotion topics |
| Used from source | Load, pain, and terrain affect gait timing and movement quality. |
| HLS transformation | ModifierResolver changes cadence, stance ratio, and side-specific stance while GaitPhaseGenerator preserves continuous phase. |
| Confidence | medium |
| Applies to | `ModifierStacking`, `Injury`, `Slope`, `Stairs`, `Backpack` |

### Phase continuity priority

| Field | Value |
|---|---|
| Rule | Phase continuity is more important than exact timing during runtime corrections. |
| Source card | `docs/research/source-cards/motion-matching.md`, `docs/research/source-cards/lafan1.md` |
| External link | https://github.com/ubisoft/ubisoft-laforge-animation-dataset |
| Source type | animation continuity / dataset validation reference |
| Used from source | Transition quality and temporal continuity are important for believable animation. |
| HLS transformation | Network smoothing and state transitions should warp phase gradually instead of resetting it. |
| Confidence | high as game animation rule |
| Applies to | `Networking`, `PoseComposer`, `Validation Methodology` |

## Numeric Data Separation

| Value | Category | Usage |
|---|---|---|
| `WalkStanceRatio ≈ 0.60` | source-backed default | walking phase baseline |
| `WalkSwingRatio ≈ 0.40` | source-backed default | walking phase baseline |
| `RunStanceRatio = 0.30..0.45` | HLS tuning range | running profile |
| cadence curves | HLS tuning values | speed-to-phase mapping |
| modifier phase multipliers | HLS tuning values | load/injury/terrain response |

## Open Questions

- Exact cadence curves for walk, jog, run, sprint.
- Whether slow jog should always include flight.
- How to resync remote proxy phase without visible foot pops.
- Whether injury should modify cadence globally or side-specific stance first.
