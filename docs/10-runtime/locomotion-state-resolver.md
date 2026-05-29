---
id: locomotion-state-resolver
title: Locomotion State Resolver
status: draft
version: 26.529.2148
tags:
  - runtime
  - state
  - resolver
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

## Open Questions

- Exact thresholds for start, stop, and turn states.
- Whether jog should be a separate state or a speed range inside running.
- How much weapon aiming should restrict locomotion state.
