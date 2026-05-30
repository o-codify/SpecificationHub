---
id: modifier-stacking
title: Modifier Stacking
status: review
version: 26.530.1317
tags:
  - runtime
  - modifiers
  - stacking
  - provenance
  - links
  - numeric
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

- step length multiplier: first-pass combined clamp 0.65..1.20
- cadence multiplier: first-pass combined clamp 0.70..1.15
- speed multiplier: first-pass combined clamp 0.50..1.15
- arm swing multiplier: first-pass combined clamp 0.00..1.75
- turn speed multiplier: first-pass combined clamp 0.40..1.10

```text
CombinedMultiplier = clamp(Base * Terrain * Load * Injury * Fatigue * Weapon, Min, Max)
ResolvedStepLength = BaseStepLength * CombinedStepLengthMultiplier
ResolvedCadence = BaseCadence * CombinedCadenceMultiplier
```

## Additive Parameters

Use addition for values like:

- torso pitch offset: hard clamp -10..20 degrees after stacking
- torso roll offset: hard clamp -10..10 degrees after stacking
- pelvis pitch bias: first-pass clamp -10..15 degrees
- pelvis roll bias: first-pass clamp -10..10 degrees
- foot clearance bonus: first-pass clamp 0..0.20 m before stair override

```text
CombinedOffset = clamp(BaseOffset + TerrainOffset + LoadOffset + InjuryOffset + WeaponOffset, Min, Max)
ResolvedFootLift = BaseFootLift + TerrainFootLiftBonus + StairFootLiftBonus
```

## Max Parameters

Use max for restrictions like:

- spine stiffness: normalized 0..1
- weapon stabilization: normalized 0..1
- injury severity: normalized 0..1
- caution value: normalized 0..1

```text
ResolvedRestriction = max(BaseRestriction, LoadRestriction, InjuryRestriction, WeaponRestriction)
```

## Safety Clamps

After all modifiers, clamp:

- torso lean: hard clamp 20 degrees
- pelvis offset: 0.10..0.18 of leg length
- step length: 0.20 m minimum, 0.80..1.10 of leg length maximum
- stance ratio: 0.30..0.75
- cadence: first-pass 60..220 steps/minute global runtime clamp
- arm swing: 0..60 degrees hard clamp
- IK reach: 0.85..0.95 of leg length

## Conflict Rules

- Stairs override generic slope foot placement.
- Severe injury can downgrade running.
- Heavy load can downgrade sprinting.
- Weapon aiming can override arm swing.
- Foot locking has priority over cosmetic secondary motion.
- If combined penalties reduce speed below the gait minimum, [Locomotion State Resolver](./locomotion-state-resolver.md) should downgrade state instead of forcing broken animation.

## Rule Provenance

### Modifiers affect parameters, not bones

| Field | Value |
|---|---|
| Rule | Modifiers change resolved parameters instead of directly writing final bones. |
| Source card | [Procedural Animation Overview](../research/source-cards/procedural-animation-overview.md) |
| External link | https://dev.epicgames.com/documentation/en-us/unreal-engine/control-rig-in-unreal-engine |
| Source type | procedural animation architecture |
| Used from source | Runtime computes intent; animation systems apply pose. |
| HLS transformation | Modifiers operate on parameter sets before solver execution. Multipliers, additive offsets, and max restrictions are combined, then clamped before solvers read them. |
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
| HLS transformation | Terrain modifies targets first, then load/injury adjust posture and timing. Stairs override slope foot target selection, but slope may still contribute torso pitch if the stair detector is uncertain. |
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
| HLS transformation | Added deterministic conflict resolution order. State downgrade happens when stacked multipliers fall below playable gait thresholds rather than allowing extreme pose values. |
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
| HLS transformation | Clamp stage executes after stacking to enforce safe ranges: stance ratio 0.30..0.75, IK reach 0.85..0.95 of leg length, torso lean hard clamp 20 degrees. |
| Confidence | high |
| Applies to | [Runtime Constraints](./constraints.md), [Foot Target Solver](../09-solvers/foot-target-solver.md), [Pelvis Solver](../09-solvers/pelvis-solver.md) |

## Numeric Data Separation

| Value | Category | Usage |
|---|---|---|
| stacking order | HLS implementation rule | deterministic resolution |
| `StepLengthMultiplier = 0.65..1.20` | HLS tuning range | stacked locomotion modifiers |
| `CadenceMultiplier = 0.70..1.15` | HLS tuning range | speed/phase response |
| `SpeedMultiplier = 0.50..1.15` | HLS tuning range | locomotion state downgrade trigger |
| `ArmSwingMultiplier = 0.00..1.75` | HLS tuning range | carry/weapon/run blending |
| `TurnSpeedMultiplier = 0.40..1.10` | HLS tuning range | turning with load/injury |
| `FootClearanceBonus = 0..0.20 m` | HLS tuning range | terrain/stairs modifier |
| `CadenceGlobalClamp = 60..220 spm` | HLS safety clamp | phase stability |
| multipliers and offsets | HLS tuning values | parameter modification |
| safety limits | implementation constraints | prevent invalid outputs |

## Open Questions

- Exact stacking curves for fatigue plus load.
- Whether pain and load should combine linearly or with diminishing returns.
- Whether some states should disable modifiers entirely.
