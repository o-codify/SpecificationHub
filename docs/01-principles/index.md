---
id: principles
title: Principles
status: draft
version: 26.529.2146
tags:
  - principles
  - architecture
  - level-3
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

## Modifier Principle

Modifiers should change parameters, not directly write bones.

Examples:

- load modifies torso lean, step length, cadence, stiffness
- injury modifies stance time, speed, asymmetry, stiffness
- slope modifies foot lift, torso pitch, speed
- weapon carry modifies arm freedom and upper-body stiffness

## Priority Principle

Foot contact stability is more important than perfect anatomical detail.

Priority order:

1. foot locking and ground contact
2. pelvis support and balance
3. spine compensation
4. arm swing or carry pose
5. secondary visual motion

## Data Principle

Scientific papers and mocap datasets are references. They are not mandatory runtime dependencies.

HLS extracts rules from science and validates generated motion against references.
