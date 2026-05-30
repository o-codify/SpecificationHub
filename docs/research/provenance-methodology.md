---
id: research-provenance-methodology
title: Research Provenance Methodology
status: draft
version: 26.530.1017
tags:
  - research
  - provenance
  - sources
  - links
  - markdown-standard
---

# Research Provenance Methodology

## Purpose

Defines how HLS records where rules came from, what was used, what was inferred, and how confident the specification is.

HLS must preserve research provenance so future developers can inspect the original source whenever possible.

## Core Requirement

Every non-trivial HLS rule should be traceable to at least one of these categories:

- biomechanics source
- clinical gait source
- game animation source
- procedural animation technique
- motion dataset observation
- implementation constraint
- gameplay readability decision
- HLS inference

## Link Requirement

Whenever possible, provenance must include a real external link.

Preferred identifiers:

1. DOI link
2. publisher page
3. PubMed / NCBI page
4. official dataset page
5. official engine documentation
6. official talk or slide page
7. stable GitHub repository
8. archived page if original is unavailable

## Internal HLS Link Requirement

When referencing another HLS document, use clickable relative Markdown links.

Do not use raw repository-root paths, backticked paths, or bare document names when a link is possible.

### Relative path rules

- Same-directory links must use explicit `./file.md`.
- Child-directory links must use explicit `./folder/file.md`.
- Parent or sibling directory links must use `../folder/file.md` or `../../folder/file.md` as needed.
- Source cards live in `docs/research/source-cards/`, so links from a source card to main docs normally use `../../...`.
- Links from `docs/research/` to source cards normally use `./source-cards/file.md`.

Correct:

```md
- [Same Folder Runtime Doc](./input-state.md)
- [Source Card](./source-cards/normal-gait-overview.md)
- [Gait Cycle](../../04-gait-cycle/index.md)
- [Foot Target Solver](../../09-solvers/foot-target-solver.md)
- [Runtime Update Order](../update-order.md)
```

Incorrect:

```md
- [Same Folder Runtime Doc](input-state.md)
- [Source Card](source-cards/normal-gait-overview.md)
- `docs/04-gait-cycle/index.md`
- `docs/09-solvers/foot-target-solver.md`
- docs/10-runtime/update-order.md
```

Rule provenance tables should also use clickable internal links:

```md
| Source card | [Normal Gait Overview](../research/source-cards/normal-gait-overview.md) |
| Applies to | [Gait Phase Generator](../09-solvers/gait-phase-generator.md) |
```

Use paths relative to the file that contains the link. Prefer explicit `./` for same-directory and child-directory links because the HLS web renderer may resolve bare relative links incorrectly.

## Markdown Source Card Format

Every research source card should use this structure:

```md
# Source Card: Source Title

## Metadata

| Field | Value |
|---|---|
| Title | ... |
| Authors | ... |
| Year | ... |
| Type | paper / book / dataset / docs / talk / article |
| Reliability | high / medium / low |
| Relevance | high / medium / low |
| Access status | accessible / abstract-only / paywalled / unknown |

## Links

- DOI: ...
- Official page: ...
- Dataset page: ...
- Paper: ...

## What it says

Short summary.

## What HLS Used

- Rule-relevant point.
- Parameter-relevant point.
- Validation-relevant point.

## What HLS Did Not Use

- Medical treatment details.
- Exact simulation details.
- Non-runtime material.

## Extracted HLS Facts

- Fact usable by HLS.

## Candidate HLS Rules

```text
if condition:
    modify parameter
```

## Numeric Data

| Value | Meaning | Usage in HLS |
|---|---|---|
| ... | ... | ... |

## HLS Transformation

```text
source concept
  -> simplified rule
  -> runtime parameter
  -> solver behavior
```

## Uncertainty

What is unknown or needs validation.

## Used By

- [Readable Doc Title](../../target-doc.md)
```

## Rule Provenance Format

Important HLS documents should include `## Rule Provenance` blocks.

Recommended format:

```md
### Rule Name

| Field | Value |
|---|---|
| Rule | ... |
| Source card | [Source Card Title](../research/source-cards/source-card.md) |
| External link | https://... |
| Source type | clinical / paper / dataset / docs / inference |
| Used from source | ... |
| HLS transformation | ... |
| Confidence | high / medium / low |
| Applies to | [Target Doc](../target-doc.md) |
```

## Confidence Levels

| Confidence | Meaning |
|---|---|
| High | Supported by reliable sources or directly observable. |
| Medium | Supported but simplified for games or dependent on context. |
| Low | Mostly HLS inference or gameplay readability decision. |

## Numeric Data Rule

Do not present tuned gameplay numbers as scientific facts.

Separate them:

| Category | Meaning |
|---|---|
| Source numeric data | Observed or cited data from source. |
| HLS default value | Runtime default derived from source and tuned for games. |
| Tuning range | Editable game parameter range. |
| Open question | Needs more research or playtesting. |

## Dataset Usage Rule

Datasets can be used for analysis and validation. They are not required runtime dependencies unless explicitly stated.

Dataset cards must include:

- official link
- paper link if available
- license or usage uncertainty
- what motions it contains
- whether it can be used for analysis, validation, training, or only reference

## Review Checklist

For each HLS document, reviewers should ask:

- Which source cards support this document?
- Do those source cards contain real links?
- Which rules are source-backed?
- Which rules are HLS inference?
- Which numbers are scientific and which are tuned defaults?
- What remains uncertain?
