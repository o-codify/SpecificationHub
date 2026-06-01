# Specification Hub

**A website for writing and reviewing documentation that is stored as plain
Markdown files in Git — built so that AI assistants can be safe co-authors.**

Think of it as a lightweight wiki where:

- every page is an ordinary Markdown file (reads cleanly on GitHub, fully
  portable, no lock-in);
- people edit pages in the browser with a live what-you-see-is-what-you-get
  editor;
- AI assistants (ChatGPT, Claude, …) can read the docs and **propose** edits
  through a standard connector (MCP);
- **nothing is changed directly** — every edit lands on a branch, is shown as a
  visual diff, and a human approves it before it goes live;
- one running app can host several independent doc sites, each with its own
  content repository and name.

It suits living specifications, design docs, knowledge bases, and game/system
design wikis — anywhere you want clean source text in Git, a pleasant
reading/editing site on top, and AI that helps without ever silently
overwriting your work.

### How it works, in one line

```
Markdown in Git → served as a website → edited by people & AI on branches
→ visual diff → a human reviews & accepts → merged into the main docs
```

### Key ideas

- **Markdown is the source of truth.** Pages live in a Git repo; this app is a
  friendly front-end and review workflow on top of them.
- **Safe by default.** The main branch is never written directly — every change
  is a proposal you can read, then accept or discard.
- **AI-native.** A built-in MCP server lets AI clients search, read, and propose
  edits, and ships an authoring guide so they follow your conventions.
- **Multi-tenant.** Brand name and content repo are configurable per
  deployment, so one image can power many sites.

## Stack

- **Backend:** Node.js + TypeScript (Express), serves the built frontend.
- **Frontend:** React + TypeScript (Vite), `react-markdown`.
- **Storage:** a **bare Git repository** is the source of truth. Reads use
  `git show <branch>:<path>`; writes use per-branch worktrees. `main` is only
  written by the merge endpoint.
- **DB:** Postgres (via Drizzle ORM + SQL migrations) for sessions and OAuth
  clients/tokens (not for Markdown). Set `DATABASE_URL`.
- **Deploy:** a single Docker container on port `8080`.

## Monorepo layout

