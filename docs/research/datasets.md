---
id: motion-datasets
title: Motion Datasets
status: draft
version: 26.529.2045
tags:
  - research
  - datasets
---

# Motion Datasets

## Purpose

Tracks motion datasets useful for HLS analysis, validation, and later implementation tests.

## CMU Motion Capture Database

Useful for walking, running, sports, and everyday action reference.

HLS use: gait timing, cadence comparison, and animation validation.

## AMASS

Useful as a large unified human motion collection.

HLS use: broad locomotion reference and validation against diverse motion.

## Human3.6M

Useful for pose and joint motion analysis.

HLS use: joint reference and pose validation.

## KIT Whole-Body Human Motion Database

Useful for whole-body actions and object interaction.

HLS use: posture, carrying, and whole-body coordination.

## LaFAN1

Useful for locomotion transitions and animation interpolation.

HLS use: transition validation and foot sliding checks.

## Mixamo Samples

Useful for rough game animation reference, not scientific truth.

HLS use: practical game-style comparison in Unreal Engine.

## Dataset Policy

HLS should not require mocap at runtime. Datasets are references for extracting rules, tuning parameters, and validating generated poses.
