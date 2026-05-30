---
id: principles
title: Principles
status: review
version: 26.530.1611
tags:
  - principles
  - architecture
  - level-3
  - provenance
  - links
---

# Principles

## Purpose

Defines the design principles of Human Locomotion Specification.

HLS is not a biomechanics textbook. HLS is an engineering specification for procedural human locomotion in games.

## Target Quality

The first HLS target is Level 3: Alive Game Motion.

At this level, the character should look alive because state affects the body.

Examples:

- backpack changes torso lean
- fatigue changes step quality
- injury creates asymmetry
- slope changes posture and foot lift
- turning creates lead and lag between body parts
- stopping shows deceleration compensation

## Main Formula

```text
human movement knowledge
  -> formal rules
  -> runtime parameters
  -> solver architecture
  -> procedural animation
```

## Core Principle

Runtime owns intent.

Animation applies pose.

This means HLS runtime decides gait phase, targets, modifiers, posture, and solver outputs. AnimBP, Control Rig, IK, or FK then applies the final skeleton result.

```text
GameplayState
  -> CharacterInputState
  -> HLSRuntimeIntent
  -> SolverPoseIntent
  -> RuntimeConstraints
  -> OutputPose
  -> AnimationSystemApplication
  -> FinalSkeletalPose
```

## What HLS Describes

HLS describes the minimal set of visual rules that makes a player believe the character is alive and affected by state.

It describes:

- gait phase
- foot targets
- pelvis motion
- spine compensation
- arm swing
- load modifiers
- injury modifiers
- terrain modifiers
- runtime update order
- Unreal Engine integration

## What HLS Does Not Try To Do

HLS does not require:

- full physical simulation
- exact medical biomechanics
- full robotics-grade dynamics
- mandatory mocap runtime
- a large motion database
- Level 5 physical realism

## Rule Quality Test

A rule is useful only if it helps implementation.

Good rule:

```text
If backpack load increases, increase forward torso lean, reduce step length, and increase spine stiffness.
```

Bad rule:

```text
Humans compensate for load in complex ways.
```

The second statement may be true, but it is not directly implementable.

## Solver Principle

Each solver owns one responsibility.

- GaitPhaseGenerator owns rhythm.
- FootTargetSolver owns foot intent.
- PelvisSolver owns weight carrier motion.
- SpineSolver owns torso compensation and state readability.
- ArmSwingSolver owns arm rhythm and restrictions.
- PoseComposer owns priority and final pose intent.

Common solver contract:

```text
CharacterInputState + ResolvedParameters + PreviousSolverState
  -> Solver
  -> PoseIntent + DebugValues + WarningFlags
```

## Modifier Principle

Modifiers should change parameters, not directly write bones.

Examples:

- load modifies torso lean, step length, cadence, stiffness
- injury modifies stance time, speed, asymmetry, stiffness
- slope modifies foot lift, torso pitch, speed
- weapon carry modifies arm freedom and upper-body stiffness

Modifier contract:

```text
CharacterInputState -> ModifierResolver -> ResolvedParameters -> Solvers -> PoseComposer
```

## Priority Principle

Foot contact stability is more important than perfect anatomical detail.

Priority order:

1. foot locking and ground contact
2. pelvis support and balance
3. spine compensation
4. arm swing or carry pose
5. secondary visual motion

```text
FootLockPriority > PoseWarpPriority > CosmeticSecondaryMotion
SafetyClamps run before OutputPose
```

## Networking Principle

Server owns gameplay state. Clients may reconstruct visual pose locally.

```text
ReplicatedCompactState
  -> LocalParameterResolution
  -> LocalSolvers
  -> PoseComposer
  -> OutputPose
```

Do not replicate full bone poses for normal locomotion.

## Data Principle

Scientific papers and mocap datasets are references. They are not mandatory runtime dependencies.

HLS extracts rules from science and validates generated motion against references.

Source-backed relationships, HLS tuning values, and runtime clamps must stay distinguishable.

## Related Docs

- [Gait Cycle](../04-gait-cycle/index.md)
- [Walking](../05-walking/index.md)
- [Running](../06-running/index.md)
- [Modifiers](../08-modifiers/index.md)
- [Solvers](../09-solvers/index.md)
- [Runtime](../10-runtime/index.md)
- [Unreal Engine](../11-unreal-engine/index.md)
- [Research Provenance Methodology](../research/provenance-methodology.md)

## Rule Provenance

### Runtime owns intent

| Field | Value |
|---|---|
| Rule | Runtime computes locomotion intent; animation systems apply pose. |
| Source card | [Procedural Animation Overview](../research/source-cards/procedural-animation-overview.md), [Unreal Engine Control Rig](../research/source-cards/unreal-engine-control-rig.md) |
| External link | https://dev.epicgames.com/documentation/en-us/unreal-engine/control-rig-in-unreal-engine |
| Source type | procedural animation architecture / Unreal Engine documentation |
| Used from source | Runtime can compute controls and animation systems can apply them to the skeleton. |
| HLS transformation | HLS separates gameplay state, runtime intent, output pose, and final skeletal application. |
| Confidence | high |
| Applies to | [Runtime](../10-runtime/index.md), [Unreal Engine](../11-unreal-engine/index.md) |

### Implementation-first rules

| Field | Value |
|---|---|
| Rule | HLS rules must be implementable, inspectable, and tunable. |
| Source card | [Research Provenance Methodology](../research/provenance-methodology.md), [Procedural Animation Overview](../research/source-cards/procedural-animation-overview.md) |
| External link | [Research Provenance Methodology](../research/provenance-methodology.md) |
| Source type | HLS methodology / procedural animation architecture |
| Used from source | Runtime rules need provenance, transformation notes, confidence, and numeric separation. |
| HLS transformation | Principles require source-backed facts, HLS tuning ranges, and runtime clamps to be separated. |
| Confidence | high |
| Applies to | all review docs |

## Open Questions

- Whether HLS should define Level 4/5 quality targets now or defer them.
- Whether fatigue should become its own first-class modifier page.
