---
id: source-card-joint-kinematics-overview
title: "Source Card: Joint Kinematics Overview"
status: draft
version: 26.529.2143
tags:
  - research
  - joints
  - kinematics
---

# Source Card: Joint Kinematics Overview

## Metadata

Type: biomechanics overview topic.

Reliability: medium to high.

Relevance: high.

## What it says

Human walking coordinates pelvis, spine, hips, knees, ankles, shoulders, elbows, neck, and head. HLS does not need exact medical angles for first pass, but it needs consistent direction rules.

## Useful HLS Facts

- Pelvis has vertical oscillation.
- Pelvis rotates slightly around vertical axis.
- Shoulders counter-rotate against pelvis.
- Arms swing opposite to legs.
- Knee flexes during swing for foot clearance.
- Ankle and foot transition through contact, flat support, and push-off.
- Head remains more stable than pelvis.

## Candidate HLS Rules

- Drive pelvis yaw from gait phase.
- Drive shoulder yaw opposite pelvis yaw.
- Increase knee clearance during swing by foot lift height.
- Use head stabilization to reduce full-body mechanical motion.

## HLS Target Sections

- docs/03-joints
- docs/04-gait-cycle
- docs/05-walking
- docs/09-solvers/spine-solver.md
