---
id: networking-model
title: Networking Model
status: draft
version: 26.529.2149
tags:
  - runtime
  - networking
  - multiplayer
---

# Networking Model

## Purpose

Defines how HLS should behave in multiplayer.

The goal is believable visual locomotion without replicating every bone.

## Core Rule

Server owns gameplay state. Clients solve visual pose locally from replicated movement and compact locomotion state.

## Server Responsibilities

- authoritative position and movement state
- gameplay-relevant load state
- gameplay-relevant injury state
- weapon and carry state
- grounded or airborne state
- stairs or terrain state when gameplay relevant
- state changes that affect movement ability

## Client Responsibilities

- local pose solving
- foot target smoothing
- pelvis and spine smoothing
- arm pose smoothing
- debug visualization
- cosmetic secondary motion

## What To Replicate

Replicate compact state:

- movement velocity
- desired facing direction
- locomotion state
- gait type
- load state summary
- injury state summary
- weapon or carry state
- compressed gait phase if needed
- correction timestamps

## What Not To Replicate Normally

Do not replicate:

- every bone transform
- every IK target every frame
- every solver intermediate value
- cosmetic secondary motion

## Gait Phase Networking

Options:

1. Recompute gait phase locally from velocity and cadence.
2. Replicate compressed phase occasionally.
3. Snap or resync phase during major corrections.

Preferred first pass: local phase with occasional correction.

## Simulated Proxy Rules

- Preserve phase continuity.
- Smooth remote corrections.
- Avoid visible foot teleporting.
- Prefer small foot sliding over violent pose popping.
- Disable expensive debug or secondary motion by distance.

## Open Questions

- Exact compressed state layout.
- Whether foot lock state needs replication for high fidelity.
- How to handle teleportation, knockback, and ragdoll transitions.
