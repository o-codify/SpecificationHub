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
- **DB:** Postgres (via Drizzle ORM + SQL migrations) for tokens, sessions, and
  OAuth clients/tokens (not for Markdown). Set `DATABASE_URL`.
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
ADMIN_USERNAME=admin ADMIN_PASSWORD=change-me docker compose up --build
```

If `ADMIN_PASSWORD` is not set, a random password is generated on first
boot, printed to the container logs, and saved to `/data/admin-password.txt`.
Login creates a server-side session (default 7 days, `SESSION_TTL_HOURS`).

For **programmatic / AI access** there are still Bearer API tokens (managed in
**Admin → Tokens**). A bootstrap admin token is generated on first boot (logs /
`/data/admin-token.txt`), or pin it with `ADMIN_TOKEN`.

Tokens, sessions, and OAuth clients/tokens live in **Postgres** (`DATABASE_URL`),
so they survive redeploys. The `/data` volume holds the Git working data; in
GitHub mode it is re-cloned from the remote on boot, so a wiped volume self-heals.
Schema is created/updated by Drizzle migrations run automatically at startup.

## Local development

A Postgres instance is required (`DATABASE_URL`). For example:

```bash
docker run -d --name hls-pg -e POSTGRES_PASSWORD=hls -e POSTGRES_USER=hls -e POSTGRES_DB=hls -p 5432:5432 postgres:16-alpine
export DATABASE_URL=postgres://hls:hls@localhost:5432/hls
```

Migrations run automatically on startup. To (re)generate a migration after
editing `apps/api/src/schema.ts`: `npm -w @hls/api run db:generate`.

```bash
npm install
npm run dev        # api on :8080, web (Vite) on :5173 with /api proxy
```

Or build and run like production:

```bash
npm run build
npm start          # serves built web + api on :8080
```

## Docs live in a separate repository

This repo holds **only the app** (backend + frontend). The Markdown docs live in
their **own repository** (e.g. `o-codify/HumanLocomotionSpecificationDocs`, with
the files under `docs/`). The app reads/edits them via GitHub-backed mode below;
`docs/` is git-ignored here (keep a local clone in `./docs` for local dev — it is
the default `DOCS_SEED`).

### Multiple deployments (two+ prods)

The same image runs as several independent prods, each pointed at its own docs
repo and given its own brand:

- per deployment set **`GITHUB_REPO`** (its docs repo) and **`BRAND_NAME`**
  (its title — read at runtime, so one image serves all);
- the GitHub Action triggers every configured Coolify webhook on an app push —
  set `COOLIFY_WEBHOOK` and `COOLIFY_WEBHOOK_2` (both optional) as repo secrets.

## GitHub-backed mode (PR workflow)

By default the local Git repo in `/data` is the source of truth and merges happen
in-app. If you set **both** `GITHUB_TOKEN` and `GITHUB_REPO`, GitHub becomes the
source of truth and the flow becomes a real PR workflow:

```bash
GITHUB_REPO=o-codify/HumanLocomotionSpecificationDocs \
GITHUB_TOKEN=github_pat_xxx \
docker compose up --build
```

- On first boot the repo is **cloned** from GitHub into the `/data` volume.
  The Docker image does **not** bundle a docs seed — GitHub is the source of
  truth, so the docs repo must already contain `docs/`. Local dev (`npm start`)
  still seeds from `./docs`.
- In the editor, **Save = commit + push** to the branch in one action — no
  separate "commit" step. A **Pull Request** is opened/updated automatically.
- **Merge** (admin Diff page, reviewer/admin only) goes through the **GitHub PR
  merge API**; you can equally review and merge the PR **directly on GitHub**.
- External changes on GitHub (e.g. a PR merged in the GitHub UI) are pulled back
  via a throttled `git fetch`, so the site reflects them.

The PAT (fine-grained recommended) needs **Contents: write** and **Pull
requests: write** on the repo. The token is passed per-git-command via an auth
header, so it is **not** persisted into the repo's stored config. Set
`DEFAULT_BRANCH` only if your repo's default branch isn't auto-detected
correctly (it normally is, from the repo HEAD).

Without these vars the app runs in self-contained local mode (no network needed).

## Connect to ChatGPT (MCP)

The backend also exposes an **MCP server** (Model Context Protocol, Streamable
HTTP) at `/mcp`, so it can be added as a connector in ChatGPT (Apps SDK) or any
MCP client.

- **Endpoint:** `POST https://<host>/mcp` (same server/port as the app).
- **Tools:** `search_docs` (word-tokenised, matches docs containing all terms),
  `list_docs`, `read_doc` (paginated — `offset`/`limit` lines, returns
  `hasMore`/`nextOffset`), `list_branches`, `list_suggestions` (read) and
  `create_branch`, `save_doc`, `append_section`, `replace_section`, `patch_doc`
  (write — confined to `ai/*` branches, never the default branch). `save_doc`
  creates the branch if needed, commits, and opens/updates a PR in GitHub mode.
  The incremental edit tools (`append_section`/`replace_section`/`patch_doc`)
  build/modify large documents with small payloads, avoiding client-side size
  limits. The document `version` is auto-stamped by the server (time-based,
  minute granularity) and is never an AI/client input.

