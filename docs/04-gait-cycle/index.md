---
id: gait-cycle
title: Gait Cycle
status: review
version: 26.530.1306
tags:
  - gait
  - phase
  - walking
  - running
  - provenance
  - numeric
---

# Gait Cycle

## Purpose

Defines the normalized gait cycle used by HLS solvers.

HLS does not attempt full medical or robotic accuracy. It defines a compact control model for Level 3 Alive Game Motion.

## Core Model

```ts
type GaitCycleInput = {
  gaitPhase: number;
  speed: number;        // meters per second
  cadence: number;      // steps per minute
  gaitType: "walk" | "run";
};

type LegPhase = {
  phase: number;
  contact: boolean;
  subPhase: string;
};
```

Left and right legs are offset by half a cycle.

```text
LeftLegPhase = gaitPhase
RightLegPhase = (gaitPhase + 0.5) % 1.0

StepFrequencyHz = CadenceSPM / 60
StrideFrequencyHz = StepFrequencyHz / 2
StrideDurationSeconds = 1 / StrideFrequencyHz
StanceDurationSeconds = StrideDurationSeconds * StanceRatio
SwingDurationSeconds = StrideDurationSeconds * (1 - StanceRatio)
SpeedMetersPerSecond = StepLengthMeters * StepFrequencyHz
```

## Walking Rules

- Walking uses stance and swing.
- Normal walking stance is approximately 60 percent of the cycle.
- Normal walking swing is approximately 40 percent of the cycle.
- Walking includes double support.
- Double support is commonly about 20 percent to 24 percent of a walking cycle in normal adult walking; HLS uses this as a reference range, not a fixed gameplay constant.
- Comfortable adult walking speed is commonly around 1.2 to 1.4 m/s; HLS uses this only as a scale sanity check.
- Planted feet should remain stable during stance.
- Swinging feet move through a lifted arc.

## Walking Runtime Bands

```text
0.00 - 0.10 initial contact / heel strike
0.10 - 0.20 loading response / foot flat
0.20 - 0.40 mid stance
0.40 - 0.60 terminal stance / heel off / toe off
0.60 - 0.75 initial swing
0.75 - 0.90 mid swing
0.90 - 1.00 terminal swing
```

These bands are implementation control ranges, not strict clinical truth. For a first HLS profile, keep the stance boundary near 0.58 to 0.62 for ordinary walking unless a modifier intentionally changes it.

## Running Rules

- Running has no double support.
- Running includes a flight phase.
- Running stance is shorter than walking stance.
- Running stance ratio should usually remain below 0.50 in first-pass HLS tuning.
- Running uses stronger vertical pelvis motion.
- Running uses stronger arm swing.
- Running usually has more forward torso lean.

## Outputs

```ts
type GaitCycleOutput = {
  left: LegPhase;
  right: LegPhase;
  supportMode: "double" | "left" | "right" | "flight";
  pelvisPhase: number;
  armPhase: number;
};
```

## HLS Rules

```text
R1. Phase is normalized 0..1.
R2. Opposite legs are offset by 0.5 phase.
R3. Walking default stance ratio is 0.60, with first-pass tuning range 0.58..0.62.
R4. Walking double support reference range is 0.20..0.24 of the full cycle.
R5. Running default stance ratio is lower than walking; first-pass tuning range is 0.30..0.45.
R6. Pelvis phase is derived from gait phase.
R7. Arm phase is opposite to leg advancement.
R8. Modifiers may warp phase ratios but must preserve continuity.
R9. Speed, step length, and cadence must remain dimensionally consistent: Speed = StepLength * CadenceSPM / 60.
```

## Rule Provenance

### Walking stance and swing ratio

Rule: walking uses default stance ratio 0.60 and swing ratio 0.40.

Source type: clinical gait overview and normal gait descriptions.

Used from source: normal gait is commonly described as stance plus swing, with stance taking the larger part of the walking cycle; common clinical teaching describes stance as about 60 percent and swing as about 40 percent.

HLS transformation: converted the clinical phase description into runtime defaults for [Gait Phase Generator](../09-solvers/gait-phase-generator.md) and [Walking](../05-walking/index.md). HLS clamps first-pass ordinary walking around 0.58..0.62 to allow style variation without losing the normal gait relationship.

Confidence: high for the relationship, medium for exact gameplay tuning.

Source cards: [Normal Gait Overview](../research/source-cards/normal-gait-overview.md), [CMU Motion Capture Database](../research/source-cards/cmu-mocap.md).

### Double support in walking

Rule: walking has double support; HLS reference range is 0.20..0.24 of the cycle for ordinary adult walking.

Source type: clinical gait overview.

Used from source: walking includes intervals where both feet contact the ground.

HLS transformation: represented support mode as double, left, right, or flight. HLS treats double-support duration as a tunable timing window for foot locking and support blending.

Confidence: high for double support existence, medium for exact range.

Source cards: [Normal Gait Overview](../research/source-cards/normal-gait-overview.md).

### Running flight phase

Rule: running can enter flight mode and does not use walking-style double support.

Source type: running biomechanics.

Used from source: running differs from walking by support timing and flight.

HLS transformation: added supportMode flight and lower running stance ratio. First-pass HLS running stance uses 0.30..0.45, with faster running tending toward the lower end.

Confidence: high for the distinction, medium for exact runtime bands.

Source cards: [Running Biomechanics](../research/source-cards/running-biomechanics.md).

### Foot locking priority

Rule: planted feet should remain stable during stance.

Source type: procedural animation and game animation implementation constraint.

Used from source: foot sliding breaks perceived contact and weight.

HLS transformation: stance phase generates foot lock state for [Foot Target Solver](../09-solvers/foot-target-solver.md). Foot lock should begin no later than early stance and release before swing lift.

Confidence: high for visual importance, medium for exact correction thresholds.

Source cards: [IK Foot Placement](../research/source-cards/ik-foot-placement.md), [Procedural Animation Overview](../research/source-cards/procedural-animation-overview.md).

## Numeric Data Separation

Source-backed numeric defaults:

- walking stance approximately 60 percent
- walking swing approximately 40 percent
- walking double support approximately 20 to 24 percent of the cycle
- comfortable adult walking speed sanity-check range around 1.2 to 1.4 m/s

HLS tuning values:

- walking stance clamp for ordinary gait: 0.58 to 0.62
- running stance: 0.30 to 0.45
- runtime subphase bands
- foot lock blend in/out windows

These tuning values are not presented as clinical facts. They are implementation ranges for Level 3 game motion.

## Open Questions

- Exact stylized phase bands for Level 3 gameplay.
- How much injury should change phase timing versus amplitude.
- Whether fatigue should slow cadence or reduce pose amplitude first.
