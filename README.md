# HLS Hub

A Git-backed Markdown documentation platform for the **Human Locomotion
Specification (HLS)** — a spec describing procedural human animation.

Markdown files are the **source of truth**: they live in Git, read cleanly on
GitHub, render as a website, and are editable through a tokenized API with a
branch → diff → review → merge workflow.

```
Markdown in Git → API → Website → Admin editor → AI edits via token → branch/diff/review/merge
```

## Stack

- **Backend:** Node.js + TypeScript (Express), serves the built frontend.
- **Frontend:** React + TypeScript (Vite), `react-markdown`.
- **Storage:** a **bare Git repository** is the source of truth. Reads use
  `git show <branch>:<path>`; writes use per-branch worktrees. `main` is only
  written by the merge endpoint.
- **DB:** SQLite (`better-sqlite3`) for tokens (not for Markdown).
- **Deploy:** a single Docker container on port `8080`.

## Monorepo layout

```
hls-hub/
├── docs/              # Markdown source of truth (seeded into Git on first boot)
├── apps/
│   ├── api/           # Express + TS backend
│   └── web/           # React + TS frontend
├── packages/
│   └── hls-core/      # shared types + frontmatter parse/validate
├── Dockerfile
├── docker-compose.yml
└── README.md
```

## Run with Docker (recommended)

```bash
docker compose up --build
```

Then open:

- http://localhost:8080/docs — documentation site
- http://localhost:8080/admin — admin UI
- http://localhost:8080/api/health — health check

### Admin login

Open `/admin` and sign in with **username + password** (configured via env):

```bash
HLS_ADMIN_USERNAME=admin HLS_ADMIN_PASSWORD=change-me docker compose up --build
```

If `HLS_ADMIN_PASSWORD` is not set, a random password is generated on first
boot, printed to the container logs, and saved to `/data/admin-password.txt`.
Login creates a server-side session (default 7 days, `HLS_SESSION_TTL_HOURS`).

For **programmatic / AI access** there are still Bearer API tokens (managed in
**Admin → Tokens**). A bootstrap admin token is generated on first boot (logs /
`/data/admin-token.txt`), or pin it with `HLS_ADMIN_TOKEN`.

Git data and SQLite live in the `/data` volume, so they survive restarts.

## Local development

```bash
npm install
npm run dev        # api on :8080, web (Vite) on :5173 with /api proxy
```

Or build and run like production:

```bash
npm run build
npm start          # serves built web + api on :8080
```

## GitHub-backed mode (PR workflow)

By default the local Git repo in `/data` is the source of truth and merges happen
in-app. If you set **both** `GITHUB_TOKEN` and `GITHUB_REPO`, GitHub becomes the
source of truth and the flow becomes a real PR workflow:

```bash
GITHUB_REPO=o-codify/HumanLocomotionSpecification \
GITHUB_TOKEN=github_pat_xxx \
docker compose up --build
```

- On first boot the repo is **cloned** from GitHub into the `/data` volume.
  The Docker image does **not** bundle a docs seed — GitHub is the source of
  truth, so the repo must already contain `docs/` (push the source `docs/` once
  for a brand-new repo). Local dev (`npm start`) still seeds from `./docs`.
- In the editor, **Save = commit + push** to the branch in one action — no
  separate "commit" step. A **Pull Request** is opened/updated automatically.
- **Merge** (admin Diff page, reviewer/admin only) goes through the **GitHub PR
  merge API**; you can equally review and merge the PR **directly on GitHub**.
- External changes on GitHub (e.g. a PR merged in the GitHub UI) are pulled back
  via a throttled `git fetch`, so the site reflects them.

The PAT (fine-grained recommended) needs **Contents: write** and **Pull
requests: write** on the repo. The token is passed per-git-command via an auth
header, so it is **not** persisted into the repo's stored config. Set
`HLS_DEFAULT_BRANCH` only if your repo's default branch isn't auto-detected
correctly (it normally is, from the repo HEAD).

Without these vars the app runs in self-contained local mode (no network needed).

## Markdown format

Every document requires frontmatter:

```md
---
id: gait-cycle
title: Gait Cycle
status: draft        # draft | review | stable | deprecated | experimental
version: 0.1.0
tags: [gait, walking, locomotion]
---

# Gait Cycle
```

Required fields: `id`, `title`, `status`, `version`, `tags`. The API validates
these on write (HTTP 422 on failure).

## Authentication & roles

Send a Bearer token:

```http
Authorization: Bearer <token>
```

