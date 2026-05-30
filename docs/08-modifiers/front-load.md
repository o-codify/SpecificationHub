---
id: front-load-modifier
title: Front Load Modifier
status: draft
version: 26.530.019
tags:
  - modifier
  - load
  - front-load
  - provenance
  - links
---

# Front Load Modifier

## Purpose

Defines how carrying a load in front of the body changes locomotion.

## Visual Target

The character should look braced. The torso should resist collapse, steps should become shorter, and arms should be occupied or restricted.

## Rules

- Front load reduces arm swing strongly.
- Front load shortens step length.
- Front load can create slight backward compensation or a rigid braced torso.
- Heavy front load increases spine stiffness.
- Heavy front load reduces visibility of normal shoulder counter-rotation.
- Large front load can reduce forward speed and turning speed.

## Parameters

- LoadWeightNormalized: 0..1.
- LoadSizeNormalized: 0..1.
- StepLengthMultiplier: 1.0 to 0.65.
- CadenceMultiplier: 1.0 to 0.85.
- ArmSwingMultiplier: 1.0 to 0.1.
- SpineStiffness: 0.2 to 0.9.
- TorsoPitchCompensation: -4 to 4 degrees depending on load style.

## Runtime Rule

A front load should mainly restrict the upper body and shorten steps. The exact pitch direction depends on whether the character hugs the load, carries it low, or braces it at chest height.

## Rule Provenance

### Arm restriction from front load

| Field | Value |
|---|---|
| Rule | Front load strongly reduces normal arm swing. |
| Source card | [Load Carriage Posture](../research/source-cards/load-carriage-posture.md), [KIT Whole-Body](../research/source-cards/kit-whole-body.md) |
| External link | https://motion-database.humanoids.kit.edu/ |
| Source type | load carriage topic / whole-body dataset reference / HLS inference |
| Used from source | Carrying objects affects whole-body posture and arm availability. |
| HLS transformation | Added `ArmSwingMultiplier` and carry override priority for front-load states. |
| Confidence | medium |
| Applies to | [Arm Swing Solver](../09-solvers/arm-swing-solver.md), [Pose Composer](../09-solvers/pose-composer.md), [Modifier Stacking](../10-runtime/modifier-stacking.md) |

### Shorter steps and braced torso

| Field | Value |
|---|---|
| Rule | Front load shortens step length and increases spine stiffness. |
| Source card | [Load Carriage Posture](../research/source-cards/load-carriage-posture.md) |
| External link | https://pubmed.ncbi.nlm.nih.gov/?term=load+carriage+posture+gait+trunk+lean |
| Source type | load carriage research topic plus gameplay readability inference |
| Used from source | Load carriage changes posture and gait parameters. |
| HLS transformation | Added `StepLengthMultiplier`, `CadenceMultiplier`, and `SpineStiffness` for front load. |
| Confidence | medium |
| Applies to | [Posture](../07-posture/index.md), [Parameter System](../10-runtime/parameter-system.md), [Modifier Stacking](../10-runtime/modifier-stacking.md) |

## Numeric Data Separation

| Value | Category | Usage |
|---|---|---|
| front load restricts arms | HLS rule from load/carry logic | reduce arm swing |
| `StepLengthMultiplier = 1.0..0.65` | HLS tuning range | first-pass gameplay value |
| `ArmSwingMultiplier = 1.0..0.1` | HLS tuning range | first-pass gameplay value |
| `SpineStiffness = 0.2..0.9` | HLS tuning range | first-pass gameplay value |

## Open Questions

- Separate rules are needed for chest carry, waist carry, and two-hand heavy carry.
- Hand IK should probably override normal arm swing.
