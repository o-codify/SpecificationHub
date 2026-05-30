---
id: source-card-stairs-and-slopes
title: "Source Card: Stairs and Slopes"
status: draft
version: 26.530.1253
tags:
  - research
  - stairs
  - slope
  - terrain
  - linked-source
  - links
  - numeric
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
- PubMed search anchor: https://pubmed.ncbi.nlm.nih.gov/?term=stair+gait+incline+walking+biomechanics+foot+clearance

## What it says

Slope walking and stair walking are terrain-specific locomotion modes. Uphill movement increases effort, forward lean, and foot clearance. Downhill movement tends to be more cautious. Stairs require discrete foot placement on treads rather than continuous ground projection.

The source-backed relationship is directional: slopes and stairs change posture, foot placement, clearance, speed confidence, and vertical body motion. HLS tuning ranges are gameplay implementation values, not clinical constants.

## What HLS Used

- Uphill requires more forward torso lean.
- Uphill requires more foot lift.
- Uphill usually shortens step length.
- Downhill requires cautious placement and speed reduction.
- Stairs should use discrete foot targets.
- Pelvis height should follow stair height with smoothing.
- Terrain confidence should decide when stair mode overrides slope mode.

## What HLS Did Not Use

- Exact clinical stair rehabilitation rules.
- Full force or joint-torque simulation.
- Detailed energy expenditure modeling.
- Universal thresholds that classify every slope or stair.

## Extracted HLS Facts

- Slope is not just flat walking rotated to terrain.
- Stairs are not just steep slopes.
- FootTargetSolver needs different target selection on stairs.
- PelvisSolver must support terrain height changes.
- Downhill movement should be treated as cautious rather than merely negative uphill.

## Candidate HLS Rules

```text
if slope > SlopeActivationAngle:
    increase torso forward pitch
    increase foot lift
    reduce step length and speed
```

```text
if slope < -SlopeActivationAngle:
    add downhill caution
    reduce stride confidence
    reduce speed
```

```text
if stairsDetected and TreadConfidence >= 0.60..0.80:
    use discrete tread foot targets
    smooth pelvis height by stair step height
```

## Numeric Data

No fixed numeric runtime values are extracted in this first pass.

| Value | Meaning | Usage in HLS |
|---|---|---|
| uphill changes posture and clearance | source-backed relationship | slope modifier |
| downhill requires caution | source-backed relationship | downhill caution and speed reduction |
| stairs require discrete foot targets | source-backed relationship | stair tread target selection |
| `SlopeActivationAngle = 3..5 deg` | HLS tuning range | ignore terrain noise |
| `ExtremeSlopeAngle = 25..35 deg` | HLS tuning range | transition to extreme handling |
| `UphillTorsoLean = 0..12 deg` | HLS tuning range | visual uphill lean |
| `DownhillTorsoLean = 0..-6 deg` | HLS tuning range | cautious downhill compensation |
| `SlopeFootLiftBonus = 0.002..0.006 m/deg` | HLS tuning range | uphill clearance |
| `StepHeight = 0.10..0.25 m` | HLS expected input range | stair detector sanity check |
| `StepDepth = 0.22..0.35 m` | HLS expected input range | tread selection sanity check |
| `PelvisStepHeightSmoothing = 0.10..0.25 s` | HLS tuning value | smooth vertical stair motion |
| `TreadConfidence = 0.60..0.80` | HLS tuning threshold | enter stair mode |

HLS tuning values such as uphill foot lift multiplier and stair pelvis smoothing are gameplay defaults.

## HLS Transformation

```text
terrain-specific locomotion observation
  -> slope modifier
  -> stairs modifier
  -> foot target selection rule
  -> pelvis height smoothing rule
  -> terrain confidence / override logic
```

## Uncertainty

- Exact thresholds for switching from slope mode to stairs mode.
- Whether downhill should prefer heel-first or flat-foot placement.
- How much foot clearance is required for different stair heights.
- Primary-source extraction still needed for stair-height-specific clearance and speed changes.

## Used By

- [Slope Modifier](../../08-modifiers/slope.md)
- [Stairs Modifier](../../08-modifiers/stairs.md)
- [Foot Target Solver](../../09-solvers/foot-target-solver.md)
- [Pelvis Solver](../../09-solvers/pelvis-solver.md)
