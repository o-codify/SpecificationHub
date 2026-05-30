---
id: runtime-constraints
title: Runtime Constraints
status: review
version: 26.530.1354
tags:
  - runtime
  - constraints
  - safety
  - provenance
  - links
  - numeric
---

# Runtime Constraints

## Purpose

Defines safety constraints for HLS runtime.

Constraints prevent procedural solvers from creating impossible, ugly, or unstable poses.

## Foot Constraints

- Foot targets must remain within IK reach: first-pass clamp 0.85..0.95 of leg length.
- Stance foot should not slide unless correction is necessary; ordinary correction should stay under 0.02..0.05 m per frame-equivalent correction.
- Feet should not cross during ordinary walking; step width should remain 0.08..0.22 m unless a special state overrides it.
- Foot orientation should align to ground normal only within safe limits; first-pass pitch/roll clamp is 25 degrees.
- Swing foot must clear terrain by minimum clearance; flat-ground clearance starts at 0.04..0.10 m.

## Pelvis Constraints

- Pelvis height must not overextend legs; pelvis offset clamp is 0.10..0.18 of leg length.
- Pelvis vertical motion should be smoothed with 0.08..0.20 s smoothing.
- Pelvis roll and yaw should remain subtle for Level 3: yaw 2..6 degrees, roll 1..4 degrees for ordinary walking.
- Pelvis offsets must respect character scale.

## Spine Constraints

- Torso lean must be clamped: walk 0..5 degrees, run 5..15 degrees, hard clamp 20 degrees.
- Spine stiffness should not fully freeze the body except special states; ordinary range is 0..0.8, hard clamp 1.0.
- Shoulder counter-rotation should be reduced under weapon or heavy carry; ordinary range is 0.5..1.0 of pelvis yaw, constrained range is 0..0.3.
- Head stabilization should not detach visually from torso.

## Arm Constraints

- Arm swing must not fight weapon or carry poses.
- Hand IK has priority over cosmetic arm swing.
- Elbow bend should remain within natural-looking limits; first-pass hard clamp is 0..60 degrees.
- Ordinary walk arm swing is 10..35 degrees; run multiplier is 1.20..1.75 before weapon/carry clamps.

## Modifier Constraints

- Multiple modifiers must pass through safety clamps.
- Severe injury can downgrade gait instead of producing broken running.
- Heavy load can downgrade sprint instead of extreme leaning.
- Stairs can override generic slope placement.
- Severe load or injury should reduce step length/cadence by 10..35 percent before state downgrade.
- Stance ratio must remain within 0.30..0.75 after all modifiers.

## Network Constraints

- Remote smoothing should avoid pose pops.
- Phase correction should be gradual unless teleporting; first-pass correction time is 0.10..0.30 s.
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
| HLS transformation | Added IK reach limits, foot lock constraints, and terrain clearance checks. IK reach uses 0.85..0.95 of leg length; flat terrain foot clearance starts at 0.04..0.10 m. |
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
| HLS transformation | Resolver downgrades locomotion state before extreme parameter values are allowed. First-pass severe modifier penalties reduce step length/cadence by 10..35 percent before downgrade. |
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
| HLS transformation | Added gradual phase correction and anti-pop smoothing requirements. Phase corrections blend over 0.10..0.30 s unless teleporting. |
| Confidence | high |
| Applies to | [Networking](./networking.md), [Gait Phase Generator](../09-solvers/gait-phase-generator.md), [Pose Composer](../09-solvers/pose-composer.md) |

## Numeric Data Separation

| Value | Category | Usage |
|---|---|---|
| IK reach limits | implementation constraint | solver safety |
| `IKReach = 0.85..0.95 * LegLength` | implementation safety range | foot and pelvis reach |
| `FootClearance = 0.04..0.10 m` | HLS tuning range | flat-ground swing clearance |
| `StepWidth = 0.08..0.22 m` | HLS tuning range | avoid foot crossing |
| `PelvisOffset = 0.10..0.18 * LegLength` | implementation safety range | prevent overextension |
| `TorsoLean hard clamp = 20 deg` | HLS safety clamp | prevent extreme lean |
| `ElbowBend hard clamp = 0..60 deg` | HLS safety clamp | prevent unnatural arm pose |
| `StanceRatio = 0.30..0.75` | HLS safety clamp | prevent impossible timing |
| `PhaseCorrectionTime = 0.10..0.30 s` | HLS tuning range | network continuity |
| clamp thresholds | HLS tuning values | runtime safety |
| downgrade thresholds | HLS tuning values | gait protection |

## Open Questions

- Exact numeric clamp values for first implementation.
- Whether constraints should be per skeleton profile.
- How to expose constraint failures in automated tests.
