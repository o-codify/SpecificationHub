---
id: locomotion-state-resolver
title: Locomotion State Resolver
status: draft
version: 26.530.1354
tags:
  - runtime
  - state
  - resolver
  - provenance
  - links
  - numeric
---

# Locomotion State Resolver

## Purpose

Chooses the active locomotion state from CharacterInputState.

This layer converts gameplay intent and physical context into a locomotion mode that solvers can understand.

## Inputs

- CharacterInputState
- previous locomotion state
- previous gait phase
- recent transitions

## Outputs

- active locomotion state
- gait type
- transition state
- allowed modifiers
- state confidence
- requested solver profile

## Base States

- idle
- walk
- run
- start
- stop
- turn
- turn in place
- sidestep
- backward walk
- slope walk
- stair ascent
- stair descent
- injured walk
- loaded walk
- airborne

## Rules

- Grounded locomotion requires valid footing.
- Stairs override ordinary slope walking.
- Severe injury can downgrade run to walk or limp.
- Heavy load can downgrade sprint to run or walk.
- Aiming can reduce run or sprint states.
- Turn in place activates when desired facing changes while speed is low.
- Stop activates when desired speed drops quickly while current speed is high.
- Start activates when speed rises from idle.
- State changes should use hysteresis and minimum state time to avoid flicker.

## Priority Order

1. invalid ground or airborne
2. stairs
3. severe injury
4. heavy load
5. start or stop transition
6. turning state
7. requested gait
8. default walk or idle

## Runtime Rule

The resolver should avoid rapid state flicker. Use hysteresis, minimum state time, or confidence smoothing.

```text
IdleSpeedThreshold = 0.10..0.20 m/s
WalkEnterSpeed = 0.20..0.40 m/s
RunEnterSpeed = 2.50..3.50 m/s
RunExitSpeed = 2.00..3.00 m/s
TurnInPlaceSpeedMax = 0.20..0.40 m/s
TurnInPlaceAngle = 45..90 deg
StopDecelThreshold = 1.50..3.00 m/s²
StartAccelThreshold = 0.50..1.50 m/s²
MinimumStateTime = 0.15..0.35 s
StateConfidenceSmoothing = 0.08..0.20 s
SevereInjuryThreshold = 0.65..0.80
HeavyLoadThreshold = 0.65..0.80
```

## Rule Provenance

### Explicit locomotion states

| Field | Value |
|---|---|
| Rule | Start, stop, turn, stairs, injury, and load should resolve to explicit locomotion states or profiles. |
| Source card | [Gait Transitions and Turning](../research/source-cards/gait-transitions-turning.md), [Stairs and Slopes](../research/source-cards/stairs-and-slopes.md), [Antalgic Gait](../research/source-cards/antalgic-gait.md) |
| External link | https://pubmed.ncbi.nlm.nih.gov/?term=gait+initiation+turning+walking+biomechanics |
| Source type | gait transition, terrain, and clinical gait references |
| Used from source | Transitions, terrain, and pain-related gait alter locomotion behavior beyond simple speed changes. |
| HLS transformation | Resolver outputs active state, transition state, gait type, and solver profile. First-pass start/stop detection uses acceleration thresholds 0.50..1.50 m/s² and deceleration thresholds 1.50..3.00 m/s². |
| Confidence | medium |
| Applies to | [Gait Phase Generator](../09-solvers/gait-phase-generator.md), [Modifier Stacking](./modifier-stacking.md), [Pose Composer](../09-solvers/pose-composer.md) |

### Stairs override slope

| Field | Value |
|---|---|
| Rule | Stairs override ordinary slope walking. |
| Source card | [Stairs and Slopes](../research/source-cards/stairs-and-slopes.md) |
| External link | https://www.physio-pedia.com/Stair_Gait |
| Source type | stair gait overview plus implementation rule |
| Used from source | Stairs are a distinct locomotion context with discrete foot placement. |
| HLS transformation | Resolver selects stair ascent/descent before generic slope walk. A reliable stair detector should override generic slope when tread confidence exceeds 0.60..0.80. |
| Confidence | high |
| Applies to | [Stairs Modifier](../08-modifiers/stairs.md), [Foot Target Solver](../09-solvers/foot-target-solver.md), [Pelvis Solver](../09-solvers/pelvis-solver.md) |

### Injury and load downgrade gait

| Field | Value |
|---|---|
| Rule | Severe injury or heavy load can downgrade sprint/run to slower locomotion profiles. |
| Source card | [Antalgic Gait](../research/source-cards/antalgic-gait.md), [Load Carriage Posture](../research/source-cards/load-carriage-posture.md) |
| External link | https://www.ncbi.nlm.nih.gov/books/NBK559243/ |
| Source type | clinical gait reference / load carriage topic / gameplay constraint |
| Used from source | Pain and load affect gait quality, stance confidence, posture, and speed. |
| HLS transformation | Resolver can restrict requested gait based on severity and load. First-pass severe thresholds are 0.65..0.80 normalized severity; before downgrade, modifiers may reduce speed/cadence by 10..35 percent. |
| Confidence | medium |
| Applies to | [Running](../06-running/index.md), [Injury and Limping Modifier](../08-modifiers/injury-limping.md), [Backpack Load Modifier](../08-modifiers/backpack-load.md), [Front Load Modifier](../08-modifiers/front-load.md) |

### State hysteresis

| Field | Value |
|---|---|
| Rule | Resolver should avoid rapid state flicker using smoothing, confidence, or minimum state time. |
| Source card | [Motion Matching](../research/source-cards/motion-matching.md), [LaFAN1](../research/source-cards/lafan1.md) |
| External link | https://github.com/ubisoft/ubisoft-laforge-animation-dataset |
| Source type | animation continuity / transition quality reference |
| Used from source | Temporal continuity matters for believable locomotion and transitions. |
| HLS transformation | Added state confidence, recent transitions, and anti-flicker runtime rule. First-pass minimum state time is 0.15..0.35 s and confidence smoothing is 0.08..0.20 s. |
| Confidence | high as implementation rule |
| Applies to | [Networking](./networking.md), [Pose Composer](../09-solvers/pose-composer.md), [Validation Methodology](../research/validation-methodology.md) |

## Numeric Data Separation

| Value | Category | Usage |
|---|---|---|
| priority order | HLS implementation rule | deterministic state choice |
| `IdleSpeedThreshold = 0.10..0.20 m/s` | HLS tuning range | idle/walk transition |
| `WalkEnterSpeed = 0.20..0.40 m/s` | HLS tuning range | start walking |
| `RunEnterSpeed = 2.50..3.50 m/s` | HLS tuning range | enter run |
| `RunExitSpeed = 2.00..3.00 m/s` | HLS tuning range | run hysteresis |
| `TurnInPlaceAngle = 45..90 deg` | HLS tuning range | turning state |
| `MinimumStateTime = 0.15..0.35 s` | HLS tuning range | anti-flicker |
| `SevereInjuryThreshold = 0.65..0.80` | HLS tuning range | downgrade state |
| `HeavyLoadThreshold = 0.65..0.80` | HLS tuning range | downgrade state |
| start/stop thresholds | HLS tuning values | transition detection |
| injury/load downgrade thresholds | HLS tuning values | gameplay + visual readability |

## Open Questions

- Exact thresholds for start, stop, and turn states.
- Whether jog should be a separate state or a speed range inside running.
- How much weapon aiming should restrict locomotion state.
