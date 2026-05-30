---
id: turning-starting-and-stopping
title: Turning, Starting, and Stopping
status: review
version: 26.530.1346
tags:
  - modifier
  - turning
  - start
  - stop
  - provenance
  - links
  - numeric
---

# Turning, Starting, and Stopping

## Purpose

Defines visual rules for starting, stopping, turning in place, turning while moving, pivot steps, sidestep, and backward walking.

These actions are visual rules that make momentum and intention readable.

## Starting Rules

- Body leans slightly toward movement direction before full speed.
- First step may be shorter and more deliberate.
- Arms begin moving after lower body starts.
- Loaded characters start more slowly.
- Injured characters avoid starting from the painful side.
- Start transition should trigger from acceleration, not only from nonzero speed.

## Stopping Rules

- Torso compensates backward during deceleration.
- Step length shortens near stop.
- Foot targets should land under the body to regain support.
- Heavy load increases stopping stiffness.
- Running stop needs stronger torso compensation than walking stop.
- Stop transition should trigger from deceleration and target speed drop.

## Turning While Walking

- Feet choose new targets in the turn direction.
- Pelvis begins turning before or with the feet.
- Chest and shoulders may lag behind pelvis.
- Head may look toward the target direction earlier than torso.
- Step width can widen slightly for stability.
- Turn speed can be reduced by load, injury, weapon aiming, or low confidence footing.

## Turning In Place

- Use alternating pivot steps.
- Feet should not slide in place without visible support.
- Pelvis rotates in small increments.
- Torso follows with slight lag.
- Turn-in-place should activate at low speed and sufficiently large facing error.

## Sidestep Rules

- Feet move laterally with shorter step length.
- Torso remains more upright than forward walking.
- Arms stabilize more than swing.

## Backward Walking Rules

- Shorter step length.
- Lower cadence.
- Reduced arm swing.
- More cautious foot placement.

## Parameters

- TurnRate: degrees per second, first-pass 90..360
- TurnAnticipation: seconds, first-pass 0.10..0.25
- TorsoLag: seconds, first-pass 0.08..0.20
- StepWidthMultiplier: 1.0..1.25 during turning
- StopLeanAmount: degrees, walk 0..5, run 5..12
- StartLeanAmount: degrees, 0..8
- PivotStepThreshold: 45..90 degrees
- TurnInPlaceSpeedMax: 0.20..0.40 m/s
- StartAccelThreshold: 0.50..1.50 m/s²
- StopDecelThreshold: 1.50..3.00 m/s²
- BackwardSpeedMultiplier: 1.0..0.60
- SidestepStepLengthMultiplier: 1.0..0.70

## Runtime Rule

```text
FacingErrorDeg = angleBetween(currentFacing, desiredFacing)
StartActive = speed < WalkEnterSpeed and acceleration >= 0.50..1.50 m/s²
StopActive = desiredSpeed < IdleSpeedThreshold and deceleration >= 1.50..3.00 m/s²
TurnInPlaceActive = speed <= 0.20..0.40 m/s and FacingErrorDeg >= 45..90
TurnStepWidth = BaseStepWidth * 1.0..1.25
TorsoYaw = delayed(PelvisYaw, TorsoLag 0.08..0.20 s)
StartLeanDeg = clamp(acceleration01 * 8, 0, 8)
StopLeanDeg = clamp(deceleration01 * 12, 0, 12)
TurnSpeed = BaseTurnSpeed * TurnSpeedMultiplier
```

## Rule Provenance

### Start and stop need explicit transition states

