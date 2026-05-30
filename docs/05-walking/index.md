---
id: walking
title: Walking
status: review
version: 26.530.1548
tags:
  - walking
  - gait
  - provenance
  - links
  - numeric
---

# Walking

## Purpose

Defines first-pass walking locomotion values and rules.

Walking is the default grounded locomotion profile. It uses alternating leg support, longer stance than swing, and visible double support.

## Reference Parameters

| Parameter | First-pass range | Usage |
|---|---:|---|
| StepLength | 0.60..0.80 m | ordinary adult walk sanity range |
| StepWidth | 0.08..0.18 m | ordinary support width |
| Cadence | 100..120 spm | ordinary walk timing |
| StanceRatio | 0.58..0.62 | stance duration |
| SwingRatio | 0.38..0.42 | swing duration |
| DoubleSupportRatio | 0.20..0.24 | support sanity check |
| FootLiftHeight | 0.04..0.10 m | clearance before terrain/stair bonus |
| PelvisVerticalAmplitude | 0.02..0.05 m | subtle vertical rhythm |
| PelvisYawAmplitude | 2..6 deg | pelvis rhythm |
| PelvisRollAmplitude | 1..4 deg | weight transfer |
| TorsoLean | 0..5 deg | walking posture |
| ArmSwingAmplitude | 10..35 deg | ordinary walking arm swing |

## Runtime Formula

```text
StepFrequencyHz = Cadence / 60
Speed = StepLength * StepFrequencyHz
CycleDuration = 2 / StepFrequencyHz
StanceDuration = CycleDuration * StanceRatio
SwingDuration = CycleDuration * SwingRatio
```

## Rules

- Walking should preserve alternating support.
- Walking should keep stance longer than swing.
- Walking should show double support unless stylized away.
- Foot lift should remain low on flat ground and increase only for terrain, stairs, or obstacle clearance.
- Pelvis and torso motion should support foot contact rather than break it.
- Modifiers may reduce step length, cadence, arm swing, and torso freedom, but should remain clamp-safe.

## Rule Provenance

### Normal walking timing

| Field | Value |
|---|---|
| Rule | Walking has stance, swing, and double support, with stance longer than swing. |
| Source card | [Normal Gait Overview](../../research/source-cards/normal-gait-overview.md) |
| External link | https://www.physio-pedia.com/The_Gait_Cycle |
| Source type | gait overview |
| Used from source | Normal gait is organized into stance and swing, with stance longer than swing and double support present. |
| HLS transformation | Walking uses StanceRatio 0.58..0.62 and DoubleSupportRatio 0.20..0.24 as first-pass runtime values. |
| Confidence | high |
| Applies to | [Gait Cycle](../04-gait-cycle/index.md), [Gait Phase Generator](../09-solvers/gait-phase-generator.md) |

### Walking speed relationship

| Field | Value |
|---|---|
| Rule | Walking speed follows step length times step frequency. |
| Source card | [Normal Gait Overview](../../research/source-cards/normal-gait-overview.md) |
| External link | https://www.physio-pedia.com/The_Gait_Cycle |
| Source type | gait timing relationship |
| Used from source | Cadence and step length describe gait timing and displacement. |
| HLS transformation | Runtime uses `Speed = StepLength * StepFrequencyHz` as a consistency formula. |
| Confidence | high |
| Applies to | [Parameter System](../10-runtime/parameter-system.md), [Foot Target Solver](../09-solvers/foot-target-solver.md) |

### Walking whole-body motion

| Field | Value |
|---|---|
| Rule | Walking includes coordinated pelvis, torso, and arm motion. |
| Source card | [Joint Kinematics Overview](../../research/source-cards/joint-kinematics-overview.md) |
| External link | https://www.physio-pedia.com/The_Gait_Cycle |
| Source type | gait kinematics overview |
| Used from source | Human gait coordinates pelvis, trunk, shoulders, and limbs. |
| HLS transformation | Added pelvis yaw/roll/vertical ranges, torso lean, and arm swing tuning ranges for first-pass procedural walking. |
| Confidence | medium-high |
| Applies to | [Pelvis Solver](../09-solvers/pelvis-solver.md), [Spine Solver](../09-solvers/spine-solver.md), [Arm Swing Solver](../09-solvers/arm-swing-solver.md) |

## Numeric Data Separation

| Value | Category | Usage |
|---|---|---|
| stance longer than swing | source-backed relationship | walking phase |
| double support | source-backed relationship | walking support |
| `StepLength = 0.60..0.80 m` | HLS tuning range | ordinary walking |
| `Cadence = 100..120 spm` | HLS tuning range | ordinary walking |
| `FootLiftHeight = 0.04..0.10 m` | HLS tuning range | foot clearance |
| pelvis and arm ranges | HLS tuning values | procedural readability |

## Open Questions

- Whether crouch-walk should be a separate profile.
- Whether stylized characters should scale cadence or step length first.
