---
id: modifier-stacking
title: Modifier Stacking
status: draft
version: 26.529.2149
tags:
  - runtime
  - modifiers
  - stacking
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

## Open Questions

- Exact stacking curves for fatigue plus load.
- Whether pain and load should combine linearly or with diminishing returns.
- Whether some states should disable modifiers entirely.
