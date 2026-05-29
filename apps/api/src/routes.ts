import { Router, type Request, type Response } from "express";
import {
  DOC_STATUSES,
  FrontmatterError,
  isValidRole,
  parseFrontmatter,
  serializeDoc,
  stampVersion,
  validateFrontmatter,
  type TreeItem,
} from "@hls/core";
import * as gitlib from "./git.js";
import { GitError, MergeConflictError, NotFoundError } from "./git.js";
import * as github from "./github.js";
import { GitHubError } from "./github.js";
import * as store from "./db.js";
import {
  attachPrincipal,
  canWriteBranch,
  requireAuth,
  requireRole,
} from "./auth.js";
import { verifyCredentials } from "./credentials.js";
import { config } from "./config.js";

function bearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (header && header.startsWith("Bearer ")) return header.slice("Bearer ".length).trim();
  return null;
}

class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function sendError(res: Response, err: unknown): void {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message });
  } else if (err instanceof FrontmatterError) {
    res.status(422).json({ error: err.message, fields: err.fields });
  } else if (err instanceof NotFoundError) {
    res.status(404).json({ error: err.message });
  } else if (err instanceof MergeConflictError) {
    res.status(409).json({ error: err.message, detail: err.detail });
  } else if (err instanceof GitError) {
    res.status(400).json({ error: err.message });
  } else if (err instanceof GitHubError) {
    res.status(err.status >= 400 ? err.status : 502).json({ error: `GitHub: ${err.message}` });
  } else {
    res.status(500).json({ error: (err as Error)?.message ?? "Internal error" });
  }
}

function h(fn: (req: Request, res: Response) => void | Promise<void>) {
  return (req: Request, res: Response) => {
    Promise.resolve()
      .then(() => fn(req, res))
      .catch((err) => sendError(res, err));
  };
}

function validateDocPath(p: unknown): string {
  if (!p || typeof p !== "string") throw new HttpError(400, "`path` is required");
  const norm = p.replace(/\\/g, "/");
  if (norm.includes("..") || norm.startsWith("/")) throw new HttpError(400, "invalid path");
  if (!norm.startsWith("docs/")) throw new HttpError(400, "path must be under docs/");
  if (!norm.toLowerCase().endsWith(".md")) throw new HttpError(400, "path must be a .md file");
  return norm;
}

function requireBranch(value: unknown, field = "branch"): string {
  if (!value || typeof value !== "string") throw new HttpError(400, `\`${field}\` is required`);
  return value;
}

function ensureCanWrite(req: Request, branch: string): void {
  if (!req.principal) throw new HttpError(401, "Authentication required");
  const verdict = canWriteBranch(req.principal, branch);
  if (!verdict.ok) throw new HttpError(403, verdict.reason ?? "Forbidden");
}

