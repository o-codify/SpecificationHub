---
id: parameter-system
title: Parameter System
status: review
version: 26.530.1623
tags:
  - runtime
  - parameters
  - provenance
  - links
  - numeric
---

# Parameter System

## Purpose

Defines runtime parameters, first-pass numeric ranges, and safety clamps used by HLS solvers.

The parameter system converts gameplay input, locomotion state, character scale, and modifiers into resolved values consumed by solvers.

## Runtime Contract

```text
CharacterInputState
  -> LocomotionStateResolver
  -> ParameterSystem / ModifierResolver
  -> ResolvedParameters
  -> Solvers
```

## Gait Parameters

| Parameter | First-pass range | Usage |
|---|---:|---|
| WalkCadence | 100..120 spm | walking timing |
| RunCadence | 150..190 spm | running timing |
| WalkStanceRatio | 0.58..0.62 | walking stance |
| RunStanceRatio | 0.30..0.45 | running stance |
| WalkStepLength | 0.60..0.80 m | walking speed sanity |
| RunStepLength | 0.90..1.60 m | running speed sanity |
| StepWidth | 0.08..0.22 m | support width |
| FootLift | 0.04..0.10 m | flat-ground clearance |

## Solver Parameters

| Parameter | First-pass range | Usage |
|---|---:|---|
| PelvisVerticalAmplitude | 0.02..0.05 m | walking pelvis rhythm |
| RunPelvisMultiplier | 1.25..2.00 | running pelvis amplification |
| PelvisYawAmplitude | 2..6 deg | pelvis rhythm |
| PelvisRollAmplitude | 1..4 deg | weight transfer |
| PelvisPitchBias | -10..15 deg | slope/load/posture |
| PelvisSmoothing | 0.08..0.20 s | continuity |
| TorsoLeanWalk | 0..5 deg | walking posture |
| TorsoLeanRun | 5..15 deg | running posture |
| TorsoRollClamp | -10..10 deg | load/injury bias clamp |
| ShoulderCounterRotation | 0.5..1.0 | opposite pelvis yaw |
| WalkArmSwing | 10..35 deg | walking arm swing |
| RunArmMultiplier | 1.20..1.75 | running arm drive |

## Modifier Parameters

| Parameter | First-pass range | Usage |
|---|---:|---|
| StepLengthMultiplier | 0.65..1.20 | load/injury/terrain |
| CadenceMultiplier | 0.70..1.15 | load/injury/fatigue |
| SpeedMultiplier | 0.50..1.15 | global movement effect |
| ArmSwingMultiplier | 0.00..1.75 | running/load/weapon |
| TurnSpeedMultiplier | 0.40..1.10 | turning/load/weapon |
| FootClearanceBonus | 0.00..0.20 m | slope/stairs |
| SevereInjuryThreshold | 0.65..0.80 | state downgrade |
| HeavyLoadThreshold | 0.65..0.80 | state downgrade |

## Terrain Parameters

| Parameter | First-pass range | Usage |
|---|---:|---|
| SlopeActivationAngle | 3..5 deg | slope modifier activation |
| ExtremeSlopeAngle | 25..35 deg | steep slope response |
| SlopeFootLiftBonus | 0.002..0.006 m/deg | uphill clearance |
| StepHeight | 0.10..0.25 m | stair traversal |
| StepDepth | 0.22..0.35 m | stair traversal |
| StairFootClearanceBonus | 0.03..0.08 m | stair clearance |
| TreadConfidence | 0.60..0.80 | stair override confidence |

## Network / Continuity Parameters

| Parameter | First-pass range | Usage |
|---|---:|---|
| PoseSmoothing | 0.08..0.20 s | pose continuity |
| PhaseCorrectionTime | 0.10..0.30 s | network phase correction |
| MinimumStateTime | 0.15..0.35 s | anti-flicker |
| StateConfidenceSmoothing | 0.08..0.20 s | state smoothing |
| TeleportPhaseSnapThreshold | 0.35..0.50 cycle | hard phase reset |

## Safety Clamps

```text
MinimumStepLength = 0.20 m
MaximumStepLength = 0.80..1.10 * LegLength
StanceRatioClamp = 0.30..0.75
MaxTorsoLean = 20 deg
MaxPelvisOffset = 0.10..0.18 * LegLength
MaxFootLift = 0.30 m before stair override
IKReach = 0.85..0.95 * LegLength
FootOrientationClamp = 25 deg pitch/roll
```

