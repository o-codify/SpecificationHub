---
id: runtime-constraints
title: Runtime Constraints
status: draft
version: 26.529.2150
tags:
  - runtime
  - constraints
  - safety
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

## Open Questions

- Exact numeric clamp values for first implementation.
- Whether constraints should be per skeleton profile.
- How to expose constraint failures in automated tests.