| Field | Value |
|---|---|
| Rule | Start and stop should be explicit states, not only speed changes. |
| Source card | [Gait Transitions and Turning](../research/source-cards/gait-transitions-turning.md) |
| External link | https://pubmed.ncbi.nlm.nih.gov/?term=gait+initiation+turning+walking+biomechanics |
| Source type | gait transition research topic plus HLS gameplay readability |
| Used from source | Gait initiation and stopping are transition behaviors with body preparation and support changes. |
| HLS transformation | Added Start and Stop states in [Locomotion State Resolver](../10-runtime/locomotion-state-resolver.md) with lean and step adjustments. First-pass start threshold is 0.50..1.50 m/s² and stop threshold is 1.50..3.00 m/s². |
| Confidence | medium |
| Applies to | [Locomotion State Resolver](../10-runtime/locomotion-state-resolver.md), [Spine Solver](../09-solvers/spine-solver.md), [Foot Target Solver](../09-solvers/foot-target-solver.md) |

### Turning should use foot targets and torso lag

| Field | Value |
|---|---|
| Rule | Turning should not rotate the body as one rigid block. |
| Source card | [Gait Transitions and Turning](../research/source-cards/gait-transitions-turning.md), [Pose Warping](../research/source-cards/pose-warping.md) |
| External link | https://dev.epicgames.com/documentation/en-us/unreal-engine/pose-warping-in-unreal-engine |
| Source type | locomotion topic / game animation implementation |
| Used from source | Direction changes need trajectory adaptation and pose continuity. |
| HLS transformation | Added foot target redirection, pelvis turn, chest lag, and optional head lead. First-pass torso lag is 0.08..0.20 s and step width multiplier during turns is 1.0..1.25. |
| Confidence | medium |
| Applies to | [Foot Target Solver](../09-solvers/foot-target-solver.md), [Spine Solver](../09-solvers/spine-solver.md), [Pose Composer](../09-solvers/pose-composer.md) |

### Pivot steps instead of sliding

| Field | Value |
|---|---|
| Rule | Turn-in-place should use visible pivot steps instead of sliding feet. |
| Source card | [IK Foot Placement](../research/source-cards/ik-foot-placement.md), [Gait Transitions and Turning](../research/source-cards/gait-transitions-turning.md) |
| External link | https://dev.epicgames.com/documentation/en-us/unreal-engine/ik-rig-in-unreal-engine |
| Source type | implementation constraint / game animation readability |
| Used from source | Foot contact stability is critical for believable ground interaction. |
| HLS transformation | Added `PivotStepThreshold` and turn-in-place foot target rules. First-pass pivot threshold is 45..90 degrees and turn-in-place speed max is 0.20..0.40 m/s. |
| Confidence | high for visual rule, medium for thresholds |
| Applies to | [Foot Target Solver](../09-solvers/foot-target-solver.md), [Pose Composer](../09-solvers/pose-composer.md), [Runtime Constraints](../10-runtime/constraints.md) |

## Numeric Data Separation

| Value | Category | Usage |
|---|---|---|
| start/stop/turn are transition behaviors | source-backed relationship | explicit resolver states |
| `TurnRate = 90..360 deg/s` | HLS tuning range | turn responsiveness |
| `TurnAnticipation = 0.10..0.25 s` | HLS tuning value | lead movement before full turn |
| `TorsoLag = 0.08..0.20 s` | HLS tuning value | readable body segmentation |
| `StepWidthMultiplier = 1.0..1.25` | HLS tuning range | turning stability |
| `PivotStepThreshold = 45..90 deg` | HLS tuning value | switch from twist to pivot steps |
| `StartAccelThreshold = 0.50..1.50 m/s²` | HLS tuning range | start detection |
| `StopDecelThreshold = 1.50..3.00 m/s²` | HLS tuning range | stop detection |
| `StartLeanAmount = 0..8 deg` | HLS tuning range | acceleration readability |
| `StopLeanAmount = 0..12 deg` | HLS tuning range | braking readability |
| `BackwardSpeedMultiplier = 1.0..0.60` | HLS tuning range | cautious backward walking |
| `SidestepStepLengthMultiplier = 1.0..0.70` | HLS tuning range | lateral movement |

## Open Questions

- How much lead-lag between head, chest, pelvis, and feet.
- Whether high-speed turning should use a separate banking rule.
- How to handle animation overlays for weapon aiming during turns.
