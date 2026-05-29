---
id: locomotion-state-resolver
title: Locomotion State Resolver
status: draft
version: 26.529.2240
tags:
  - runtime
  - state
  - resolver
  - provenance
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

## Rule Provenance

### Explicit locomotion states

| Field | Value |
|---|---|
| Rule | Start, stop, turn, stairs, injury, and load should resolve to explicit locomotion states or profiles. |
| Source card | `docs/research/source-cards/gait-transitions-turning.md`, `docs/research/source-cards/stairs-and-slopes.md`, `docs/research/source-cards/antalgic-gait.md` |
| External link | https://pubmed.ncbi.nlm.nih.gov/?term=gait+initiation+turning+walking+biomechanics |
| Source type | gait transition, terrain, and clinical gait references |
| Used from source | Transitions, terrain, and pain-related gait alter locomotion behavior beyond simple speed changes. |
| HLS transformation | Resolver outputs active state, transition state, gait type, and solver profile. |
| Confidence | medium |
| Applies to | `GaitPhaseGenerator`, `ModifierStacking`, `PoseComposer` |

### Stairs override slope

| Field | Value |
|---|---|
| Rule | Stairs override ordinary slope walking. |
| Source card | `docs/research/source-cards/stairs-and-slopes.md` |
| External link | https://www.physio-pedia.com/Stair_Gait |
| Source type | stair gait overview plus implementation rule |
| Used from source | Stairs are a distinct locomotion context with discrete foot placement. |
| HLS transformation | Resolver selects stair ascent/descent before generic slope walk. |
| Confidence | high |
| Applies to | `Stairs Modifier`, `FootTargetSolver`, `PelvisSolver` |

### Injury and load downgrade gait

| Field | Value |
|---|---|
| Rule | Severe injury or heavy load can downgrade sprint/run to slower locomotion profiles. |
| Source card | `docs/research/source-cards/antalgic-gait.md`, `docs/research/source-cards/load-carriage-posture.md` |
| External link | https://www.ncbi.nlm.nih.gov/books/NBK559243/ |
| Source type | clinical gait reference / load carriage topic / gameplay constraint |
| Used from source | Pain and load affect gait quality, stance confidence, posture, and speed. |
| HLS transformation | Resolver can restrict requested gait based on severity and load. |
| Confidence | medium |
| Applies to | `Running`, `Injury`, `Backpack`, `Front Load` |

### State hysteresis

| Field | Value |
|---|---|
| Rule | Resolver should avoid rapid state flicker using smoothing, confidence, or minimum state time. |
| Source card | `docs/research/source-cards/motion-matching.md`, `docs/research/source-cards/lafan1.md` |
| External link | https://github.com/ubisoft/ubisoft-laforge-animation-dataset |
| Source type | animation continuity / transition quality reference |
| Used from source | Temporal continuity matters for believable locomotion and transitions. |
| HLS transformation | Added state confidence, recent transitions, and anti-flicker runtime rule. |
| Confidence | high as implementation rule |
| Applies to | `Networking`, `PoseComposer`, `Validation Methodology` |

## Numeric Data Separation

| Value | Category | Usage |
|---|---|---|
| priority order | HLS implementation rule | deterministic state choice |
| start/stop thresholds | HLS tuning values | transition detection |
| injury/load downgrade thresholds | HLS tuning values | gameplay + visual readability |

## Open Questions

- Exact thresholds for start, stop, and turn states.
- Whether jog should be a separate state or a speed range inside running.
- How much weapon aiming should restrict locomotion state.
