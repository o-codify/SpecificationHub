---
id: modifiers
title: Modifiers
status: review
version: 26.530.1515
tags:
  - modifiers
  - runtime
  - provenance
  - links
  - numeric
---

# Modifiers

Modifiers adjust base locomotion without redefining the whole gait system.

A modifier should change resolved parameters, solver profiles, or pose priorities. It should not directly write final bones.

## Modifier Contract

```text
CharacterInputState -> ModifierResolver -> ResolvedParameters -> Solvers -> PoseComposer
```

```text
CombinedMultiplier = clamp(Base * Terrain * Load * Injury * Fatigue * Weapon, Min, Max)
CombinedOffset = clamp(BaseOffset + TerrainOffset + LoadOffset + InjuryOffset + WeaponOffset, Min, Max)
ResolvedRestriction = max(BaseRestriction, LoadRestriction, InjuryRestriction, WeaponRestriction)
```

## Documents

- [Injury and Limping Modifier](./injury-limping.md)
- [Backpack Load Modifier](./backpack-load.md)
- [Front Load Modifier](./front-load.md)
- [Asymmetric Load Modifier](./asymmetric-load.md)
- [Slope Modifier](./slope.md)
- [Stairs Modifier](./stairs.md)
- [Weapon Carry Modifier](./weapon-carry.md)
- [Turning, Starting, and Stopping](./turning-start-stop.md)

## Runtime Rules

- Modifiers resolve before solver execution.
- Modifiers should be stackable and clamp-safe.
- Source-backed relationships and HLS tuning values must stay distinguishable.
- Severe modifiers can downgrade requested locomotion state through [Locomotion State Resolver](../10-runtime/locomotion-state-resolver.md).
- Final parameter resolution is defined by [Modifier Stacking](../10-runtime/modifier-stacking.md) and [Parameter System](../10-runtime/parameter-system.md).

## Common Modifier Outputs

- step length multiplier
- cadence multiplier
- speed multiplier
- stance or swing bias
- pelvis offset or stiffness bias
- torso pitch or roll bias
- arm freedom or weapon/carry restriction
- turn speed multiplier
- debug contribution and clamp warnings

## Key Numeric Ranges

| Value | First-pass range | Used by |
|---|---:|---|
| StepLengthMultiplier | 0.65..1.20 | load, injury, terrain |
| CadenceMultiplier | 0.70..1.15 | load, injury, fatigue |
| SpeedMultiplier | 0.50..1.15 | load, injury, terrain |
| ArmSwingMultiplier | 0.00..1.75 | load, weapon, running |
| TurnSpeedMultiplier | 0.40..1.10 | load, weapon, turning |
| FootClearanceBonus | 0.00..0.20 m | slope, stairs |
| SevereInjuryThreshold | 0.65..0.80 | state downgrade |
| HeavyLoadThreshold | 0.65..0.80 | state downgrade |

## Related Runtime Docs

- [Modifier Stacking](../10-runtime/modifier-stacking.md)
- [Parameter System](../10-runtime/parameter-system.md)
- [Locomotion State Resolver](../10-runtime/locomotion-state-resolver.md)
- [Runtime Constraints](../10-runtime/constraints.md)
- [Debug Visualization](../10-runtime/debug-visualization.md)

## Open Questions

- Whether mood should be a gameplay modifier, cosmetic layer, or separate animation style profile.
- Whether fatigue should have its own modifier page or remain inside modifier stacking for first pass.
