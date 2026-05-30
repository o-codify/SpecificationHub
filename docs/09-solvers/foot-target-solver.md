---
id: foot-target-solver
title: Foot Target Solver
status: review
version: 26.530.1543
tags:
  - solver
  - feet
  - ik
  - provenance
  - links
  - numeric
---

# Foot Target Solver

## Purpose

Computes procedural foot targets from gait phase, movement intent, terrain, stairs, slope, and runtime modifiers.

The foot target solver is responsible for believable foot placement before IK applies the final skeletal result.

## Inputs

- gait phase output
- resolved step length
- resolved step width
- resolved foot lift
- movement direction
- facing direction
- speed
- ground trace data
- slope data
- stair data
- load, injury, weapon, and turning modifiers

## Outputs

- left foot target
- right foot target
- contact state
- stance or swing state
- foot lock state
- surface normal
- target reach warning
- debug trace information

## Runtime Formula

```text
StepFrequencyHz = CadenceSPM / 60
StepLengthMeters = SpeedMetersPerSecond / max(StepFrequencyHz, 0.01)
StepLengthMeters = clamp(StepLengthMeters, MinStepLength, MaxStepLength)
StepWidthMeters = clamp(ResolvedStepWidth, 0.08, 0.22)
FlatFootLiftMeters = clamp(ResolvedFootLift, 0.04, 0.10)
RunFootLiftMeters = FlatFootLiftMeters * 1.25..2.00
SlopeFootLiftBonus = max(0, SlopeDegrees) * 0.002..0.006 meters/degree
MaxTargetReach = LegLength * 0.85..0.95
```

## Rules

- Foot targets should be generated from phase and movement intent, then corrected by terrain traces.
- Locked stance feet should not slide unless correction is safer than popping.
- Step width should remain wide enough for readable support.
- Step length should clamp by character scale and leg reach.
- Flat-ground foot lift should remain low; slope and stairs may add clearance.
- Injury, load, weapon, and turning modifiers may shorten steps or reduce confidence.
- Foot target output must expose warnings when reach or trace data is invalid.

## Rule Provenance

### IK target reach and foot locking

| Field | Value |
|---|---|
| Rule | Foot targets must remain reachable and contact-stable. |
| Source card | [IK Foot Placement](../research/source-cards/ik-foot-placement.md), [Unreal Engine IK Rig](../research/source-cards/unreal-engine-ik-rig.md) |
| External link | https://dev.epicgames.com/documentation/en-us/unreal-engine/ik-rig-in-unreal-engine |
| Source type | IK implementation constraint |
| Used from source | IK systems need reachable targets and stable contact constraints. |
| HLS transformation | First-pass MaxTargetReach is 0.85..0.95 * LegLength. Foot lock state is preserved through OutputPose and Debug Visualization. |
| Confidence | high |
| Applies to | [Runtime Constraints](../10-runtime/constraints.md), [Output Pose](../10-runtime/output-pose.md) |

### Step length from speed and cadence

| Field | Value |
|---|---|
| Rule | Step length should stay consistent with speed and cadence. |
| Source card | [Normal Gait Overview](../research/source-cards/normal-gait-overview.md), [Running Biomechanics](../research/source-cards/running-biomechanics.md) |
| External link | https://www.physio-pedia.com/The_Gait_Cycle |
| Source type | gait timing relationship |
| Used from source | Cadence and step length describe locomotion timing and displacement. |
| HLS transformation | Runtime derives `StepLengthMeters = SpeedMetersPerSecond / StepFrequencyHz` and clamps to character-specific limits. |
| Confidence | high |
| Applies to | [Gait Cycle](../04-gait-cycle/index.md), [Parameter System](../10-runtime/parameter-system.md) |

### Terrain and stair clearance

| Field | Value |
|---|---|
| Rule | Terrain and stairs can increase foot clearance and alter targets. |
| Source card | [Stairs and Slopes](../research/source-cards/stairs-and-slopes.md), [IK Foot Placement](../research/source-cards/ik-foot-placement.md) |
| External link | https://www.physio-pedia.com/Stair_Gait |
| Source type | terrain gait / IK implementation constraint |
| Used from source | Stairs and slopes require adjusted foot placement and clearance. |
| HLS transformation | Flat foot lift is 0.04..0.10 m; slope bonus is 0.002..0.006 m per uphill degree; stairs may add StepHeight-based clearance. |
| Confidence | medium-high |
| Applies to | [Slope Modifier](../08-modifiers/slope.md), [Stairs Modifier](../08-modifiers/stairs.md), [Runtime Constraints](../10-runtime/constraints.md) |

### Modifiers alter step placement

| Field | Value |
|---|---|
| Rule | Load, injury, weapon, and turning states can shorten or redirect steps. |
| Source card | [Load Carriage Posture](../research/source-cards/load-carriage-posture.md), [Antalgic Gait](../research/source-cards/antalgic-gait.md), [Gait Transitions and Turning](../research/source-cards/gait-transitions-turning.md) |
| External link | https://www.ncbi.nlm.nih.gov/books/NBK559243/ |
| Source type | modifier-related locomotion references |
| Used from source | Load, pain, and transitions alter gait and posture. |
| HLS transformation | Step length reductions from load/injury use first-pass 10..35 percent before global clamps. Turning may widen step width up to 1.25 multiplier. |
| Confidence | medium |
| Applies to | [Modifier Stacking](../10-runtime/modifier-stacking.md), [Turning, Starting, and Stopping](../08-modifiers/turning-start-stop.md) |

## Numeric Data Separation

| Value | Category | Usage |
|---|---|---|
| reachable IK targets | implementation constraint | foot target safety |
| stable stance foot contact | implementation constraint | foot lock |
| `StepWidth = 0.08..0.22 m` | HLS tuning range | support width |
| `FlatFootLift = 0.04..0.10 m` | HLS tuning range | flat clearance |
| `MaxTargetReach = 0.85..0.95 * LegLength` | HLS safety clamp | IK reach |
| `SlopeFootLiftBonus = 0.002..0.006 m/deg` | HLS tuning range | uphill clearance |
| `Step length reduction = 10..35%` | HLS tuning range | load/injury |

## Open Questions

- How much foot sliding is acceptable on simulated proxies.
- Whether foot lock should be replicated for high-fidelity multiplayer.
