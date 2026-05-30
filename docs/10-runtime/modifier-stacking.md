---
id: modifier-stacking
title: Modifier Stacking
status: draft
version: 26.530.957
tags:
  - runtime
  - modifiers
  - stacking
  - provenance
  - links
---

# Modifier Stacking

## Purpose

Defines how multiple locomotion modifiers combine without breaking the pose.

Examples of modifiers:

- backpack load
- front load
- asymmetric load
- injury
- fatigue
- slope
- stairs
- weapon carry

## Core Rule

Modifiers change resolved parameters. They should not directly write final bones.

## Stacking Order

1. base gait profile
2. locomotion state profile
3. terrain modifiers
4. load and carry modifiers
5. injury modifiers
6. fatigue modifiers
7. weapon or aim restrictions
8. safety clamps

## Why Order Matters

Terrain decides where feet can go. Load changes body posture. Injury changes asymmetry and support. Weapon carry restricts upper body. Safety clamps prevent impossible final values.

## Multiplicative Parameters

Use multiplication for values like:

- step length multiplier
- cadence multiplier
- speed multiplier
- arm swing multiplier
- turn speed multiplier

## Additive Parameters

Use addition for values like:

- torso pitch offset
- torso roll offset
- pelvis pitch bias
- pelvis roll bias
- foot clearance bonus

## Max Parameters

Use max for restrictions like:

- spine stiffness
- weapon stabilization
- injury severity
- caution value

## Safety Clamps

After all modifiers, clamp:

- torso lean
- pelvis offset
- step length
- stance ratio
- cadence
- arm swing
- IK reach

## Conflict Rules

- Stairs override generic slope foot placement.
- Severe injury can downgrade running.
- Heavy load can downgrade sprinting.
- Weapon aiming can override arm swing.
- Foot locking has priority over cosmetic secondary motion.

## Rule Provenance

### Modifiers affect parameters, not bones

| Field | Value |
|---|---|
| Rule | Modifiers change resolved parameters instead of directly writing final bones. |
| Source card | [Procedural Animation Overview](../research/source-cards/procedural-animation-overview.md) |
| External link | https://dev.epicgames.com/documentation/en-us/unreal-engine/control-rig-in-unreal-engine |
| Source type | procedural animation architecture |
| Used from source | Runtime computes intent; animation systems apply pose. |
| HLS transformation | Modifiers operate on parameter sets before solver execution. |
| Confidence | high |
| Applies to | all solvers and [Pose Composer](../09-solvers/pose-composer.md) |

### Terrain before load and injury

| Field | Value |
|---|---|
| Rule | Terrain modifiers resolve before load and injury modifiers. |
| Source card | [Stairs and Slopes](../research/source-cards/stairs-and-slopes.md), [Load Carriage Posture](../research/source-cards/load-carriage-posture.md), [Antalgic Gait](../research/source-cards/antalgic-gait.md) |
| External link | https://www.physio-pedia.com/Stair_Gait |
| Source type | terrain, load, and clinical gait references |
| Used from source | Terrain determines feasible foot placement before posture and asymmetry adjustments. |
| HLS transformation | Terrain modifies targets first, then load/injury adjust posture and timing. |
| Confidence | medium-high |
| Applies to | [Foot Target Solver](../09-solvers/foot-target-solver.md), [Pelvis Solver](../09-solvers/pelvis-solver.md), [Parameter System](./parameter-system.md) |

### Conflict priority rules

| Field | Value |
|---|---|
| Rule | Stairs override slopes, injury can downgrade running, weapon can override arm swing. |
| Source card | [Stairs and Slopes](../research/source-cards/stairs-and-slopes.md), [Antalgic Gait](../research/source-cards/antalgic-gait.md), [Procedural Animation Overview](../research/source-cards/procedural-animation-overview.md) |
| External link | https://www.ncbi.nlm.nih.gov/books/NBK559243/ |
| Source type | terrain, clinical gait, animation architecture |
| Used from source | Some locomotion constraints are more fundamental than others. |
| HLS transformation | Added deterministic conflict resolution order. |
| Confidence | high as runtime rule |
| Applies to | [Locomotion State Resolver](./locomotion-state-resolver.md), [Pose Composer](../09-solvers/pose-composer.md) |

### Safety clamps after stacking

| Field | Value |
|---|---|
| Rule | All modifiers are resolved before safety clamps are applied. |
| Source card | [IK Foot Placement](../research/source-cards/ik-foot-placement.md), [Unreal Engine IK Rig](../research/source-cards/unreal-engine-ik-rig.md) |
| External link | https://dev.epicgames.com/documentation/en-us/unreal-engine/full-body-ik-in-unreal-engine |
| Source type | implementation constraint |
| Used from source | Final targets must remain reachable and stable. |
| HLS transformation | Clamp stage executes after stacking to enforce safe ranges. |
| Confidence | high |
| Applies to | [Runtime Constraints](./constraints.md), [Foot Target Solver](../09-solvers/foot-target-solver.md), [Pelvis Solver](../09-solvers/pelvis-solver.md) |

## Numeric Data Separation

| Value | Category | Usage |
|---|---|---|
| stacking order | HLS implementation rule | deterministic resolution |
| multipliers and offsets | HLS tuning values | parameter modification |
| safety limits | implementation constraints | prevent invalid outputs |

## Open Questions

- Exact stacking curves for fatigue plus load.
- Whether pain and load should combine linearly or with diminishing returns.
- Whether some states should disable modifiers entirely.
