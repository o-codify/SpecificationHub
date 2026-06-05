import { randomUUID } from "node:crypto";
import type { Express, Request, Response } from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import {
  DOC_STATUSES,
  parseFrontmatter,
  serializeDoc,
  stampVersion,
  validateFrontmatter,
  type DocStatus,
} from "@spec/core";
import * as gitmod from "./git.js";
import { canWriteBranch } from "./auth.js";
import { resolveSession, resolveOAuthToken, type Principal } from "./db.js";
import { config } from "./config.js";
import { resolveSite, hostFromRequest, type SiteContext } from "./site.js";
import { baseUrl } from "./oauth.js";

// Auth is via `Authorization: Bearer <token>`: an OAuth access token (ChatGPT /
// Claude connector) or a login session.
async function resolvePrincipal(req: Request): Promise<Principal | null> {
  const h = req.headers.authorization;
  if (h && h.startsWith("Bearer ")) {
    const t = h.slice("Bearer ".length).trim();
    return (await resolveOAuthToken(t)) ?? (await resolveSession(t));
  }
  return null;
}

/** Emit the RFC 9728 challenge so OAuth-capable clients start the auth flow. */
function unauthorized(req: Request, res: Response): void {
  res.setHeader(
    "WWW-Authenticate",
    `Bearer resource_metadata="${baseUrl(req)}/.well-known/oauth-protected-resource"`,
  );
  res.status(401).json({
    jsonrpc: "2.0",
    error: { code: -32001, message: "Authentication required" },
    id: null,
  });
}

const ok = (text: string, structuredContent?: Record<string, unknown>) => ({
  content: [{ type: "text" as const, text }],
  ...(structuredContent ? { structuredContent } : {}),
});
const fail = (text: string) => ({ content: [{ type: "text" as const, text }], isError: true });

// ---- Output schemas (advertised in tools/list; validate `structuredContent`).
// Declaring these stops MCP clients (e.g. ChatGPT) warning about missing output
// schemas. Error results (isError) skip validation, so `fail()` needs none.
const DOC_WRITE_OUT = {
  branch: z.string(),
  path: z.string(),
  sha: z.string(),
  version: z.string(),
};

function slugify(t: string): string {
  return t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "untitled";
}

// ---- Pure body transforms (shared by the single-op tools and edit_doc) ----
type BodyEdit = { body: string; note?: string; error?: string };

function appendToBody(body: string, markdown: string): BodyEdit {
  return { body: `${body.replace(/\s*$/, "")}\n\n${markdown.trim()}\n` };
}

