---
id: networking-model
title: Networking Model
status: draft
version: 26.529.2307
tags:
  - runtime
  - networking
  - multiplayer
  - provenance
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

## Rule Provenance

### Replicate compact state, not bones

| Field | Value |
|---|---|
| Rule | Do not replicate every bone for normal locomotion. |
| Source card | `docs/research/source-cards/procedural-animation-overview.md`, `docs/research/source-cards/unreal-engine-control-rig.md` |
| External link | https://dev.epicgames.com/documentation/en-us/unreal-engine/animation-blueprints-in-unreal-engine |
| Source type | multiplayer implementation constraint / Unreal animation architecture |
| Used from source | Animation systems can solve pose locally from runtime data and controls. |
| HLS transformation | Replicate compact gameplay and locomotion state; solve pose locally on clients. |
| Confidence | high as architecture rule |
| Applies to | `OutputPose`, `PoseComposer`, `Unreal Engine Network Notes` |

### Phase continuity on proxies

| Field | Value |
|---|---|
| Rule | Simulated proxies should preserve gait phase continuity during corrections. |
| Source card | `docs/research/source-cards/lafan1.md`, `docs/research/source-cards/motion-matching.md` |
| External link | https://github.com/ubisoft/ubisoft-laforge-animation-dataset |
| Source type | animation continuity / transition validation reference |
| Used from source | Temporal continuity is important for believable motion transitions. |
| HLS transformation | Proxy phase should be locally advanced and corrected gradually instead of hard-reset every frame. |
| Confidence | high as visual rule |
| Applies to | `GaitPhaseGenerator`, `Runtime Constraints`, `Validation Methodology` |

### Server owns gameplay state

| Field | Value |
|---|---|
| Rule | Server owns gameplay-relevant movement and modifier state. |
| Source card | `docs/research/source-cards/procedural-animation-overview.md` |
| External link | https://dev.epicgames.com/documentation/en-us/unreal-engine/networking-and-multiplayer-in-unreal-engine |
| Source type | engine/networking architecture constraint |
| Used from source | Multiplayer systems distinguish authoritative gameplay state from client-side visual presentation. |
| HLS transformation | Server validates state; clients solve visual pose from replicated state. |
| Confidence | high |
| Applies to | `LocomotionStateResolver`, `ModifierStacking`, `Unreal Engine Network Notes` |

## Numeric Data Separation

| Value | Category | Usage |
|---|---|---|
| compact replicated state | HLS networking contract | multiplayer implementation |
| phase correction alpha | HLS tuning value | proxy smoothing |
| LOD cutoff distance | HLS tuning value | disable expensive visual work |

## Open Questions

- Exact compressed state layout.
- Whether foot lock state needs replication for high fidelity.
- How to handle teleportation, knockback, and ragdoll transitions.
