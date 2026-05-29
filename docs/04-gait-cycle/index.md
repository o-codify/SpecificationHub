---
id: gait-cycle
title: Gait Cycle
status: draft
version: 26.529.2154
tags:
  - gait
  - phase
  - walking
  - running
  - provenance
---

# Gait Cycle

## Purpose

Defines the normalized gait cycle used by HLS solvers.

HLS does not attempt full medical or robotic accuracy. It defines a compact control model for Level 3 Alive Game Motion.

## Core Model

```ts
type GaitCycleInput = {
  gaitPhase: number;
  speed: number;
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
```

## Walking Rules

- Walking uses stance and swing.
- Normal walking stance is approximately 60 percent of the cycle.
- Normal walking swing is approximately 40 percent of the cycle.
- Walking includes double support.
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

These bands are implementation control ranges, not strict clinical truth.

## Running Rules

- Running has no double support.
- Running includes a flight phase.
- Running stance is shorter than walking stance.
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
R3. Walking default stance ratio is 0.60.
R4. Running default stance ratio is lower than walking.
R5. Pelvis phase is derived from gait phase.
R6. Arm phase is opposite to leg advancement.
R7. Modifiers may warp phase ratios but must preserve continuity.
```

## Rule Provenance

### Walking stance and swing ratio

Rule: walking uses default stance ratio 0.60 and swing ratio 0.40.

Source type: clinical gait overview and normal gait descriptions.

Used from source: normal gait is commonly described as stance plus swing, with stance taking the larger part of the walking cycle.

HLS transformation: converted the clinical phase description into runtime defaults for GaitPhaseGenerator and Walking.

Confidence: high for the relationship, medium for exact gameplay tuning.

Source cards: normal-gait-overview, gait-cycle-clinical.

### Double support in walking

Rule: walking has double support.

Source type: clinical gait overview.

Used from source: walking includes intervals where both feet contact the ground.

HLS transformation: represented support mode as double, left, right, or flight.

Confidence: high.

Source cards: normal-gait-overview, gait-cycle-clinical.

### Running flight phase

Rule: running can enter flight mode and does not use walking-style double support.

Source type: running biomechanics.

Used from source: running differs from walking by support timing and flight.

HLS transformation: added supportMode flight and lower running stance ratio.

Confidence: high for the distinction, medium for exact runtime bands.

Source cards: running-biomechanics.

### Foot locking priority

Rule: planted feet should remain stable during stance.

Source type: procedural animation and game animation implementation constraint.

Used from source: foot sliding breaks perceived contact and weight.

HLS transformation: stance phase generates foot lock state for FootTargetSolver.

Confidence: high for visual importance, medium for exact correction thresholds.

Source cards: ik-foot-placement, procedural-animation-overview.

## Numeric Data Separation

Source-backed numeric default:

- walking stance approximately 60 percent
- walking swing approximately 40 percent

HLS tuning values:

- running stance 0.30 to 0.45
- runtime subphase bands

These tuning values are not presented as clinical facts. They are implementation ranges for Level 3 game motion.

## Open Questions

- Exact stylized phase bands for Level 3 gameplay.
- How much injury should change phase timing versus amplitude.
- Whether fatigue should slow cadence or reduce pose amplitude first.
