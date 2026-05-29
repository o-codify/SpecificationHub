---
id: gait-cycle
title: Gait Cycle
status: draft
version: 26.529.2043
tags:
  - gait
  - phase
  - walking
  - running
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

## Pseudocode

```ts
function solveLegPhase(phase: number, gait: "walk" | "run"): LegPhase {
  if (gait === "walk") {
    if (phase < 0.60) return { phase, contact: true, subPhase: solveWalkingStanceSubPhase(phase) };
    return { phase, contact: false, subPhase: solveWalkingSwingSubPhase(phase) };
  }

  if (phase < 0.40) return { phase, contact: true, subPhase: "run_stance" };
  return { phase, contact: false, subPhase: "run_swing_or_flight" };
}
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

## Source Notes

Source cards: normal-gait-overview, gait-cycle-clinical, running-biomechanics.

## Open Questions

- Exact stylized phase bands for Level 3 gameplay.
- How much injury should change phase timing versus amplitude.
- Whether fatigue should slow cadence or reduce pose amplitude first.
