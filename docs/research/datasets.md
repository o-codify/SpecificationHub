---
id: motion-datasets
title: Motion Datasets
status: draft
version: 26.529.2340
tags:
  - research
  - datasets
  - linked-sources
  - links
---

# Motion Datasets

## Purpose

Tracks motion datasets useful for HLS analysis, validation, and later implementation tests.

Datasets are research and validation references. They are not mandatory runtime dependencies.

## Dataset Policy

| Rule | Meaning |
|---|---|
| Reference, not runtime dependency | HLS should work without shipping any dataset. |
| Link official pages | Each dataset must point to official pages or papers. |
| Verify license | Training, redistribution, and commercial use require license review. |
| Separate validation from generation | Dataset comparison can validate generated motion, but HLS runtime remains procedural. |

## Dataset Index

| Dataset | Links | HLS use | Source card |
|---|---|---|---|
| CMU Motion Capture Database | http://mocap.cs.cmu.edu/ | walking/running validation | [CMU Mocap](./source-cards/cmu-mocap.md) |
| AMASS | https://amass.is.tue.mpg.de/ | broad motion validation | [AMASS](./source-cards/amass.md) |
| Human3.6M | http://vision.imar.ro/human3.6m/description.php | pose / joint validation | [Human3.6M](./source-cards/human36m.md) |
| KIT Whole-Body Human Motion Database | https://motion-database.humanoids.kit.edu/ | whole-body / carrying reference | [KIT Whole-Body](./source-cards/kit-whole-body.md) |
| LaFAN1 | https://github.com/ubisoft/ubisoft-laforge-animation-dataset | transition validation | [LaFAN1](./source-cards/lafan1.md) |

## CMU Motion Capture Database

### Links

- Official page: http://mocap.cs.cmu.edu/
- Usage notes: http://mocap.cs.cmu.edu/usage.php
- Source card: [CMU Mocap](./source-cards/cmu-mocap.md)

### HLS Use

- gait timing reference
- cadence comparison
- animation validation
- walking and running clips

### Notes

Use as offline reference and validation material. Check usage terms before redistribution or training.

## AMASS

### Links

- Official page: https://amass.is.tue.mpg.de/
- Paper: https://arxiv.org/abs/1904.03278
- Source card: [AMASS](./source-cards/amass.md)

### HLS Use

- broad locomotion diversity
- posture validation
- whole-body motion analysis
- validation across many motion sources

### Notes

AMASS includes many underlying datasets. License terms can vary by subset.

## Human3.6M

### Links

- Official page: http://vision.imar.ro/human3.6m/description.php
- EULA: http://vision.imar.ro/human3.6m/eula.php
- Source card: [Human3.6M](./source-cards/human36m.md)

### HLS Use

- joint pose reference
- pose validation
- skeleton/joint motion comparison

### Notes

Useful for pose and joint validation, less directly for game locomotion feel.

## KIT Whole-Body Human Motion Database

### Links

- Official database page: https://motion-database.humanoids.kit.edu/
- KIT H2T page: https://h2t.iar.kit.edu/english/545.php
- Source card: [KIT Whole-Body](./source-cards/kit-whole-body.md)

### HLS Use

- whole-body reference
- carrying and object interaction reference
- posture and coordination validation

### Notes

Useful for load/carrying and whole-body coordination research.

## LaFAN1

### Links

- Project article: https://www.ubisoft.com/en-us/studio/laforge/news/6xXL85Q3bF2vEj76xmnmIu/lafan1-a-largescale-motion-dataset-for-animation
- GitHub: https://github.com/ubisoft/ubisoft-laforge-animation-dataset
- Paper: https://arxiv.org/abs/2107.07402
- Source card: [LaFAN1](./source-cards/lafan1.md)

### HLS Use

- transition validation
- pose continuity validation
- foot sliding checks

### Notes

Useful for testing transition quality, not just steady-state gait.

## Open Questions

- Which dataset clips should become official HLS validation clips.
- Whether HLS needs a small curated validation set.
- Whether automated comparison should use joint statistics, contact timing, or visual scoring.
