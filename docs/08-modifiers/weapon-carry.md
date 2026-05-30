---
id: weapon-carry-modifier
title: Weapon Carry Modifier
status: draft
version: 26.530.1058
tags:
  - modifier
  - weapon
  - carry
  - provenance
  - links
---

# Weapon Carry Modifier

## Purpose

Defines how weapon carry changes locomotion.

## Rules

- Weapon carry reduces normal arm swing.
- Two-hand weapon carry stabilizes the upper body.
- Aiming reduces torso counter-rotation.
- Heavy weapon carry shortens step length.
- Heavy weapon carry increases spine stiffness.
- Sprinting with weapon should either lower the weapon or heavily restrict aim.

## Parameters

- WeaponWeightNormalized: 0..1.
- AimState: relaxed, ready, aiming.
- ArmSwingMultiplier: 1.0 to 0.0.
- SpineStiffness: 0.0 to 0.8.
- StepLengthMultiplier: 1.0 to 0.8.
- TorsoCounterRotationMultiplier: 1.0 to 0.2.
- AimStability: 0..1.

## Runtime Rule

Weapon pose has higher priority than normal arm swing. Lower body locomotion continues, but upper body becomes more constrained as weapon readiness increases.

## Rule Provenance

### Weapon pose overrides arm swing

| Field | Value |
|---|---|
| Rule | Weapon pose has higher priority than normal arm swing. |
| Source card | [Procedural Animation Overview](../research/source-cards/procedural-animation-overview.md), [Unreal Engine Control Rig](../research/source-cards/unreal-engine-control-rig.md) |
| External link | https://dev.epicgames.com/documentation/en-us/unreal-engine/control-rig-in-unreal-engine |
| Source type | procedural animation / implementation constraint |
| Used from source | Runtime can compute pose intent and animation systems can apply constraints and controls. |
| HLS transformation | Weapon carry sets upper-body priority in PoseComposer and reduces ArmSwingSolver output. |
| Confidence | high as implementation rule |
| Applies to | [Arm Swing Solver](../09-solvers/arm-swing-solver.md), [Pose Composer](../09-solvers/pose-composer.md), [Unreal Engine](../11-unreal-engine/index.md) |

### Aiming reduces torso counter-rotation

| Field | Value |
|---|---|
| Rule | Aiming reduces torso counter-rotation and increases upper-body stiffness. |
| Source card | [Procedural Animation Overview](../research/source-cards/procedural-animation-overview.md) |
| External link | https://dev.epicgames.com/documentation/en-us/unreal-engine/animation-blueprints-in-unreal-engine |
| Source type | gameplay readability / animation layering inference |
| Used from source | Animation systems can layer or constrain upper-body poses separately from locomotion. |
| HLS transformation | Added `TorsoCounterRotationMultiplier`, `SpineStiffness`, and `AimStability`. |
| Confidence | medium |
| Applies to | [Spine Solver](../09-solvers/spine-solver.md), [Arm Swing Solver](../09-solvers/arm-swing-solver.md), [Pose Composer](../09-solvers/pose-composer.md) |

### Heavy weapon affects gait

| Field | Value |
|---|---|
| Rule | Heavy weapon carry can reduce step length and increase stiffness. |
| Source card | [Load Carriage Posture](../research/source-cards/load-carriage-posture.md) |
| External link | https://pubmed.ncbi.nlm.nih.gov/?term=load+carriage+posture+gait+trunk+lean |
| Source type | load carriage topic plus HLS gameplay inference |
| Used from source | Carried load changes posture and gait. |
| HLS transformation | WeaponWeightNormalized modifies `StepLengthMultiplier` and `SpineStiffness`. |
| Confidence | medium |
| Applies to | [Modifier Stacking](../10-runtime/modifier-stacking.md), [Parameter System](../10-runtime/parameter-system.md) |

## Numeric Data Separation

| Value | Category | Usage |
|---|---|---|
| weapon pose overrides arm swing | implementation rule | PoseComposer priority |
| `ArmSwingMultiplier = 1.0..0.0` | HLS tuning range | weapon readiness / aiming |
| `SpineStiffness = 0.0..0.8` | HLS tuning range | upper-body stability |
| `TorsoCounterRotationMultiplier = 1.0..0.2` | HLS tuning range | aiming constraint |

## Open Questions

- How to blend weapon aim offsets with procedural spine compensation.
- How much arm swing can remain during low-ready movement.
