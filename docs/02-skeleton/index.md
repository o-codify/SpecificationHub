---
id: skeleton
title: Skeleton
status: draft
version: 26.530.1039
tags:
  - skeleton
  - rig
  - bones
---

# Skeleton

## Purpose

Defines the minimum skeleton assumptions required by HLS.

HLS is skeleton-agnostic, but it requires a consistent humanoid rig with readable lower body, pelvis, spine, arms, neck, and head.

## Required Body Regions

- root or character origin
- pelvis
- left and right hip
- left and right knee
- left and right ankle
- left and right foot or ball joint
- lumbar or lower spine
- thoracic or upper spine
- neck
- head
- left and right clavicle or shoulder root
- left and right shoulder
- left and right elbow
- left and right wrist or hand

## Recommended Virtual Controls

- pelvis control
- left foot IK target
- right foot IK target
- left knee pole target
- right knee pole target
- spine control
- chest control
- head control
- left hand target
- right hand target

## Runtime Assumptions

- Feet can be positioned by IK.
- Pelvis can be offset vertically and rotated subtly.
- Spine can receive additive pitch, roll, and yaw offsets.
- Arms can be driven by swing rules or overridden by carry and weapon states.
- Head can be stabilized relative to body motion.

## Scale Assumptions

HLS parameters should be normalized where possible and then converted to character scale.

Examples:

- step length scales with leg length
- foot lift scales with character height
- pelvis vertical amplitude scales with body size
- step width scales with pelvis width

## Constraints

- Joint limits should prevent impossible poses.
- Feet should not cross unless a special animation state allows it.
- Knees should preserve stable pole direction.
- Pelvis should not move so far that IK overextends legs.

## Unreal Engine Notes

UE Manny or other standard humanoid rigs can be supported if they expose pelvis, feet, spine, arms, neck, and head controls.

## Open Questions

- Exact bone naming convention for the first implementation.
- Whether HLS should define a canonical skeleton data asset.
- How to support non-standard proportions.