### OAuth (ChatGPT connector)

The server is its own **OAuth 2.1 authorization server** (the MCP authorization
spec), so ChatGPT can connect with Dynamic Client Registration + PKCE — no token
pasting. Discovery & endpoints:

- `GET /.well-known/oauth-protected-resource` (RFC 9728)
- `GET /.well-known/oauth-authorization-server` (RFC 8414)
- `POST /oauth/register` — Dynamic Client Registration (RFC 7591), public client
- `GET|POST /oauth/authorize` — login page (admin username/password) → auth code
- `POST /oauth/token` — `authorization_code` (PKCE `S256`) and `refresh_token`

An unauthenticated `/mcp` request returns `401` with a `WWW-Authenticate:
Bearer resource_metadata=...` header so the client starts the flow automatically.
The access token maps to an **admin** principal (writes allowed on `ai/*`).

**In ChatGPT:** developer mode → add a connector with URL `https://<host>/mcp`.
ChatGPT discovers OAuth and auto-registers (DCR); on connect it redirects to the
server's `/oauth/authorize` login — sign in with the admin username/password.
For a manually-created OAuth client, `token_endpoint_auth_method` is `none`
(public client, PKCE only).

> The server must be reachable at a public **HTTPS** URL. Behind a reverse proxy
> the metadata URLs are derived from `X-Forwarded-Proto`/`X-Forwarded-Host`; set
> `PUBLIC_URL` to force the exact base (e.g. `https://hls.example.com`).

Programmatic (non-ChatGPT) clients may instead send an app token directly as
`Authorization: Bearer <token>` (create one in **Admin → Tokens**). Set
`MCP_ENABLED=false` to disable both the MCP endpoint and OAuth server.

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
| `DATABASE_URL`     | _(required)_           | Postgres connection string (tokens/sessions/OAuth) |
| `DATA_DIR`     | `./data` (`/data`)     | Git repo + worktrees                 |
| `ADMIN_USERNAME` | `admin`              | admin UI login username              |
| `ADMIN_PASSWORD` | _(generated)_        | admin UI login password              |
| `SESSION_TTL_HOURS` | `168`             | login session lifetime (hours)       |
| `ADMIN_TOKEN`  | _(generated)_          | pin the programmatic API admin token |
| `BRAND_NAME`   | `HLS Hub`              | site brand/title shown in the UI (per deployment) |
| `GITHUB_TOKEN`     | _(unset)_              | PAT — enables GitHub PR mode (with repo) |
| `GITHUB_REPO`      | _(unset)_              | docs repo `owner/name` — enables GitHub PR mode |
| `MCP_ENABLED`  | `true`                 | set `false` to disable the `/mcp` endpoint + OAuth server |
| `PUBLIC_URL`   | _(from request)_       | force OAuth metadata base URL, e.g. `https://hls.example.com` |
| `OAUTH_TOKEN_TTL_SEC` | `3600`          | MCP OAuth access-token lifetime (seconds) |
| `SYNC_INTERVAL_MS` | `10000`            | min gap between background `git fetch` syncs |
| `DOCS_SEED`    | `./docs`               | seed content for first boot          |
| `WEB_DIST`     | `./apps/web/dist`      | built frontend to serve              |
| `DEFAULT_BRANCH` | `main`               | default/protected branch             |
