---
id: introduction
title: Introduction
status: draft
version: 26.529.2146
tags:
  - introduction
  - hls
  - overview
---

# Introduction

## What Is HLS

Human Locomotion Specification is an engineering specification for procedural human locomotion in games.

It converts research about human motion into implementable rules, parameters, solvers, and runtime architecture.

## Goal

The goal is not to perfectly simulate the human body.

The goal is to produce Level 3 Alive Game Motion: a character that looks alive because movement changes with state.

## Target Result

A developer or AI implementation agent should be able to read HLS and implement a procedural locomotion runtime with:

- walking
- running
- gait phase generation
- foot placement
- pelvis motion
- spine compensation
- arm swing
- posture changes
- load modifiers
- injury and limp modifiers
- slope and stairs support
- start, stop, and turning behavior
- Unreal Engine integration notes

## Quality Levels

Level 1: Dummy Motion. Legs move, body barely participates.

Level 2: Basic Human Motion. The character looks humanoid but mechanical.

Level 3: Alive Game Motion. The character looks alive and state affects body motion.

Level 4: Natural Motion. Most players do not notice artificiality.

Level 5: Physically Real Motion. Mocap-like or physics-like realism.

HLS first pass targets Level 3.

## Main Architecture

```text
CharacterInputState
  -> LocomotionStateResolver
  -> GaitPhaseGenerator
  -> ModifierResolver
  -> FootTargetSolver
  -> PelvisSolver
  -> SpineSolver
  -> ArmSwingSolver
  -> PoseComposer
  -> IK/FK Output
```

## How To Read This Specification

Start with Principles, then Gait Cycle, Walking, Running, Modifiers, Solvers, Runtime, and Unreal Engine integration.

Research documents and source cards explain where rules came from and what remains uncertain.

## Success Criterion

HLS is successful when a developer can implement code from it and get believable Level 3 procedural human locomotion without needing full physics or mandatory mocap.
