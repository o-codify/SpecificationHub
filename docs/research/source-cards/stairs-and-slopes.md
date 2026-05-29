---
id: source-card-stairs-and-slopes
title: "Source Card: Stairs and Slopes"
status: draft
version: 26.529.2217
tags:
  - research
  - stairs
  - slope
  - terrain
  - linked-source
---

# Source Card: Stairs and Slopes

## Metadata

| Field | Value |
|---|---|
| Title | Stair and Slope Locomotion |
| Type | Biomechanics / locomotion research topic |
| Reliability | Medium |
| Relevance | High |
| Access status | Accessible overview and paper sources, more primary papers needed |

## Links

- Stair gait overview: https://www.physio-pedia.com/Stair_Gait
- Incline walking / running review example: https://www.ncbi.nlm.nih.gov/pmc/articles/PMC7454943/

## What it says

Slope walking and stair walking are terrain-specific locomotion modes. Uphill movement increases effort, forward lean, and foot clearance. Downhill movement tends to be more cautious. Stairs require discrete foot placement on treads rather than continuous ground projection.

## What HLS Used

- Uphill requires more forward torso lean.
- Uphill requires more foot lift.
- Uphill usually shortens step length.
- Downhill requires cautious placement and speed reduction.
- Stairs should use discrete foot targets.
- Pelvis height should follow stair height with smoothing.

## What HLS Did Not Use

- Exact clinical stair rehabilitation rules.
- Full force or joint-torque simulation.
- Detailed energy expenditure modeling.

## Extracted HLS Facts

- Slope is not just flat walking rotated to terrain.
- Stairs are not just steep slopes.
- FootTargetSolver needs different target selection on stairs.
- PelvisSolver must support terrain height changes.

## Candidate HLS Rules

```text
if slope > 0:
    increase torso forward pitch
    increase foot lift
    reduce step length
```

```text
if stairsDetected:
    use discrete tread foot targets
    smooth pelvis height by stair step height
```

## Numeric Data

No fixed numeric runtime values are extracted in this first pass.

HLS tuning values such as uphill foot lift multiplier and stair pelvis smoothing are gameplay defaults.

## HLS Transformation

```text
terrain-specific locomotion observation
  -> slope modifier
  -> stairs modifier
  -> foot target selection rule
  -> pelvis height smoothing rule
```

## Uncertainty

- Exact thresholds for switching from slope mode to stairs mode.
- Whether downhill should prefer heel-first or flat-foot placement.
- How much foot clearance is required for different stair heights.

## Used By

- `docs/08-modifiers/slope.md`
- `docs/08-modifiers/stairs.md`
- `docs/09-solvers/foot-target-solver.md`
- `docs/09-solvers/pelvis-solver.md`