| Role       | Capabilities                                            |
| ---------- | ------------------------------------------------------- |
| `viewer`   | read (reads are public/anonymous too)                   |
| `editor`   | create branches, edit docs on allowed branches          |
| `reviewer` | view diffs, merge                                       |
| `admin`    | everything: merge, tokens, users                        |
| `ai-agent` | write **only** to `ai/*` branches                       |

Constraints enforced by the API:

- **No direct writes to `main`** — all edits go to a branch, then merge.
- **`ai-agent` tokens can only write to `ai/*` branches.**
- **Merge** requires `reviewer` or `admin`.

## API

| Method & path              | Auth                | Purpose                              |
| -------------------------- | ------------------- | ------------------------------------ |
| `GET /api/health`          | public              | health check                         |
| `GET /api/branches`        | public              | list branches                        |
| `POST /api/branches`       | editor/admin/ai     | create a branch `{name, from}`       |
| `GET /api/tree?branch=`    | public              | list docs (path/title/status)        |
| `GET /api/docs?path=&branch=` | public           | read a doc (frontmatter + content)   |
| `POST /api/docs`           | write               | create a doc (staged)                |
| `PUT /api/docs`            | write               | create/update a doc (staged)         |
| `DELETE /api/docs`         | write               | delete a doc (staged)                |
| `POST /api/commits`        | write               | commit staged changes `{branch,message,author}` |
| `GET /api/diff?base=&head=`| public              | per-file diff                        |
| `POST /api/merge`          | reviewer/admin      | merge `{base, head, message}`        |
| `GET /api/search?q=&branch=` | public            | full-text search                     |
| `GET /api/tokens`          | admin               | list tokens                          |
| `POST /api/tokens`         | admin               | create token                         |
| `DELETE /api/tokens/:id`   | admin               | revoke token                         |

"write" = `editor`/`admin`/`ai-agent`, subject to branch rules above.

### Example: AI edit flow

```bash
ADMIN=hls_...                       # bootstrap admin token from the logs
B=http://localhost:8080

# 1. create an ai-agent token (admin)
AI=$(curl -s -X POST $B/api/tokens -H "Authorization: Bearer $ADMIN" \
  -H 'Content-Type: application/json' \
  -d '{"name":"ci-bot","role":"ai-agent","allowed_branch_prefixes":["ai/"]}' | jq -r .token)

# 2. create a branch
curl -X POST $B/api/branches -H "Authorization: Bearer $AI" \
  -H 'Content-Type: application/json' -d '{"name":"ai/gait-update","from":"main"}'

# 3. edit a doc (staged in the branch worktree)
curl -X PUT $B/api/docs -H "Authorization: Bearer $AI" \
  -H 'Content-Type: application/json' \
  -d '{"branch":"ai/gait-update","path":"docs/04-gait-cycle/index.md",
       "frontmatter":{"id":"gait-cycle","title":"Gait Cycle","status":"review","version":"0.1.1","tags":["gait"]},
       "content":"# Gait Cycle\n\nUpdated."}'

# 4. commit
curl -X POST $B/api/commits -H "Authorization: Bearer $AI" \
  -H 'Content-Type: application/json' \
  -d '{"branch":"ai/gait-update","message":"Update gait cycle","author":"ai-agent"}'

# 5. diff
curl "$B/api/diff?base=main&head=ai/gait-update"

# 6. merge (admin/reviewer only)
curl -X POST $B/api/merge -H "Authorization: Bearer $ADMIN" \
  -H 'Content-Type: application/json' \
  -d '{"base":"main","head":"ai/gait-update","message":"Merge gait update"}'
```

## Environment variables

| Variable           | Default                | Description                          |
| ------------------ | ---------------------- | ------------------------------------ |
| `PORT`             | `8080`                 | HTTP port                            |
| `HLS_DATA_DIR`     | `./data` (`/data`)     | Git repo, worktrees, SQLite          |
| `HLS_ADMIN_USERNAME` | `admin`              | admin UI login username              |
| `HLS_ADMIN_PASSWORD` | _(generated)_        | admin UI login password              |
| `HLS_SESSION_TTL_HOURS` | `168`             | login session lifetime (hours)       |
| `HLS_ADMIN_TOKEN`  | _(generated)_          | pin the programmatic API admin token |
| `GITHUB_TOKEN`     | _(unset)_              | PAT — enables GitHub PR mode (with repo) |
| `GITHUB_REPO`      | _(unset)_              | `owner/name` — enables GitHub PR mode |
| `HLS_SYNC_INTERVAL_MS` | `10000`            | min gap between background `git fetch` syncs |
| `HLS_DOCS_SEED`    | `./docs`               | seed content for first boot          |
| `HLS_WEB_DIST`     | `./apps/web/dist`      | built frontend to serve              |
| `HLS_DEFAULT_BRANCH` | `main`               | default/protected branch             |
