---
id: glossary
title: Glossary
status: draft
version: 26.530.1059
tags:
  - glossary
---

# Glossary

## Alive Game Motion

Target quality level for HLS. The character looks alive because state affects the body: load, fatigue, injury, slope, turning, stopping, and weapon carry.

## Cadence

Step rhythm. In runtime, cadence controls how fast gait phase advances.

## Double Support

Walking interval where both feet are in contact with the ground.

## Flight Phase

Running interval where neither foot contacts the ground.

## Gait Phase

Normalized cycle value from 0 to 1 used to coordinate legs, pelvis, spine, and arms.

## Heel Strike

Initial foot contact at the beginning of stance.

## Stance Phase

Part of gait where the foot is in contact with the ground.

## Swing Phase

Part of gait where the foot moves forward to the next contact.

## Foot Target

Procedural transform used by IK to place a foot.

## Foot Locking

Keeping a planted foot stable during stance to avoid sliding.

## Modifier

A state-driven change to locomotion parameters. Examples: load, injury, slope, fatigue, weapon carry.

## Pose Composer

Runtime layer that combines solver outputs into final pose intent before IK or FK application.

## Solver

Runtime module that computes one part of procedural locomotion, such as feet, pelvis, spine, or arms.

## Stance Ratio

Fraction of the gait cycle spent in contact with the ground.