## Rules

- Source-backed relationships, HLS tuning ranges, and runtime clamps must remain distinguishable.
- Modifiers resolve to parameters before solver execution.
- Solvers should consume ResolvedParameters rather than raw gameplay state when possible.
- Safety clamps must run before OutputPose.
- Clamped values must emit debug warnings.

## Rule Provenance

### Gait parameter ranges

| Field | Value |
|---|---|
| Rule | Walking and running use distinct cadence, stance ratio, and step length ranges. |
| Source card | [Normal Gait Overview](../research/source-cards/normal-gait-overview.md), [Running Biomechanics](../research/source-cards/running-biomechanics.md) |
| External link | https://www.physio-pedia.com/The_Gait_Cycle |
| Source type | gait overview / running biomechanics overview |
| Used from source | Walking and running have different timing and support structure. |
| HLS transformation | First-pass HLS ranges define cadence, stance ratio, and step length for procedural runtime. |
| Confidence | medium-high |
| Applies to | [Gait Cycle](../04-gait-cycle/index.md), [Walking](../05-walking/index.md), [Running](../06-running/index.md) |

### Parameters before solvers

| Field | Value |
|---|---|
| Rule | Runtime resolves parameters before solver execution. |
| Source card | [Procedural Animation Overview](../research/source-cards/procedural-animation-overview.md), [Load Carriage Posture](../research/source-cards/load-carriage-posture.md), [Antalgic Gait](../research/source-cards/antalgic-gait.md) |
| External link | https://dev.epicgames.com/documentation/en-us/unreal-engine/control-rig-in-unreal-engine |
| Source type | procedural animation architecture / modifier references |
| Used from source | Procedural animation can solve from runtime controls; load and injury alter gait and posture. |
| HLS transformation | ParameterSystem / ModifierResolver produces ResolvedParameters for phase, foot, pelvis, spine, arm, and pose composition solvers. |
| Confidence | high as architecture rule |
| Applies to | [Runtime Update Order](./update-order.md), [Solver Interfaces](./solver-interfaces.md), [Modifier Stacking](./modifier-stacking.md) |

### Safety clamps before output

| Field | Value |
|---|---|
| Rule | Runtime values must be clamped before final OutputPose. |
| Source card | [IK Foot Placement](../research/source-cards/ik-foot-placement.md), [Procedural Animation Overview](../research/source-cards/procedural-animation-overview.md) |
| External link | https://dev.epicgames.com/documentation/en-us/unreal-engine/full-body-ik-in-unreal-engine |
| Source type | IK implementation constraint / procedural architecture |
| Used from source | Procedural targets and IK goals must remain reachable and stable before rig application. |
| HLS transformation | Added step, stance, torso, pelvis, foot lift, and IK reach clamps. Clamp changes emit debug warnings. |
| Confidence | high |
| Applies to | [Runtime Constraints](./constraints.md), [Output Pose](./output-pose.md), [Debug Visualization](./debug-visualization.md) |

### Numeric data separation

| Field | Value |
|---|---|
| Rule | Source-backed facts, HLS tuning ranges, and clamps must stay separated. |
| Source card | [Research Provenance Methodology](../research/provenance-methodology.md) |
| External link | [Research Provenance Methodology](../research/provenance-methodology.md) |
| Source type | HLS methodology |
| Used from source | Runtime docs should identify where values come from and how they are transformed. |
| HLS transformation | Parameter tables identify first-pass ranges and usage; provenance tables explain source versus HLS transformation. |
| Confidence | high |
| Applies to | all numeric runtime docs |

## Numeric Data Separation

| Value | Category | Usage |
|---|---|---|
| walking stance longer than swing | source-backed relationship | gait timing |
| running shorter stance / possible flight | source-backed relationship | gait timing |
| gait and solver ranges | HLS tuning ranges | runtime control |
| safety clamps | HLS implementation rules | prevent invalid output |
| debug warnings | HLS tooling requirement | validation and tuning |

## Open Questions

- Exact per-character scaling policy for very short/tall characters.
- Whether sprinting should have separate cadence, stance, and lean ranges.
- Which parameter groups should become Unreal data assets first.
