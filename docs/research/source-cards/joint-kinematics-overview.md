---
id: source-card-joint-kinematics-overview
title: "Source Card: Joint Kinematics Overview"
status: draft
version: 26.529.2218
tags:
  - research
  - joints
  - kinematics
  - linked-source
---

# Source Card: Joint Kinematics Overview

## Metadata

| Field | Value |
|---|---|
| Title | Joint Kinematics in Human Gait |
| Type | Biomechanics overview / gait kinematics |
| Reliability | Medium |
| Relevance | High |
| Access status | Accessible overview sources, primary paper selection still needed |

## Links

- Gait cycle overview: https://teachmeanatomy.info/lower-limb/misc/gait-cycle/
- Physiopedia gait cycle: https://www.physio-pedia.com/The_Gait_Cycle
- PubMed search entry point: https://pubmed.ncbi.nlm.nih.gov/?term=human+gait+joint+kinematics+pelvis+hip+knee+ankle

## What it says

Human walking coordinates pelvis, spine, hips, knees, ankles, feet, shoulders, arms, neck, and head. Exact joint angles vary by subject, speed, and measurement method, but first-pass HLS can extract stable directional rules.

## What HLS Used

- Pelvis participates in gait and should not remain static.
- Shoulders and arms counterbalance leg and pelvis movement.
- Knees flex during swing for clearance.
- Feet transition through contact, support, and push-off.
- Head should be visually more stable than pelvis.

## What HLS Did Not Use

- Exact clinical joint angle curves.
- Patient-specific gait diagnosis.
- Full inverse dynamics.
- Robotics-grade physical simulation.

## Extracted HLS Facts

- Pelvis vertical oscillation adds weight readability.
- Pelvis yaw and shoulder counter-rotation help avoid mechanical motion.
- Arm-leg opposition improves natural gait readability.
- Knee and foot behavior should be driven by phase and foot targets.

## Candidate HLS Rules

```text
PelvisYaw = sin(gaitPhase) * PelvisYawAmplitude
ShoulderYaw = -PelvisYaw * ShoulderCounterRotationMultiplier
ArmSwingPhase = oppositeLegPhase
```

```text
if legPhase == Swing:
    increase foot clearance through knee flexion / IK target arc
```

## Numeric Data

No exact joint angle curves are extracted in this first pass.

HLS uses tunable amplitudes for pelvis yaw, pelvis vertical motion, shoulder counter-rotation, and foot lift.

## HLS Transformation

```text
joint kinematics overview
  -> directional coordination rules
  -> tunable amplitudes
  -> pelvis, spine, arm, and foot solvers
```

## Uncertainty

- Exact amplitude ranges for Level 3 game motion.
- Whether HLS should later include reference joint curves for walk and run.
- How much head stabilization is required for visible improvement.

## Used By

- `docs/03-joints/index.md`
- `docs/05-walking/index.md`
- `docs/09-solvers/pelvis-solver.md`
- `docs/09-solvers/spine-solver.md`
- `docs/09-solvers/arm-swing-solver.md`
