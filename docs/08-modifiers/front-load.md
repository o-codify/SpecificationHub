---
id: front-load-modifier
title: Front Load Modifier
status: draft
version: 26.529.2134
tags:
  - modifier
  - load
  - front-load
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

## Open Questions

- Separate rules are needed for chest carry, waist carry, and two-hand heavy carry.
- Hand IK should probably override normal arm swing.