/** Replace the section under `heading` (up to the next same-or-higher heading). */
function replaceSectionInBody(body: string, heading: string, markdown: string): BodyEdit {
  const lines = body.split("\n");
  const target = heading.replace(/^#{1,6}\s*/, "").trim().toLowerCase();
  let startIdx = -1;
  let level = 0;
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^(#{1,6})\s+(.*)$/);
    if (m && m[2].trim().toLowerCase() === target) {
      startIdx = i;
      level = m[1].length;
      break;
    }
  }
  if (startIdx < 0) return { body, error: `Heading not found: ${heading}` };
  let endIdx = lines.length;
  for (let i = startIdx + 1; i < lines.length; i++) {
    const m = lines[i].match(/^(#{1,6})\s+/);
    if (m && m[1].length <= level) {
      endIdx = i;
      break;
    }
  }
  const next = [...lines.slice(0, startIdx), ...markdown.trim().split("\n"), "", ...lines.slice(endIdx)];
  return { body: next.join("\n").replace(/\n{3,}/g, "\n\n") };
}

/** Replace every exact occurrence of `find` with `replace`. */
function patchInBody(body: string, find: string, replace: string): BodyEdit {
  if (!find) return { body, error: "`find` must not be empty." };
  if (!body.includes(find)) return { body, error: `Text to replace was not found: ${find.slice(0, 60)}` };
  const count = body.split(find).length - 1;
  return { body: body.split(find).join(replace), note: `(${count} occurrence${count > 1 ? "s" : ""})` };
}

/**
 * A thorough how-to for AI clients: how this server works, what Markdown
 * renders, and the conventions to follow. Surfaced two ways — as the MCP
 * server `instructions` (sent to the model on connect) and via the
 * `authoring_guide` tool (so the model can re-read it on demand). This is
 * especially important for an empty spec, where the model has no examples to
 * copy from.
 */
function authoringGuide(site: SiteContext): string {
  const base = site.defaultBranch;
  const statuses = DOC_STATUSES.join(", ");
  return `# ${site.brandName} — authoring guide for AI

This server hosts a Git-backed Markdown specification. You may READ everything
freely, but every WRITE is a *proposal* on a branch — never commit to the
default branch (\`${base}\`). A human reviews and accepts your changes.

## Workflow
1. Look first: \`list_docs\`, \`read_doc\`, \`search_docs\` to learn what exists and
   match the existing style.
2. Use ONE branch for your whole session — not a branch per task or per file.
   At the start, pick a single \`ai/<topic>\` name and pass that SAME branch to
   every write for the rest of the session (it is auto-created from \`${base}\` on
   first use, or call \`create_branch\` once). Do NOT spin up a new branch for
   each change: multiple branches editing the same docs collide and make review
   a mess. One session → one branch → one review.
3. Write with the smallest tool that fits:
   - \`save_doc\` — create a new document, or replace a whole one.
   - \`append_section\` — add a \`## Section\` to the end (best for building a doc
     up in small steps — one section per call).
   - \`replace_section\` — swap a single section identified by its heading.
   - \`patch_doc\` — exact find/replace for small targeted fixes.
   - \`edit_doc\` — apply SEVERAL edits (appends + section replaces + patches) to
     one doc in a single commit; use it when a change both adds and replaces
     parts. If any op fails, nothing is committed.
   - \`set_metadata\` — change ONLY status/title/tags, body untouched. Use this
     to flip status (e.g. → \`review\`) or retag — do NOT resend the whole doc
     via \`save_doc\` just to change metadata.
   - \`delete_doc\` — remove an obsolete doc (a human accepts the removal in
     Review). Actually delete it — don't just mark it \`deprecated\` and ask for
     a manual \`git rm\`.
   Prefer several small edits over one huge \`save_doc\`: smaller diffs review
   better and avoid client size limits.
4. Keep your branch current: \`${base}\` moves on as changes are accepted. Write
   results warn you when it has advanced; call \`branch_status\` to see what
   differs (staleFiles = base changed, you didn't — safe to pull; conflictFiles
   = changed on both). Reconcile with \`sync_branch\` — strategy \`merge\` (keep
   your edits; conflicts are reported, not forced), \`prefer-main\`,
   \`prefer-mine\`, or \`reset\` (discard your changes, match base). YOU decide
   which; do it before building further on a stale branch.

## Document structure
- \`path\`: under \`docs/\`, kebab-case, ending in \`.md\`. A section with sub-pages
  uses a folder + \`index.md\` (e.g. \`docs/04-gait-cycle/index.md\`); a standalone
  page is e.g. \`docs/glossary.md\`. A leading number (\`04-…\`) orders it in the
  sidebar.
- Frontmatter (id, title, status, version, tags) is written FOR you by the
  tools. Do NOT put a \`---\` YAML block in \`content\`. Instead pass \`title\`,
  \`status\`, and \`tags\` as tool arguments.
  - \`status\` must be one of: ${statuses}. What they mean:
    - \`request\` — this doc is an *ask* for content: it describes what should be
      written, for another author/session to fulfil. Use it to queue work.
    - \`draft\` — being written, not yet ready for review.
    - \`review\` — written and ready; awaiting a human's approval. On accept the
      server promotes it to \`stable\`.
    - \`stable\` — approved / merged.
    - \`deprecated\`, \`experimental\` — as named.
  - \`version\` is stamped automatically by the server (time-based) — you cannot
    and should not set it.
- \`content\` is the Markdown BODY only. It must start with exactly ONE top-level
  heading — \`# Title\` matching the doc's title (rendered as the page title).
  Everything below uses \`##\`/\`###\`/… ; never add a second \`#\` heading in one doc.

## Finding work to do
- To pick up open requests, list/search by status: \`list_docs\` with
  \`status: "request"\`, or \`search_docs\` with a \`status\` filter (and optional
  query). Read the request doc, then create your content (a new doc, or replace
  the request doc) and set \`status: "review"\` so a human can approve it.

## Markdown that renders
- Headings \`#\`–\`######\`. Leave a blank line after a heading and between blocks.
  This also yields cleaner review diffs (changes then show inline per
  clause / list-item / table-row instead of as a whole replaced block).
- Emphasis: \`**bold**\`, \`*italic*\`, \`\` \`inline code\` \`\`.
- Fenced code blocks WITH a language, e.g. \`\`\`ts … \`\`\` or \`\`\`bash … \`\`\`.
- Lists: \`- item\` (bullet), \`1. item\` (ordered); indent to nest.
- GitHub tables — pipe rows with a \`---\` separator row:
  \`\`\`
  | Name   | Type  |
  | ------ | ----- |
  | Health | float |
  \`\`\`
- Blockquotes \`> …\`, horizontal rule \`---\`, images \`![alt](url)\`. Links: see
  "Linking between documents" below.
- Diagrams: a \`mermaid\` fenced block renders as a real diagram (flowchart,
  sequence, state, etc.). Prefer this over ASCII art. Example:
  \`\`\`
  \`\`\`mermaid
  graph TD
    A[Input] --> B{Valid?}
    B -->|yes| C[Apply]
    B -->|no| D[Reject]
  \`\`\`
  \`\`\`

## Linking between documents
- When you mention another doc, ALWAYS make it a real Markdown link — never its
  bare title or path as plain text. Use a readable label (the target's title)
  and a RELATIVE path to the target \`.md\` file:
    Good:  See [Gait Cycle](../04-gait-cycle/index.md) for the phases.
    Bad:   See Gait Cycle.                     (plain text, not a link)
    Bad:   See docs/04-gait-cycle/index.md.    (bare path shown to readers)
- Paths are relative to the CURRENT file's folder (\`./sibling.md\`,
  \`../other/index.md\`); include \`/index.md\` for a section folder. The app
  resolves these to the right page and keeps navigation working.
- Don't guess paths/titles — confirm them first with \`list_docs\` or \`search_docs\`.

## Write for a human reader
Every document is read by people — make it clear, skimmable, and correct. This
is how docs should always be written, not optional polish.
- Lead with the point. Open the doc, and each section, with what it is and why it
  matters, then the detail. Never bury the thesis or start mid-thought.
- One idea per section, one topic per paragraph. Short sentences. No walls of
  text — split a long paragraph or turn it into a list/table.
- Use the structure that fits the content:
  - sequences, steps, options, enumerations → lists;
  - field/value, parameters, comparisons → GitHub tables;
  - commands, code, config, paths, identifiers → fenced code / \`inline code\`;
  - a key warning or caveat → a one-line \`>\` callout (don't overuse).
- Be precise and consistent: same term for the same thing throughout; define an
  acronym/term on first use; avoid vague references ("it", "this", "the above")
  when the referent isn't obvious — name it.
- State things plainly and factually. No filler, no hedging, no apologies, no
  meta narration ("as an AI…", "here is the document"). Write the documentation,
  not commentary about it.
- Don't repeat another doc — link to it (see "Linking between documents") and
  state only what's specific here.
- Read 1–2 existing docs first and match their tone, depth, and conventions.
- Each doc stands on its own: a reader opening it cold should understand what it
  is, why it exists, and how to act on it.

## Writing a \`request\` document
A \`request\` asks for something to be created (usually a TOOL or capability) for
another author/AI to fulfil. Write it so they can act without guessing — state
the essence and the goal; be concrete and minimal. Include exactly:
- **What** — the specific capability/tool to create, named precisely.
- **Goal** — the outcome it must enable, in one or two sentences.
- **Behaviour** — what it does: inputs, outputs, the operations it exposes, key
  constraints and edge cases.
- **Acceptance** — observable criteria for "done right", and what would be wrong.

Scope it correctly and keep it tight:
- Request the ENABLING capability, not a one-off end result. If the spec is about
  interacting with a system (e.g. a game engine), request the *tool* another AI
  will use to drive that system — NOT a specific downstream action. Ask for "a
  tool to set/trigger a Blueprint animation state", NOT "make weapon reload work"
  (reload is just one use of such a tool).
- Describe WHAT it must do and how to judge it — never HOW to build it. No
  implementation options or design variants; the fulfiller decides those.
- No process narration or status chatter — never write "I couldn't do X because
  tool Y is missing, verify by creating a reload." State the need directly:
  which tool, what it does, how it behaves, what's good vs bad.
- No filler — every line is a requirement or a constraint, or it's cut.

## Not supported — avoid
- Raw HTML in Markdown is NOT rendered — never use \`<div>\`, \`<table>\`, \`<br>\`,
  etc. Use Markdown and Mermaid only.
- Do not hand-write frontmatter in \`content\`, and do not set \`version\`.
- Do not write to \`${base}\` — always use an \`ai/*\` branch.

## Tips
- Write clear, specific commit \`message\`s — they appear in the review UI.`;
}

function buildServer(principal: Principal | null, site: SiteContext): McpServer {
  const server = new McpServer(
    { name: "specification-hub", version: "0.1.0" },
    { instructions: authoringGuide(site) },
  );
  // All tool handlers below operate on THIS request's site (repo selected by the
  // request host). A SiteRepo is cheap to construct per connection.
  const gitlib = gitmod.repoFor(site);
  const base = site.defaultBranch;

  // Short branch-state warning appended to write results, so the model notices
  // when main has advanced and can reconcile (branch_status / sync_branch)
  // before doing more work on a stale branch.
  const staleNote = (branch: string): string => {
    if (branch === base) return "";
    try {
      const s = gitlib.branchSyncStatus(branch, base);
      if (s.upToDate) return "";
      const bits: string[] = [];
      if (s.staleFiles.length) bits.push(`${s.staleFiles.length} file(s) updated on ${base}`);
      if (s.conflictFiles.length) bits.push(`${s.conflictFiles.length} conflicting`);
      return ` ⚠ ${base} has advanced (${bits.join(", ")}) — check branch_status and sync_branch to reconcile.`;
    } catch {
      return "";
    }
  };

  server.registerTool(
    "authoring_guide",
    {
      title: "How to author docs",
      description:
        "Return the full guide on how to write documents here: the workflow, required " +
        "fields, which Markdown/Mermaid renders, and conventions. Read this before creating " +
        "or substantially editing docs — especially when the specification is still empty.",
      inputSchema: {},
      outputSchema: { guide: z.string() },
    },
    async () => {
      const guide = authoringGuide(site);
      return ok(guide, { guide });
    },
  );

  server.registerTool(
    "search_docs",
    {
      title: "Search documentation",
      description:
        "Full-text search the documentation. Returns matching documents with a short snippet. " +
        "Optionally filter by `status` (e.g. status=\"request\" to find documents asking for " +
        "content); an empty query with a status lists all docs of that status.",
      inputSchema: {
        query: z.string().describe("Text to search for (may be empty if filtering by status)"),
        branch: z.string().optional().describe(`Branch to search (default: ${base})`),
        status: z
          .enum(DOC_STATUSES as unknown as [DocStatus, ...DocStatus[]])
          .optional()
          .describe("Only return documents with this status"),
      },
      outputSchema: {
        branch: z.string(),
        query: z.string(),
        status: z.string().optional(),
        hits: z.array(
          z.object({ path: z.string(), title: z.string(), snippet: z.string() }),
        ),
      },
    },
    async ({ query, branch, status }) => {
      const b = branch || base;
      try {
        const hits = gitlib.searchDocs(b, query, status);
        return ok(
          hits.length ? hits.map((h) => `• ${h.title} — ${h.path}\n  ${h.snippet}`).join("\n") : "No matches.",
          { branch: b, query, status, hits },
        );
      } catch (e) {
        return fail(String((e as Error).message));
      }
    },
  );

  server.registerTool(
    "list_docs",
    {
      title: "List documents",
      description:
        "List documentation files on a branch with their title and status. Optionally filter by " +
        "`status` (e.g. status=\"request\" to list documents that ask for content to be written).",
      inputSchema: {
        branch: z.string().optional().describe(`Branch (default: ${base})`),
        status: z
          .enum(DOC_STATUSES as unknown as [DocStatus, ...DocStatus[]])
          .optional()
          .describe("Only list documents with this status"),
      },
      outputSchema: {
        branch: z.string(),
        status: z.string().optional(),
        items: z.array(
          z.object({ path: z.string(), title: z.string(), status: z.string() }),
        ),
      },
    },
    async ({ branch, status }) => {
      const b = branch || base;
      try {
        const want = status?.toLowerCase();
        const items = gitlib
          .listMarkdownFiles(b)
          .map((path) => {
            const { frontmatter } = parseFrontmatter(gitlib.readFile(b, path));
            return { path, title: String(frontmatter.title || path), status: String(frontmatter.status || "") };
          })
          .filter((i) => !want || i.status.toLowerCase() === want);
        return ok(
          items.length
            ? items.map((i) => `• ${i.title} [${i.status}] — ${i.path}`).join("\n")
            : want
              ? `No documents with status "${status}".`
              : "No documents.",
          { branch: b, status, items },
        );
      } catch (e) {
        return fail(String((e as Error).message));
      }
    },
  );

  server.registerTool(
    "read_doc",
    {
      title: "Read a document",
      description:
        "Read a documentation file's frontmatter and Markdown content. Returns the body in pages " +
        "of lines (default 300) — pass `offset`/`limit` to page through large documents and check " +
        "`hasMore`/`nextOffset` in the result.",
      inputSchema: {
        path: z.string().describe("Doc path, e.g. docs/04-gait-cycle/index.md"),
        branch: z.string().optional().describe(`Branch (default: ${base})`),
        offset: z.number().int().min(0).optional().describe("First body line to return (0-based, default 0)"),
        limit: z.number().int().min(1).max(2000).optional().describe("Max body lines to return (default 300)"),
      },
      outputSchema: {
        path: z.string(),
        branch: z.string(),
        frontmatter: z.record(z.string(), z.unknown()),
        content: z.string(),
        offset: z.number(),
        limit: z.number(),
        returnedLines: z.number(),
        totalLines: z.number(),
        hasMore: z.boolean(),
        nextOffset: z.number().nullable(),
      },
    },
    async ({ path, branch, offset, limit }) => {
      const b = branch || base;
      try {
        const { frontmatter, content } = parseFrontmatter(gitlib.readFile(b, path));
        const lines = content.split("\n");
        const off = Math.max(0, offset ?? 0);
        const lim = limit ?? 300;
        const slice = lines.slice(off, off + lim);
        const hasMore = off + lim < lines.length;
        const nextOffset = hasMore ? off + lim : null;
        const text = slice.join("\n");
        return ok(text, {
          path,
          branch: b,
          frontmatter,
          content: text,
          offset: off,
          limit: lim,
          returnedLines: slice.length,
          totalLines: lines.length,
          hasMore,
          nextOffset,
        });
      } catch (e) {
        return fail(String((e as Error).message));
      }
    },
  );

  server.registerTool(
    "list_branches",
    {
      title: "List branches",
      description: "List branches in the documentation repository.",
      inputSchema: {},
      outputSchema: { default: z.string(), branches: z.array(z.string()) },
    },
    async () => {
      try {
        const branches = gitlib.listBranches();
        return ok(branches.join("\n"), { default: base, branches });
      } catch (e) {
        return fail(String((e as Error).message));
      }
    },
  );

  server.registerTool(
    "list_suggestions",
    {
      title: "List proposed changes",
      description: "List branches that have proposed changes to a document (vs the base branch).",
      inputSchema: {
        path: z.string().describe("Doc path"),
        base: z.string().optional().describe(`Base branch (default: ${base})`),
      },
      outputSchema: { path: z.string(), base: z.string(), branches: z.array(z.string()) },
    },
    async ({ path, base: baseArg }) => {
      const b = baseArg || base;
      try {
        const s = gitlib.suggestionsForFile(path, b).map((x) => x.branch);
        return ok(s.length ? `Proposed changes from: ${s.join(", ")}` : "No proposed changes.", {
          path,
          base: b,
          branches: s,
        });
      } catch (e) {
        return fail(String((e as Error).message));
      }
    },
  );

  server.registerTool(
    "branch_status",
    {
      title: "Branch status vs main",
      description:
        "Report how a branch stands relative to the base branch: whether it's up to date, which " +
        "docs base changed that the branch hasn't yet (staleFiles — safe to pull) and which were " +
        "changed on BOTH sides (conflictFiles — need a decision). Check this before editing a " +
        "long-lived branch; if it's behind, reconcile with sync_branch first.",
      inputSchema: {
        branch: z.string().describe("Branch to inspect, e.g. ai/improve-gait"),
        base: z.string().optional().describe(`Base branch (default: ${base})`),
      },
      outputSchema: {
        branch: z.string(),
        base: z.string(),
        upToDate: z.boolean(),
        ahead: z.number(),
        behind: z.number(),
        staleFiles: z.array(z.string()),
        conflictFiles: z.array(z.string()),
      },
    },
    async ({ branch, base: baseArg }) => {
      const b = baseArg || base;
      try {
        const s = gitlib.branchSyncStatus(branch, b);
        const lines = [
          s.upToDate ? `✓ ${branch} is up to date with ${b}.` : `⚠ ${branch} is behind ${b}.`,
          `ahead ${s.ahead}, behind ${s.behind}`,
        ];
        if (s.staleFiles.length) lines.push(`Updated on ${b} (safe to pull): ${s.staleFiles.join(", ")}`);
        if (s.conflictFiles.length) lines.push(`Changed on both (decide): ${s.conflictFiles.join(", ")}`);
        if (!s.upToDate) lines.push("Reconcile with sync_branch (merge | prefer-main | prefer-mine | reset).");
        return ok(lines.join("\n"), { ...s });
      } catch (e) {
        return fail(String((e as Error).message));
      }
    },
  );

  // ---- write tools (require an authenticated principal via OAuth/session) ----
  if (principal) {
    server.registerTool(
      "create_branch",
      {
        title: "Create a branch",
        description:
          "Create the branch for this session's proposals (writes never go to the default " +
          "branch). Create ONE branch per session and reuse it for all your edits — don't make a " +
          "new branch per task; that splits related changes and collides in review.",
        inputSchema: {
          name: z.string().describe("New branch name, e.g. ai/improve-gait"),
          from: z.string().optional().describe(`Source branch (default: ${base})`),
        },
        outputSchema: { name: z.string() },
      },
      async ({ name, from }) => {
        const verdict = canWriteBranch(principal, name, base);
        if (!verdict.ok) return fail(verdict.reason ?? "Not allowed");
        try {
          gitlib.createBranch(name, from || base);
          return ok(`Created branch ${name} from ${from || base}.`, { name });
        } catch (e) {
          return fail(String((e as Error).message));
        }
      },
    );

    server.registerTool(
      "sync_branch",
      {
        title: "Update branch from main",
        description:
          "Reconcile a branch with the base branch, git-style — YOU choose how:\n" +
          "• merge (default) — bring base in, keeping your changes; if it conflicts nothing is " +
          "changed and the conflicting files are returned (read both versions, then save_doc to " +
          "resolve);\n" +
          "• prefer-main — merge, base wins conflicts;\n" +
          "• prefer-mine — merge, your branch wins conflicts;\n" +
          "• reset — discard the branch's own changes entirely and match base.\n" +
          "Run branch_status first to see what differs.",
        inputSchema: {
          branch: z.string().describe("Branch to update (e.g. ai/improve-gait)"),
          strategy: z
            .enum(["merge", "prefer-main", "prefer-mine", "reset"])
            .optional()
            .describe("How to reconcile (default: merge)"),
          base: z.string().optional().describe(`Base branch to pull from (default: ${base})`),
        },
        outputSchema: {
          strategy: z.string(),
          merged: z.boolean(),
          conflicts: z.array(z.string()),
          branch: z.string(),
          base: z.string(),
        },
      },
      async ({ branch, strategy, base: baseArg }) => {
        const b = baseArg || base;
        const verdict = canWriteBranch(principal, branch, base);
        if (!verdict.ok) return fail(verdict.reason ?? "Not allowed");
        try {
          const r = gitlib.updateBranchFromBase(branch, b, strategy || "merge", principal.name);
          if (!r.merged) {
            return ok(
              `Merging ${b} into ${branch} hit conflicts in: ${r.conflicts.join(", ")}. Nothing was ` +
                `changed. Resolve by reading both versions and save_doc, or retry sync_branch with ` +
                `strategy "prefer-main", "prefer-mine", or "reset".`,
              { ...r, branch, base: b },
            );
          }
          return ok(`Reconciled ${branch} with ${b} (${r.strategy}).`, { ...r, branch, base: b });
        } catch (e) {
          return fail(String((e as Error).message));
        }
      },
    );

    server.registerTool(
      "save_doc",
      {
        title: "Save a document (propose an edit)",
        description:
          "Create or update a document on a branch and commit it. Writes are not allowed on the default branch — use an ai/* branch.",
        inputSchema: {
          branch: z.string().describe("Target branch (e.g. ai/improve-gait)"),
          path: z.string().describe("Doc path, e.g. docs/04-gait-cycle/index.md"),
          title: z.string().describe("Document title"),
          content: z.string().describe("Markdown body of the document"),
          status: z.enum(DOC_STATUSES as unknown as [DocStatus, ...DocStatus[]]).optional(),
          tags: z.array(z.string()).optional(),
          message: z.string().optional().describe("Commit message"),
        },
        outputSchema: {
          branch: z.string(),
          path: z.string(),
          sha: z.string(),
        },
      },
      async ({ branch, path, title, content, status, tags, message }) => {
        const verdict = canWriteBranch(principal, branch, base);
        if (!verdict.ok) return fail(verdict.reason ?? "Not allowed");
        try {
          if (!gitlib.branchExists(branch)) gitlib.createBranch(branch, base);
          // Version is auto-stamped server-side (time-based); not an AI input.
          const frontmatter = validateFrontmatter({
            id: slugify(title),
            title,
            status: status || "draft",
            version: stampVersion(),
            tags: tags || [],
          });
          gitlib.writeFileToBranch(branch, path, serializeDoc(frontmatter, content));
          const commit = gitlib.commit(branch, message || `Update ${path}`, principal.name);
          return ok(
            `Saved ${path} on ${branch} (commit ${commit.sha.slice(0, 8)}).` + staleNote(branch),
            { branch, path, sha: commit.sha },
          );
        } catch (e) {
          return fail(String((e as Error).message));
        }
      },
    );

    server.registerTool(
      "delete_doc",
      {
        title: "Delete a document",
        description:
          "Remove a document on a branch and commit the deletion (a human accepts it in Review, " +
          "which removes it from the base branch). Use this to actually delete an obsolete file — " +
          "don't just mark it `deprecated` and ask for a manual `git rm`.",
        inputSchema: {
          branch: z.string().describe("Target branch (e.g. ai/cleanup)"),
          path: z.string().describe("Doc path to delete, e.g. docs/old/index.md"),
          message: z.string().optional().describe("Commit message"),
        },
        outputSchema: {
          branch: z.string(),
          path: z.string(),
          sha: z.string(),
          deleted: z.boolean(),
        },
      },
      async ({ branch, path, message }) => {
        const verdict = canWriteBranch(principal, branch, base);
        if (!verdict.ok) return fail(verdict.reason ?? "Not allowed");
        try {
          if (!gitlib.branchExists(branch)) gitlib.createBranch(branch, base);
          if (!gitlib.fileExists(branch, path)) return fail(`Document not found on ${branch}: ${path}`);
          gitlib.deleteFileFromBranch(branch, path);
          const commit = gitlib.commit(branch, message || `Delete ${path}`, principal.name);
          return ok(
            `Deleted ${path} on ${branch} (commit ${commit.sha.slice(0, 8)}).` + staleNote(branch),
            { branch, path, sha: commit.sha, deleted: true },
          );
        } catch (e) {
          return fail(String((e as Error).message));
        }
      },
    );

    // Shared helper for incremental edits: preserves the existing frontmatter,
    // re-stamps the version, writes a small change + commits. Keeping each call's
    // payload small avoids tripping client-side size limits.
    type EditResult = {
      body: string;
      frontmatter?: Record<string, unknown>; // fields to merge over the existing frontmatter
      note?: string;
      error?: string;
    };
    const editDoc = async (
      branch: string,
      path: string,
      message: string,
      transform: (body: string, frontmatter: Record<string, unknown>) => EditResult,
    ) => {
      const verdict = canWriteBranch(principal, branch, base);
      if (!verdict.ok) return fail(verdict.reason ?? "Not allowed");
      try {
        if (!gitlib.branchExists(branch)) gitlib.createBranch(branch, base);
        if (!gitlib.fileExists(branch, path)) {
          return fail("Document not found on this branch; use save_doc to create it first.");
        }
        const { frontmatter, content } = parseFrontmatter(gitlib.readFile(branch, path));
        const result = transform(content, frontmatter);
        if (result.error) return fail(result.error);
        const fm = { ...frontmatter, ...(result.frontmatter ?? {}), version: stampVersion() };
        gitlib.writeFileToBranch(branch, path, serializeDoc(fm, result.body));
        const commit = gitlib.commit(branch, message, principal.name);
        return ok(
          `Updated ${path} on ${branch} (commit ${commit.sha.slice(0, 8)}).` +
            (result.note ? ` ${result.note}` : "") +
            staleNote(branch),
          { branch, path, sha: commit.sha, version: fm.version },
        );
      } catch (e) {
        return fail(String((e as Error).message));
      }
    };

    server.registerTool(
      "append_section",
      {
        title: "Append to a document",
        description:
          "Append a chunk of Markdown to the end of an existing document on a branch. Use this to " +
          "build up a large document in small steps (one section per call) instead of one big save_doc.",
        inputSchema: {
          branch: z.string().describe("Target branch (e.g. ai/improve-gait)"),
          path: z.string().describe("Doc path, e.g. docs/04-gait-cycle/index.md"),
          markdown: z.string().describe("Markdown to append (e.g. a new `## Section` and its body)"),
          message: z.string().optional().describe("Commit message"),
        },
        outputSchema: DOC_WRITE_OUT,
      },
      ({ branch, path, markdown, message }) =>
        editDoc(branch, path, message || `Append to ${path}`, (body) => appendToBody(body, markdown)),
    );

    server.registerTool(
      "replace_section",
      {
        title: "Replace a section",
        description:
          "Replace one section of a document, identified by its heading, with new Markdown. The " +
          "section spans from the matching heading up to the next heading of the same or higher " +
          "level. Provide the full replacement section (including its heading) in `markdown`.",
        inputSchema: {
          branch: z.string().describe("Target branch"),
          path: z.string().describe("Doc path"),
          heading: z.string().describe('Heading of the section to replace, e.g. "## Stance phase" or "Stance phase"'),
          markdown: z.string().describe("Full replacement section, normally starting with its heading"),
          message: z.string().optional().describe("Commit message"),
        },
        outputSchema: DOC_WRITE_OUT,
      },
      ({ branch, path, heading, markdown, message }) =>
        editDoc(branch, path, message || `Update "${heading}" in ${path}`, (body) =>
          replaceSectionInBody(body, heading, markdown),
        ),
    );

    server.registerTool(
      "patch_doc",
      {
        title: "Find and replace in a document",
        description:
          "Replace every occurrence of an exact text snippet with another in a document. Good for " +
          "small targeted edits without resending the whole document.",
        inputSchema: {
          branch: z.string().describe("Target branch"),
          path: z.string().describe("Doc path"),
          find: z.string().describe("Exact text to find (verbatim, may span multiple lines)"),
          replace: z.string().describe("Replacement text"),
          message: z.string().optional().describe("Commit message"),
        },
        outputSchema: DOC_WRITE_OUT,
      },
      ({ branch, path, find, replace, message }) =>
        editDoc(branch, path, message || `Patch ${path}`, (body) => patchInBody(body, find, replace)),
    );

    server.registerTool(
      "edit_doc",
      {
        title: "Apply several edits at once",
        description:
          "Apply a sequence of edits to one document in a SINGLE commit — mix appends and " +
          "replacements of different parts in one call (instead of several separate edits). " +
          "Operations run in order; each is one of:\n" +
          '• {"op":"append","markdown":"…"} — add to the end;\n' +
          '• {"op":"replace_section","heading":"## X","markdown":"## X\\n…"} — replace that section;\n' +
          '• {"op":"patch","find":"…","replace":"…"} — exact find/replace.\n' +
          "If any operation fails (e.g. heading or text not found), nothing is committed.",
        inputSchema: {
          branch: z.string().describe("Target branch (e.g. ai/improve-gait)"),
          path: z.string().describe("Doc path, e.g. docs/04-gait-cycle/index.md"),
          edits: z
            .array(
              z.object({
                op: z.enum(["append", "replace_section", "patch"]),
                markdown: z.string().optional().describe("For append / replace_section"),
                heading: z.string().optional().describe("For replace_section: the section heading"),
                find: z.string().optional().describe("For patch: exact text to find"),
                replace: z.string().optional().describe("For patch: replacement text"),
              }),
            )
            .min(1)
            .describe("Ordered list of edit operations"),
          message: z.string().optional().describe("Commit message"),
        },
        outputSchema: DOC_WRITE_OUT,
      },
      ({ branch, path, edits, message }) =>
        editDoc(branch, path, message || `Edit ${path} (${edits.length} change${edits.length > 1 ? "s" : ""})`, (body) => {
          let cur = body;
          const notes: string[] = [];
          for (let i = 0; i < edits.length; i++) {
            const e = edits[i];
            let r: BodyEdit;
            if (e.op === "append") {
              if (e.markdown == null) return { body, error: `edit #${i + 1} (append): markdown is required` };
              r = appendToBody(cur, e.markdown);
            } else if (e.op === "replace_section") {
              if (!e.heading || e.markdown == null)
                return { body, error: `edit #${i + 1} (replace_section): heading and markdown are required` };
              r = replaceSectionInBody(cur, e.heading, e.markdown);
            } else {
              if (e.find == null || e.replace == null)
                return { body, error: `edit #${i + 1} (patch): find and replace are required` };
              r = patchInBody(cur, e.find, e.replace);
            }
            if (r.error) return { body, error: `edit #${i + 1} (${e.op}): ${r.error}` };
            cur = r.body;
            if (r.note) notes.push(`#${i + 1} ${e.op} ${r.note}`);
            else notes.push(`#${i + 1} ${e.op}`);
          }
          return { body: cur, note: `(${notes.join("; ")})` };
        }),
    );

    server.registerTool(
      "set_metadata",
      {
        title: "Update metadata only (status / title / tags)",
        description:
          "Change ONLY a document's frontmatter — its status, title, and/or tags — leaving the " +
          "Markdown body untouched. Use this for metadata-only changes (e.g. marking a doc " +
          "`review` or `stable`, retitling, retagging) instead of resending the whole document " +
          "via save_doc. Pass at least one of status/title/tags.",
        inputSchema: {
          branch: z.string().describe("Target branch (e.g. ai/improve-gait)"),
          path: z.string().describe("Doc path, e.g. docs/04-gait-cycle/index.md"),
          status: z
            .enum(DOC_STATUSES as unknown as [DocStatus, ...DocStatus[]])
            .optional()
            .describe("New status"),
          title: z.string().optional().describe("New title (does not change the doc id/path)"),
          tags: z.array(z.string()).optional().describe("Replacement tag list"),
          message: z.string().optional().describe("Commit message"),
        },
        outputSchema: DOC_WRITE_OUT,
      },
      ({ branch, path, status, title, tags, message }) =>
        editDoc(branch, path, message || `Update metadata of ${path}`, (body) => {
          const changes: Record<string, unknown> = {};
          if (status !== undefined) changes.status = status;
          if (title !== undefined) changes.title = title;
          if (tags !== undefined) changes.tags = tags;
          if (Object.keys(changes).length === 0) {
            return { body, error: "Provide at least one of status, title, or tags." };
          }
          const parts = Object.keys(changes).join(", ");
          return { body, frontmatter: changes, note: `(metadata: ${parts})` };
        }),
    );
  }

  return server;
}

/** Mount the MCP server (Streamable HTTP) at /mcp on the given Express app. */
export function registerMcp(app: Express): void {
  if (!config.mcpEnabled) return;
  const transports: Record<string, StreamableHTTPServerTransport> = {};

  app.post("/mcp", async (req: Request, res: Response) => {
    try {
      const principal = await resolvePrincipal(req);
      if (!principal) {
        unauthorized(req, res);
        return;
      }
      // The repository is selected by the request host. An unlinked domain has no
      // docs to serve, so refuse before building a server.
      const site = await resolveSite(hostFromRequest(req));
      if (!site) {
        res.status(404).json({
          jsonrpc: "2.0",
          error: { code: -32000, message: "This domain is not linked to a repository." },
          id: null,
        });
        return;
      }
      const sid = req.headers["mcp-session-id"] as string | undefined;
      let transport = sid ? transports[sid] : undefined;
      if (!transport) {
        if (sid || !isInitializeRequest(req.body)) {
          res.status(400).json({
            jsonrpc: "2.0",
            error: { code: -32000, message: "No valid session; send an initialize request first." },
            id: null,
          });
          return;
        }
        transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          onsessioninitialized: (id) => {
            transports[id] = transport!;
          },
        });
        transport.onclose = () => {
          if (transport!.sessionId) delete transports[transport!.sessionId];
        };
        await buildServer(principal, site).connect(transport);
      }
      await transport.handleRequest(req, res, req.body);
    } catch (e) {
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: "2.0",
          error: { code: -32603, message: String((e as Error).message) },
          id: null,
        });
      }
    }
  });

  const sessionRequest = async (req: Request, res: Response) => {
    if (!(await resolvePrincipal(req))) {
      unauthorized(req, res);
      return;
    }
    const sid = req.headers["mcp-session-id"] as string | undefined;
    const transport = sid ? transports[sid] : undefined;
    if (!transport) {
      res.status(400).send("Invalid or missing session ID");
      return;
    }
    await transport.handleRequest(req, res);
  };
  app.get("/mcp", sessionRequest);
  app.delete("/mcp", sessionRequest);
}