export function createRouter(): Router {
  const router = Router();
  router.use(attachPrincipal);

  // ---- Health ----
  router.get("/health", (_req, res) => {
    res.json({ status: "ok", service: "hls-hub", time: new Date().toISOString() });
  });

  // ---- Auth (admin login/password) ----
  router.post(
    "/auth/login",
    h(async (req, res) => {
      const username = String(req.body?.username ?? "");
      const password = String(req.body?.password ?? "");
      if (!verifyCredentials(username, password)) {
        throw new HttpError(401, "Invalid username or password");
      }
      const session = await store.createSession(username, "admin", config.sessionTtlHours);
      res.json({
        token: session.token,
        expiresAt: session.expiresAt,
        user: { name: username, role: "admin" },
      });
    }),
  );

  router.post(
    "/auth/logout",
    h(async (req, res) => {
      const token = bearerToken(req);
      if (token) await store.deleteSession(token);
      res.json({ ok: true });
    }),
  );

  router.get("/auth/me", (req, res) => {
    if (req.principal) {
      res.json({
        authenticated: true,
        name: req.principal.name,
        role: req.principal.role,
      });
    } else {
      res.json({ authenticated: false });
    }
  });

  // ---- Branches ----
  router.get(
    "/branches",
    h((_req, res) => {
      const branches = gitlib.listBranches();
      res.json({
        default: config.defaultBranch,
        branches: branches.map((name) => ({ name, isDefault: name === config.defaultBranch })),
      });
    }),
  );

  router.post(
    "/branches",
    requireAuth,
    h((req, res) => {
      const name = requireBranch(req.body?.name, "name");
      const from = (req.body?.from as string) || config.defaultBranch;
      ensureCanWrite(req, name);
      gitlib.createBranch(name, from);
      res.status(201).json({ name, from });
    }),
  );

  router.delete(
    "/branches",
    requireRole("admin", "reviewer"),
    h((req, res) => {
      const name = requireBranch((req.query.name ?? req.body?.name) as string, "name");
      gitlib.deleteBranch(name);
      res.json({ name, deleted: true });
    }),
  );

  // ---- Tree ----
  router.get(
    "/tree",
    h((req, res) => {
      const branch = (req.query.branch as string) || config.defaultBranch;
      const files = gitlib.listMarkdownFiles(branch);
      const items: TreeItem[] = files.map((path) => {
        let title = path;
        let status = "";
        try {
          const { frontmatter } = parseFrontmatter(gitlib.readFile(branch, path));
          if (frontmatter.title) title = String(frontmatter.title);
          if (frontmatter.status) status = String(frontmatter.status);
        } catch {
          /* leave defaults */
        }
        return { path, type: "file", title, status };
      });
      res.json({ branch, items });
    }),
  );

  // ---- Documents ----
  router.get(
    "/docs",
    h((req, res) => {
      const branch = (req.query.branch as string) || config.defaultBranch;
      const docPath = validateDocPath(req.query.path);
      const raw = gitlib.readFile(branch, docPath);
      const { frontmatter, content } = parseFrontmatter(raw);
      res.json({ path: docPath, branch, frontmatter, content });
    }),
  );

  const writeDoc = (mode: "create" | "upsert") =>
    h((req: Request, res: Response) => {
      const branch = requireBranch(req.body?.branch);
      const docPath = validateDocPath(req.body?.path);
      ensureCanWrite(req, branch);

      // Version is server-authoritative (time-based, minute cooldown); any
      // client-supplied version is ignored so neither users nor AI control it.
      const fmInput = (req.body?.frontmatter as Record<string, unknown>) ?? {};
      fmInput.version = stampVersion();
      const frontmatter = validateFrontmatter(fmInput);
      const content = typeof req.body?.content === "string" ? req.body.content : "";

      if (mode === "create" && gitlib.fileExists(branch, docPath)) {
        throw new HttpError(409, `File already exists: ${docPath}`);
      }

      const serialized = serializeDoc(frontmatter, content);
      gitlib.writeFileToBranch(branch, docPath, serialized);
      res.status(mode === "create" ? 201 : 200).json({
        path: docPath,
        branch,
        staged: true,
        message: "Saved to branch worktree; create a commit to persist it.",
      });
    });

  router.post("/docs", requireAuth, writeDoc("create"));
  router.put("/docs", requireAuth, writeDoc("upsert"));

  router.delete(
    "/docs",
    requireAuth,
    h((req, res) => {
      const branch = requireBranch(req.body?.branch ?? req.query.branch);
      const docPath = validateDocPath(req.body?.path ?? req.query.path);
      ensureCanWrite(req, branch);
      gitlib.deleteFileFromBranch(branch, docPath);
      res.json({ path: docPath, branch, deleted: true, staged: true });
    }),
  );

  // ---- Commits ----
  router.post(
    "/commits",
    requireAuth,
    h(async (req, res) => {
      const branch = requireBranch(req.body?.branch);
      const message = (req.body?.message as string) || "Update documentation";
      const author = (req.body?.author as string) || req.principal!.name;
      ensureCanWrite(req, branch);
      const result = gitlib.commit(branch, message, author); // commits (+ pushes in GitHub mode)
      let pullRequest = null;
      if (config.githubEnabled) {
        pullRequest = await github.ensurePullRequest(branch, config.defaultBranch, `Update ${branch}`);
      }
      res.status(201).json({ ...result, pullRequest });
    }),
  );

  // ---- Diff ----
  router.get(
    "/diff",
    h((req, res) => {
      const base = requireBranch(req.query.base, "base");
      const head = requireBranch(req.query.head, "head");
      const files = gitlib.diff(base, head);
      res.json({ base, head, files });
    }),
  );

  // ---- Merge ----
  router.post(
    "/merge",
    requireRole("admin", "reviewer"),
    h(async (req, res) => {
      const base = requireBranch(req.body?.base, "base");
      const head = requireBranch(req.body?.head, "head");
      const message = (req.body?.message as string) || `Merge ${head} into ${base}`;
      if (config.githubEnabled) {
        const pr = await github.ensurePullRequest(head, base, `Merge ${head} into ${base}`);
        const merged = await github.mergePullRequest(pr.number, message);
        gitlib.fetchRemote(true);
        res.status(200).json({
          merged: merged.merged,
          sha: merged.sha,
          branch: base,
          pullRequest: pr,
        });
        return;
      }
      const result = gitlib.merge(base, head, message);
      res.status(201).json(result);
    }),
  );

  // ---- Suggestions (inline proposed changes from branches) ----
  router.get(
    "/suggestions",
    h((req, res) => {
      const base = (req.query.base as string) || config.defaultBranch;
      const docPath = validateDocPath(req.query.path);
      const suggestions = gitlib.suggestionsForFile(docPath, base);
      res.json({ path: docPath, base, suggestions });
    }),
  );

  router.get(
    "/suggestions/summary",
    h((req, res) => {
      const base = (req.query.base as string) || config.defaultBranch;
      res.json({ base, counts: gitlib.suggestionCounts(base), news: gitlib.newDocsForBase(base) });
    }),
  );

  // Accept a specific (possibly edited) change: write the resulting content
  // directly onto base (main). Reviewer/admin only.
  router.post(
    "/suggestions/accept",
    requireRole("admin", "reviewer"),
    h((req, res) => {
      const base = (req.body?.base as string) || config.defaultBranch;
      const docPath = validateDocPath(req.body?.path);
      const rawContent = typeof req.body?.content === "string" ? req.body.content : "";
      // Re-stamp the version server-side so accepting into main updates the timestamp.
      const parsed = parseFrontmatter(rawContent);
      const content =
        Object.keys(parsed.frontmatter).length > 0
          ? serializeDoc({ ...parsed.frontmatter, version: stampVersion() }, parsed.content)
          : rawContent;
      const message = (req.body?.message as string) || `Update ${docPath}`;
      const result = gitlib.applyContentToBase(base, docPath, content, message, req.principal!.name);
      res.json(result);
    }),
  );

  // ---- Search ----
  router.get(
    "/search",
    h((req, res) => {
      const branch = (req.query.branch as string) || config.defaultBranch;
      const q = ((req.query.q as string) || "").trim();
      res.json({ branch, query: q, hits: q ? gitlib.searchDocs(branch, q) : [] });
    }),
  );

  // ---- Tokens (admin) ----
  router.get(
    "/tokens",
    requireRole("admin"),
    h(async (_req, res) => {
      res.json({ tokens: await store.listTokens() });
    }),
  );

  router.post(
    "/tokens",
    requireRole("admin"),
    h(async (req, res) => {
      const name = (req.body?.name as string)?.trim();
      const role = req.body?.role as string;
      if (!name) throw new HttpError(400, "`name` is required");
      if (!isValidRole(role)) throw new HttpError(400, "invalid role");
      let prefixes: string[] = Array.isArray(req.body?.allowed_branch_prefixes)
        ? req.body.allowed_branch_prefixes.map((p: unknown) => String(p))
        : [];
      if (role === "ai-agent" && prefixes.length === 0) {
        prefixes = ["ai/"];
      }
      const created = await store.createToken(name, role, prefixes);
      res.status(201).json({ token: created.token, info: created.info });
    }),
  );

  router.delete(
    "/tokens/:id",
    requireRole("admin"),
    h(async (req, res) => {
      const ok = await store.deleteToken(req.params.id);
      if (!ok) throw new HttpError(404, "Token not found");
      res.json({ deleted: true });
    }),
  );

  // Expose allowed status values for the editor UI.
  router.get("/meta", (_req, res) => {
    res.json({
      statuses: DOC_STATUSES,
      defaultBranch: config.defaultBranch,
      github: config.githubEnabled
        ? { repo: config.githubRepo, url: `${config.githubServer}/${config.githubRepo}` }
        : null,
    });
  });

  return router;
}