```
specification-hub/
├── docs/              # local docs clone for dev (git-ignored; real docs are a separate repo)
├── apps/
│   ├── api/           # Express + TS backend
│   └── web/           # React + TS frontend
├── packages/
│   └── core/          # shared types + frontmatter parse/validate (@spec/core)
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

**AI / MCP clients** (ChatGPT, Claude Desktop) authenticate via the built-in
**OAuth** flow (see below) — they sign in with the same admin credentials and
get an admin-scoped access token. There are no manually-managed API tokens.

Sessions and OAuth clients/tokens live in **Postgres** (`DATABASE_URL`), so they
survive redeploys. The `/data` volume holds the Git working data; in
GitHub mode it is re-cloned from the remote on boot, so a wiped volume self-heals.
Schema is created/updated by Drizzle migrations run automatically at startup.

## Local development

A Postgres instance is required (`DATABASE_URL`). For example:

```bash
docker run -d --name spec-pg -e POSTGRES_PASSWORD=spec -e POSTGRES_USER=spec -e POSTGRES_DB=spec -p 5432:5432 postgres:16-alpine
export DATABASE_URL=postgres://spec:spec@localhost:5432/spec
```

Migrations run automatically on startup. To (re)generate a migration after
editing `apps/api/src/schema.ts`: `npm -w @spec/api run db:generate`.

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
  set `COOLIFY_WEBHOOK`, `COOLIFY_WEBHOOK_2`, and `COOLIFY_WEBHOOK_3` (all
  optional) as repo secrets.

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
- **Tools:** `authoring_guide` (how to write docs here — workflow, fields, what
  Markdown/Mermaid renders), `search_docs` (word-tokenised; optional `status`
  filter), `list_docs` (optional `status` filter, e.g. list all `request` docs),
  `read_doc` (paginated — `offset`/`limit` lines, returns `hasMore`/`nextOffset`),
  `list_branches`, `list_suggestions` (read) and `create_branch`, `save_doc`
  (whole doc), `append_section`, `replace_section`, `patch_doc`, `edit_doc`
  (several appends/replaces/patches in one commit), `set_metadata` (status/
  title/tags only — body untouched)
  (write — confined to `ai/*` branches, never the default branch). The same
  authoring guide is also sent as the MCP server `instructions` on connect.
  `save_doc`
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
> `PUBLIC_URL` to force the exact base (e.g. `https://docs.example.com`).

Set `MCP_ENABLED=false` to disable both the MCP endpoint and the OAuth server.

## Markdown format

Every document starts with a small block of metadata ("frontmatter"):

```md
---
id: gait-cycle
title: Gait Cycle
status: draft        # request | draft | review | stable | deprecated | experimental
version: 26.601.2124 # set automatically by the server — do not edit
tags: [gait, walking, locomotion]
---

# Gait Cycle
```

Required fields: `id`, `title`, `status`, `version`, `tags`. The API validates
these on write (HTTP 422 on failure). The body supports standard Markdown
(GitHub-flavoured: headings, lists, tables, code blocks, links) **plus Mermaid
diagrams** — a ` ```mermaid ` fenced block renders as a real diagram.

> When writing through the UI or MCP, the frontmatter is filled in for you and
> `version` is stamped by the server — you don't hand-write the `---` block.

### Document statuses

Status is a small workflow signal so people and AI can tell a page's state at a
glance (and filter by it):

| Status         | Meaning                                                                 |
| -------------- | ----------------------------------------------------------------------- |
| `request`      | An **ask for content**: the page describes what should be written, for another author or AI session to fulfil. Great for queueing work. |
| `draft`        | Being written, not yet ready for review.                                |
| `review`       | Written and ready; **awaiting a human's approval**. When the change is accepted, the server promotes it to `stable`. |
| `stable`       | Approved / merged.                                                      |
| `deprecated`   | Kept for history but no longer current.                                 |
| `experimental` | Provisional / subject to change.                                        |

The `request` status enables a simple hand-off: one AI session can file
`request` docs describing what's needed, and another can list them
(`list_docs status=request`, or `search_docs` with a `status` filter) and fill
them in. Accepting a `review` doc automatically marks it `stable`.

## Authentication

Reads are **public**. Writes require an authenticated principal:

- **Website** — admin **login/password** (`ADMIN_USERNAME`/`ADMIN_PASSWORD`),
  which creates a server-side session.
- **AI / MCP clients** — the built-in **OAuth** flow (sign in with the same
  admin credentials).

Both grant an **admin** principal; the request carries `Authorization: Bearer
<session-or-oauth-token>`. Constraints enforced by the API:

- **No direct writes to `main`** — all edits go to a branch, then merge/accept.
- **Merge / accept** requires admin (reviewer).

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

"write" = an authenticated (admin) principal; direct writes to `main` are never
allowed (edit on a branch, then merge/accept).

### Example: AI / scripted edit flow

AI assistants edit through the **MCP tools** (`create_branch`, `save_doc`,
`append_section`, …) over the OAuth-authenticated `/mcp` connection. For a plain
script, authenticate once with the admin login to get a session token, then use
the REST API with `Authorization: Bearer <session-token>`:

```bash
B=http://localhost:8080
T=$(curl -s -X POST $B/api/auth/login -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"<admin-password>"}' | jq -r .token)

# create a branch, edit a doc, commit
curl -X POST $B/api/branches -H "Authorization: Bearer $T" \
  -H 'Content-Type: application/json' -d '{"name":"ai/gait-update","from":"main"}'
curl -X PUT $B/api/docs -H "Authorization: Bearer $T" -H 'Content-Type: application/json' \
  -d '{"branch":"ai/gait-update","path":"docs/04-gait-cycle/index.md",
       "frontmatter":{"id":"gait-cycle","title":"Gait Cycle","status":"review","tags":["gait"]},
       "content":"# Gait Cycle\n\nUpdated."}'
curl -X POST $B/api/commits -H "Authorization: Bearer $T" \
  -H 'Content-Type: application/json' -d '{"branch":"ai/gait-update","message":"Update gait cycle"}'

# review & accept in the Review page (or via the API)
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
| `BRAND_NAME`   | `Specification Hub`    | site brand/title shown in the UI (per deployment) |
| `GITHUB_TOKEN`     | _(unset)_              | PAT — enables GitHub PR mode (with repo) |
| `GITHUB_REPO`      | _(unset)_              | docs repo `owner/name` — enables GitHub PR mode |
| `MCP_ENABLED`  | `true`                 | set `false` to disable the `/mcp` endpoint + OAuth server |
| `PUBLIC_URL`   | _(from request)_       | force OAuth metadata base URL, e.g. `https://docs.example.com` |
| `OAUTH_TOKEN_TTL_SEC` | `3600`          | MCP OAuth access-token lifetime (seconds) |
| `SYNC_INTERVAL_MS` | `10000`            | min gap between background `git fetch` syncs |
| `DOCS_SEED`    | `./docs`               | seed content for first boot          |
| `WEB_DIST`     | `./apps/web/dist`      | built frontend to serve              |
| `DEFAULT_BRANCH` | `main`               | default/protected branch             |
