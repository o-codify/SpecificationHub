---
id: running
title: Running
status: draft
version: 26.529.2223
tags:
  - running
  - gait
  - locomotion
  - provenance
---

# Running

## Purpose

Defines procedural running for HLS.

Running is not just faster walking. It has different support timing, stronger vertical motion, stronger arm drive, and more forward commitment.

## Visual Target

Level 3 Alive Game Motion.

The character should look like they are projecting the body forward, not simply playing a sped-up walk. Running should show flight, impact, rebound, torso lean, and arm drive.

## Inputs

- speed
- gaitPhase
- direction
- groundNormal
- slope
- load state
- injury state
- fatigue
- weapon or carry state

## Outputs

- left foot target
- right foot target
- pelvis transform
- spine pose
- arm pose
- support mode

## Rules

- Running has no double support.
- Running includes a flight phase.
- Stance is shorter than in walking.
- Swing is longer and more aggressive than walking.
- Pelvis vertical amplitude is higher than walking.
- Arm swing amplitude is higher than walking.
- Torso lean increases with speed.
- Heavy load reduces running quality and may force a jog.
- Injury should reduce running speed strongly and may prevent running at high severity.

## Suggested Parameters

- RunStanceRatio: 0.30 to 0.45.
- RunSwingAndFlightRatio: 0.55 to 0.70.
- PelvisVerticalAmplitude: higher than walking.
- FootLiftHeight: higher than walking.
- ArmSwingAmplitude: higher than walking.
- TorsoLean: higher than walking.

## Runtime Bands

The exact phase bands are implementation ranges, not strict biomechanics.

- 0.00 to 0.35: stance and loading.
- 0.35 to 0.50: push off.
- 0.50 to 0.75: flight and early swing.
- 0.75 to 1.00: terminal swing and next contact preparation.

## Modifier Behavior

Load reduces stride length, cadence ceiling, arm freedom, and vertical bounce.

Injury reduces stance confidence, speed, and symmetry.

Slope changes lean and foot clearance.

Fatigue reduces arm drive, rebound, and stride length.

## Rule Provenance

### Running is not sped-up walking

| Field | Value |
|---|---|
| Rule | Running uses a separate gait profile from walking. |
| Source card | `docs/research/source-cards/running-biomechanics.md` |
| External link | https://www.physio-pedia.com/Running_Biomechanics |
| Source type | biomechanics overview |
| Used from source | Running differs from walking in support timing and body dynamics. |
| HLS transformation | Created a separate Running doc and running solver profile instead of scaling walk speed. |
| Confidence | high for distinction, medium for exact values |
| Applies to | `GaitPhaseGenerator`, `FootTargetSolver`, `PelvisSolver`, `ArmSwingSolver` |

### Flight phase

| Field | Value |
|---|---|
| Rule | Running can enter `supportMode = flight`. |
| Source card | `docs/research/source-cards/running-biomechanics.md` |
| External link | https://www.ncbi.nlm.nih.gov/pmc/articles/PMC7575155/ |
| Source type | biomechanics overview |
| Used from source | Running includes aerial / flight behavior unlike ordinary walking double support. |
| HLS transformation | Added flight support mode and run-specific runtime bands. |
| Confidence | high |
| Applies to | `docs/04-gait-cycle/index.md`, `docs/06-running/index.md` |

### Stronger arm swing and pelvis bounce

| Field | Value |
|---|---|
| Rule | Running uses stronger arm swing and higher pelvis vertical amplitude than walking. |
| Source card | `docs/research/source-cards/running-biomechanics.md` |
| External link | https://www.physio-pedia.com/Running_Biomechanics |
| Source type | biomechanics overview plus HLS visual inference |
| Used from source | Running has stronger whole-body dynamics than walking. |
| HLS transformation | Exposed `ArmSwingAmplitude` and `PelvisVerticalAmplitude` as higher run parameters. |
| Confidence | medium |
| Applies to | `ArmSwingSolver`, `PelvisSolver` |

### Load and injury degrade running

| Field | Value |
|---|---|
| Rule | Heavy load and injury can downgrade or restrict running. |
| Source card | `docs/research/source-cards/load-carriage-posture.md`, `docs/research/source-cards/antalgic-gait.md` |
| External link | https://www.ncbi.nlm.nih.gov/books/NBK559243/ |
| Source type | load carriage topic, clinical gait reference, HLS gameplay inference |
| Used from source | Load changes posture and gait; pain-related gait protects the painful limb. |
| HLS transformation | LocomotionStateResolver can downgrade run to jog, walk, or limp when modifiers exceed thresholds. |
| Confidence | medium |
| Applies to | `docs/10-runtime/locomotion-state-resolver.md`, `docs/10-runtime/modifier-stacking.md` |

## Numeric Data Separation

| Value | Category | Usage |
|---|---|---|
| run stance shorter than walk stance | source-backed relationship | lower `RunStanceRatio` |
| flight phase exists | source-backed relationship | `supportMode = flight` |
| `RunStanceRatio = 0.30..0.45` | HLS tuning range | first-pass runtime default |
| runtime phase bands | HLS tuning ranges | implementation control bands |

## Open Questions

- Exact blend between walk, jog, and run.
- Whether flight should be represented explicitly in slow jog.
- How to keep networked foot contacts stable during fast movement.
