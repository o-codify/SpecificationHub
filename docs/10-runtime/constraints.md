---
id: runtime-constraints
title: Runtime Constraints
status: draft
version: 26.530.957
tags:
  - runtime
  - constraints
  - safety
  - provenance
  - links
---

# Runtime Constraints

## Purpose

Defines safety constraints for HLS runtime.

Constraints prevent procedural solvers from creating impossible, ugly, or unstable poses.

## Foot Constraints

- Foot targets must remain within IK reach.
- Stance foot should not slide unless correction is necessary.
- Feet should not cross during ordinary walking.
- Foot orientation should align to ground normal only within safe limits.
- Swing foot must clear terrain by minimum clearance.

## Pelvis Constraints

- Pelvis height must not overextend legs.
- Pelvis vertical motion should be smoothed.
- Pelvis roll and yaw should remain subtle for Level 3.
- Pelvis offsets must respect character scale.

## Spine Constraints

- Torso lean must be clamped.
- Spine stiffness should not fully freeze the body except special states.
- Shoulder counter-rotation should be reduced under weapon or heavy carry.
- Head stabilization should not detach visually from torso.

## Arm Constraints

- Arm swing must not fight weapon or carry poses.
- Hand IK has priority over cosmetic arm swing.
- Elbow bend should remain within natural-looking limits.

## Modifier Constraints

- Multiple modifiers must pass through safety clamps.
- Severe injury can downgrade gait instead of producing broken running.
- Heavy load can downgrade sprint instead of extreme leaning.
- Stairs can override generic slope placement.

## Network Constraints

- Remote smoothing should avoid pose pops.
- Phase correction should be gradual unless teleporting.
- Do not replicate full bone poses for normal locomotion.

## Debug Constraints

Whenever a clamp changes a value, debug output should expose it.

## Rule Provenance

### IK reach and foot stability

| Field | Value |
|---|---|
| Rule | Foot targets must remain reachable and stance feet should remain stable. |
| Source card | [IK Foot Placement](../research/source-cards/ik-foot-placement.md), [Unreal Engine IK Rig](../research/source-cards/unreal-engine-ik-rig.md) |
| External link | https://dev.epicgames.com/documentation/en-us/unreal-engine/full-body-ik-in-unreal-engine |
| Source type | IK implementation constraint |
| Used from source | Stable contact and reachable targets prevent visible artifacts. |
| HLS transformation | Added IK reach limits, foot lock constraints, and terrain clearance checks. |
| Confidence | high |
| Applies to | [Foot Target Solver](../09-solvers/foot-target-solver.md), [Pelvis Solver](../09-solvers/pelvis-solver.md), [Output Pose](./output-pose.md) |

### Modifier downgrade instead of pose breakage

| Field | Value |
|---|---|
| Rule | Injury and load should downgrade gait before producing extreme poses. |
| Source card | [Antalgic Gait](../research/source-cards/antalgic-gait.md), [Load Carriage Posture](../research/source-cards/load-carriage-posture.md) |
| External link | https://www.ncbi.nlm.nih.gov/books/NBK559243/ |
| Source type | clinical gait and load carriage references |
| Used from source | Pain and load alter locomotion behavior rather than creating impossible movement. |
| HLS transformation | Resolver downgrades locomotion state before extreme parameter values are allowed. |
| Confidence | medium-high |
| Applies to | [Locomotion State Resolver](./locomotion-state-resolver.md), [Modifier Stacking](./modifier-stacking.md) |

### Networking continuity

| Field | Value |
|---|---|
| Rule | Network corrections should preserve continuity whenever possible. |
| Source card | [Motion Matching](../research/source-cards/motion-matching.md), [LaFAN1](../research/source-cards/lafan1.md) |
| External link | https://github.com/ubisoft/ubisoft-laforge-animation-dataset |
| Source type | transition continuity reference |
| Used from source | Temporal continuity is critical for believable locomotion. |
| HLS transformation | Added gradual phase correction and anti-pop smoothing requirements. |
| Confidence | high |
| Applies to | [Networking](./networking.md), [Gait Phase Generator](../09-solvers/gait-phase-generator.md), [Pose Composer](../09-solvers/pose-composer.md) |

## Numeric Data Separation

| Value | Category | Usage |
|---|---|---|
| IK reach limits | implementation constraint | solver safety |
| clamp thresholds | HLS tuning values | runtime safety |
| downgrade thresholds | HLS tuning values | gait protection |

## Open Questions

- Exact numeric clamp values for first implementation.
- Whether constraints should be per skeleton profile.
- How to expose constraint failures in automated tests.
