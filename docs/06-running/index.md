---
id: running
title: Running
status: draft
version: 26.530.1039
tags:
  - running
  - gait
  - locomotion
  - provenance
  - links
  - numeric
---

# Running

## Purpose

Defines procedural running for HLS.

Running is not just faster walking. It has different support timing, stronger vertical motion, stronger arm drive, and more forward commitment.

## Visual Target

Level 3 Alive Game Motion.

The character should look like they are projecting the body forward, not simply playing a sped-up walk. Running should show flight, impact, rebound, torso lean, and arm drive.

## Inputs

- speed, meters per second
- cadence, steps per minute
- gaitPhase, normalized 0..1 stride phase
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
- Speed, stride, and cadence must remain dimensionally consistent.

## Suggested Parameters

- RunStanceRatio: 0.30 to 0.45.
- RunSwingAndFlightRatio: 0.55 to 0.70.
- RunCadence: first-pass gameplay reference 150 to 190 steps per minute.
- RunStepLength: first-pass gameplay reference 0.90 to 1.60 meters, character-scale dependent.
- RunSpeed: first-pass jog/run reference 2.5 to 6.0 m/s.
- FlightRatio: `max(0, 1 - RunStanceRatio * 2)` as a first-pass symmetric approximation.
- PelvisVerticalAmplitude: 1.25 to 2.00 times walking amplitude.
- FootLiftHeight: 1.25 to 2.00 times walking foot lift.
- ArmSwingAmplitude: 1.20 to 1.75 times walking arm swing unless constrained.
- TorsoLean: first-pass flat-ground range 5 to 15 degrees, increasing with speed.

```text
StepFrequencyHz = Cadence / 60
Speed = StepLength * StepFrequencyHz
StrideFrequencyHz = StepFrequencyHz / 2
StrideDuration = 1 / StrideFrequencyHz
StanceDuration = StrideDuration * RunStanceRatio
SwingAndFlightDuration = StrideDuration * (1 - RunStanceRatio)
```

## Runtime Bands

The exact phase bands are implementation ranges, not strict biomechanics.

- 0.00 to 0.35: stance and loading.
- 0.35 to 0.50: push off.
- 0.50 to 0.75: flight and early swing.
- 0.75 to 1.00: terminal swing and next contact preparation.

For slower jogs, HLS may raise stance toward 0.45 and reduce visible flight. For faster runs, HLS may lower stance toward 0.30 and increase flight readability.

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
| Source card | [Running Biomechanics](../research/source-cards/running-biomechanics.md) |
| External link | https://www.physio-pedia.com/Running_Biomechanics |
| Source type | biomechanics overview |
| Used from source | Running differs from walking in support timing and body dynamics. |
| HLS transformation | Created a separate Running doc and running solver profile instead of scaling walk speed. HLS keeps run stance below walking stance and increases vertical and arm amplitudes. |
| Confidence | high for distinction, medium for exact values |
| Applies to | [Gait Phase Generator](../09-solvers/gait-phase-generator.md), [Foot Target Solver](../09-solvers/foot-target-solver.md), [Pelvis Solver](../09-solvers/pelvis-solver.md), [Arm Swing Solver](../09-solvers/arm-swing-solver.md) |

### Flight phase

| Field | Value |
|---|---|
| Rule | Running can enter `supportMode = flight`. |
| Source card | [Running Biomechanics](../research/source-cards/running-biomechanics.md) |
| External link | https://www.ncbi.nlm.nih.gov/pmc/articles/PMC7575155/ |
| Source type | biomechanics overview |
| Used from source | Running includes aerial / flight behavior unlike ordinary walking double support. |
| HLS transformation | Added flight support mode and run-specific runtime bands. First-pass flight amount can be derived from `max(0, 1 - RunStanceRatio * 2)` for symmetric left/right stance timing. |
| Confidence | high |
| Applies to | [Gait Cycle](../04-gait-cycle/index.md), [Running](./index.md) |

### Stronger arm swing and pelvis bounce

| Field | Value |
|---|---|
| Rule | Running uses stronger arm swing and higher pelvis vertical amplitude than walking. |
| Source card | [Running Biomechanics](../research/source-cards/running-biomechanics.md) |
| External link | https://www.physio-pedia.com/Running_Biomechanics |
| Source type | biomechanics overview plus HLS visual inference |
| Used from source | Running has stronger whole-body dynamics than walking. |
| HLS transformation | Exposed `ArmSwingAmplitude`, `FootLiftHeight`, and `PelvisVerticalAmplitude` as scaled run parameters. First-pass HLS uses pelvis and foot lift multipliers of 1.25..2.00 against walking. |
| Confidence | medium |
| Applies to | [Arm Swing Solver](../09-solvers/arm-swing-solver.md), [Pelvis Solver](../09-solvers/pelvis-solver.md) |

### Load and injury degrade running

| Field | Value |
|---|---|
| Rule | Heavy load and injury can downgrade or restrict running. |
| Source card | [Load Carriage Posture](../research/source-cards/load-carriage-posture.md), [Antalgic Gait](../research/source-cards/antalgic-gait.md) |
| External link | https://www.ncbi.nlm.nih.gov/books/NBK559243/ |
| Source type | load carriage topic, clinical gait reference, HLS gameplay inference |
| Used from source | Load changes posture and gait; pain-related gait protects the painful limb. |
| HLS transformation | [Locomotion State Resolver](../10-runtime/locomotion-state-resolver.md) can downgrade run to jog, walk, or limp when modifiers exceed thresholds. Load and injury should reduce cadence ceiling, step length, and vertical amplitude before producing extreme poses. |
| Confidence | medium |
| Applies to | [Locomotion State Resolver](../10-runtime/locomotion-state-resolver.md), [Modifier Stacking](../10-runtime/modifier-stacking.md) |

## Numeric Data Separation

| Value | Category | Usage |
|---|---|---|
| run stance shorter than walk stance | source-backed relationship | lower `RunStanceRatio` |
| flight phase exists | source-backed relationship | `supportMode = flight` |
| `RunStanceRatio = 0.30..0.45` | HLS tuning range | first-pass runtime default |
| `RunCadence = 150..190 spm` | HLS tuning range | first-pass jog/run cadence scale |
| `RunSpeed = 2.5..6.0 m/s` | HLS tuning range | gameplay locomotion scale |
| `TorsoLean = 5..15 deg` | HLS tuning range | readable forward commitment |
| runtime phase bands | HLS tuning ranges | implementation control bands |

## Open Questions

- Exact blend between walk, jog, and run.
- Whether flight should be represented explicitly in slow jog.
- How to keep networked foot contacts stable during fast movement.
