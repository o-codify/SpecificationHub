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
} from "@hls/core";
import * as gitlib from "./git.js";
import * as github from "./github.js";
import { canWriteBranch } from "./auth.js";
import { resolveSession, resolveOAuthToken, type Principal } from "./db.js";
import { config } from "./config.js";
import { baseUrl } from "./oauth.js";

// Auth is via `Authorization: Bearer <token>`: an OAuth access token (ChatGPT
// connector), a login session, or an app token (Admin → Tokens).
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

function slugify(t: string): string {
  return t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "untitled";
}

function buildServer(principal: Principal | null): McpServer {
  const server = new McpServer({ name: "specification-hub", version: "0.1.0" });
  const base = config.defaultBranch;

  server.registerTool(
    "search_docs",
    {
      title: "Search documentation",
      description: "Full-text search the Human Locomotion Specification docs. Returns matching documents with a short snippet.",
      inputSchema: {
        query: z.string().describe("Text to search for"),
        branch: z.string().optional().describe(`Branch to search (default: ${base})`),
      },
    },
    async ({ query, branch }) => {
      const b = branch || base;
      try {
        const hits = gitlib.searchDocs(b, query);
        return ok(
          hits.length ? hits.map((h) => `• ${h.title} — ${h.path}\n  ${h.snippet}`).join("\n") : "No matches.",
          { branch: b, query, hits },
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
      description: "List all documentation files on a branch with their title and status.",
      inputSchema: { branch: z.string().optional().describe(`Branch (default: ${base})`) },
    },
    async ({ branch }) => {
      const b = branch || base;
      try {
        const items = gitlib.listMarkdownFiles(b).map((path) => {
          const { frontmatter } = parseFrontmatter(gitlib.readFile(b, path));
          return { path, title: String(frontmatter.title || path), status: String(frontmatter.status || "") };
        });
        return ok(items.map((i) => `• ${i.title} [${i.status}] — ${i.path}`).join("\n"), { branch: b, items });
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

  // ---- write tools (require an authenticated principal via OAuth/session) ----
  if (principal) {
    server.registerTool(
      "create_branch",
      {
        title: "Create a branch",
        description: "Create a new branch for proposing changes (writes never go to the default branch).",
        inputSchema: {
          name: z.string().describe("New branch name, e.g. ai/improve-gait"),
          from: z.string().optional().describe(`Source branch (default: ${base})`),
        },
      },
      async ({ name, from }) => {
        const verdict = canWriteBranch(principal, name);
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
      "save_doc",
      {
        title: "Save a document (propose an edit)",
        description:
          "Create or update a document on a branch and commit it (opening/updating a Pull Request in GitHub mode). Writes are not allowed on the default branch — use an ai/* branch.",
        inputSchema: {
          branch: z.string().describe("Target branch (e.g. ai/improve-gait)"),
          path: z.string().describe("Doc path, e.g. docs/04-gait-cycle/index.md"),
          title: z.string().describe("Document title"),
          content: z.string().describe("Markdown body of the document"),
          status: z.enum(DOC_STATUSES as unknown as [DocStatus, ...DocStatus[]]).optional(),
          tags: z.array(z.string()).optional(),
          message: z.string().optional().describe("Commit message"),
        },
      },
      async ({ branch, path, title, content, status, tags, message }) => {
        const verdict = canWriteBranch(principal, branch);
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
          let pr: { number: number; url: string } | null = null;
          if (config.githubEnabled) {
            const p = await github.ensurePullRequest(branch, base, `Update ${path}`);
            pr = { number: p.number, url: p.url };
          }
          return ok(
            `Saved ${path} on ${branch} (commit ${commit.sha.slice(0, 8)}).` +
              (pr ? ` PR #${pr.number}: ${pr.url}` : ""),
            { branch, path, sha: commit.sha, pullRequest: pr },
          );
        } catch (e) {
          return fail(String((e as Error).message));
        }
      },
    );

    // Shared helper for incremental edits: preserves the existing frontmatter,
    // re-stamps the version, writes a small change + commits (+PR in GitHub mode).
    // Keeping each call's payload small avoids tripping client-side size limits.
    type EditResult = { body: string; note?: string; error?: string };
    const editDoc = async (
      branch: string,
      path: string,
      message: string,
      transform: (body: string) => EditResult,
    ) => {
      const verdict = canWriteBranch(principal, branch);
      if (!verdict.ok) return fail(verdict.reason ?? "Not allowed");
      try {
        if (!gitlib.branchExists(branch)) gitlib.createBranch(branch, base);
        if (!gitlib.fileExists(branch, path)) {
          return fail("Document not found on this branch; use save_doc to create it first.");
        }
        const { frontmatter, content } = parseFrontmatter(gitlib.readFile(branch, path));
        const result = transform(content);
        if (result.error) return fail(result.error);
        const fm = { ...frontmatter, version: stampVersion() };
        gitlib.writeFileToBranch(branch, path, serializeDoc(fm, result.body));
        const commit = gitlib.commit(branch, message, principal.name);
        let pr: { number: number; url: string } | null = null;
        if (config.githubEnabled) {
          const p = await github.ensurePullRequest(branch, base, message);
          pr = { number: p.number, url: p.url };
        }
        return ok(
          `Updated ${path} on ${branch} (commit ${commit.sha.slice(0, 8)}).` +
            (result.note ? ` ${result.note}` : "") +
            (pr ? ` PR #${pr.number}: ${pr.url}` : ""),
          { branch, path, sha: commit.sha, pullRequest: pr, version: fm.version },
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
      },
      ({ branch, path, markdown, message }) =>
        editDoc(branch, path, message || `Append to ${path}`, (body) => ({
          body: `${body.replace(/\s*$/, "")}\n\n${markdown.trim()}\n`,
        })),
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
      },
      ({ branch, path, heading, markdown, message }) =>
        editDoc(branch, path, message || `Update "${heading}" in ${path}`, (body) => {
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
        }),
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
      },
      ({ branch, path, find, replace, message }) =>
        editDoc(branch, path, message || `Patch ${path}`, (body) => {
          if (!find) return { body, error: "`find` must not be empty." };
          if (!body.includes(find)) return { body, error: "Text to replace was not found." };
          const count = body.split(find).length - 1;
          return { body: body.split(find).join(replace), note: `(${count} occurrence${count > 1 ? "s" : ""} replaced)` };
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
        await buildServer(principal).connect(transport);
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
