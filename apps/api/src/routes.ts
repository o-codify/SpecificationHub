import express, { Router, type Request, type Response } from "express";
import {
  DOC_STATUSES,
  FrontmatterError,
  parseFrontmatter,
  promoteOnAccept,
  serializeDoc,
  stampVersion,
  validateFrontmatter,
  type TreeItem,
} from "@spec/core";
import { repoFor, type SiteRepo } from "./git.js";
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
import { attachSite, clearSiteCache, type SiteContext } from "./site.js";
import { verifyCredentials } from "./credentials.js";
import { pickImageExt, mimeForExt, MAX_IMAGE_BYTES } from "./images.js";
import { config } from "./config.js";

function bearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (header && header.startsWith("Bearer ")) return header.slice("Bearer ".length).trim();
  return null;
}

class HttpError extends Error {
  status: number;
  code?: string;
  constructor(status: number, message: string, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function sendError(res: Response, err: unknown): void {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message, ...(err.code ? { code: err.code } : {}) });
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

// ---- Site (tenant) resolution helpers ----

/** The resolved site, or 409 `domain_not_linked` when the host has no binding. */
function siteOf(req: Request): SiteContext {
  if (!req.site) {
    throw new HttpError(409, "This domain is not linked to a repository.", "domain_not_linked");
  }
  return req.site;
}

/** Read access: site must exist, and private sites require a principal. */
function siteRead(req: Request): SiteContext {
  const site = siteOf(req);
  if (site.visibility === "private" && !req.principal) {
    throw new HttpError(401, "This documentation is private. Sign in to view it.", "private");
  }
  return site;
}

/** A repo handle for reading (enforces read access). */
function repoRead(req: Request): { repo: SiteRepo; site: SiteContext } {
  const site = siteRead(req);
  return { repo: repoFor(site), site };
}

/** A repo handle for writing (caller is already authenticated). */
function repoWrite(req: Request): { repo: SiteRepo; site: SiteContext } {
  const site = siteOf(req);
  return { repo: repoFor(site), site };
}

function ensureCanWrite(req: Request, site: SiteContext, branch: string): void {
  if (!req.principal) throw new HttpError(401, "Authentication required");
  const verdict = canWriteBranch(req.principal, branch, site.defaultBranch);
  if (!verdict.ok) throw new HttpError(403, verdict.reason ?? "Forbidden");
}

export function createRouter(): Router {
  const router = Router();
  // API responses are per-request/auth-dependent — never let a browser or proxy
  // cache them (a stale 401 or error page would otherwise resurface randomly).
  router.use((_req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    next();
  });
  router.use(attachPrincipal);
  router.use(attachSite);

  // ---- Health ----
  router.get("/health", (_req, res) => {
    res.json({ status: "ok", service: "specification-hub", time: new Date().toISOString() });
  });

  // ---- Auth (admin login/password) — global, works without a site binding ----
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

  // ---- Sites (domain → repo bindings). Admin only. ----
  const siteOut = (s: store.SiteRow) => ({
    id: s.id,
    domain: s.domain,
    repo: s.githubRepo,
    brand: s.brandName ?? "",
    visibility: s.visibility,
  });

  router.get(
    "/sites",
    requireRole("admin"),
    h(async (_req, res) => {
      const sites = await store.listSites();
      res.json({ sites: sites.map(siteOut) });
    }),
  );

  const readSiteInput = (req: Request): store.SiteInput => {
    const domain = String(req.body?.domain ?? "").trim().toLowerCase();
    if (!domain || !/^[a-z0-9.-]+$/.test(domain)) throw new HttpError(400, "Valid `domain` is required");
    const repo = String(req.body?.repo ?? "").trim();
    if (repo && !/^[^/\s]+\/[^/\s]+$/.test(repo)) throw new HttpError(400, "`repo` must be owner/name");
    const visibility = req.body?.visibility === "private" ? "private" : "public";
    const brand = typeof req.body?.brand === "string" ? req.body.brand : "";
    return { domain, githubRepo: repo, brandName: brand || null, visibility };
  };

  router.post(
    "/sites",
    requireRole("admin"),
    h(async (req, res) => {
      const input = readSiteInput(req);
      if (await store.getSiteByDomain(input.domain)) {
        throw new HttpError(409, `A binding for ${input.domain} already exists`);
      }
      const created = await store.createSite(input);
      clearSiteCache();
      res.status(201).json({ site: siteOut(created) });
    }),
  );

  router.put(
    "/sites/:id",
    requireRole("admin"),
    h(async (req, res) => {
      const id = req.params.id;
      const existing = await store.getSiteById(id);
      if (!existing) throw new HttpError(404, "Site not found");
      const input = readSiteInput(req);
      const clash = await store.getSiteByDomain(input.domain);
      if (clash && clash.id !== id) throw new HttpError(409, `A binding for ${input.domain} already exists`);
      const updated = await store.updateSite(id, input);
      clearSiteCache();
      res.json({ site: updated ? siteOut(updated) : null });
    }),
  );

  router.delete(
    "/sites/:id",
    requireRole("admin"),
    h(async (req, res) => {
      await store.deleteSite(req.params.id);
      clearSiteCache();
      res.json({ deleted: true });
    }),
  );

  // ---- Branches ----
  router.get(
    "/branches",
    h((req, res) => {
      const { repo, site } = repoRead(req);
      const branches = repo.listBranches();
      res.json({
        default: site.defaultBranch,
        branches: branches.map((name) => ({ name, isDefault: name === site.defaultBranch })),
      });
    }),
  );

  router.post(
    "/branches",
    requireAuth,
    h((req, res) => {
      const { repo, site } = repoWrite(req);
      const name = requireBranch(req.body?.name, "name");
      const from = (req.body?.from as string) || site.defaultBranch;
      ensureCanWrite(req, site, name);
      repo.createBranch(name, from);
      res.status(201).json({ name, from });
    }),
  );

  router.delete(
    "/branches",
    requireRole("admin", "reviewer"),
    h((req, res) => {
      const { repo } = repoWrite(req);
      const name = requireBranch((req.query.name ?? req.body?.name) as string, "name");
      repo.deleteBranch(name);
      res.json({ name, deleted: true });
    }),
  );

  // ---- Tree ----
  router.get(
    "/tree",
    h((req, res) => {
      const { repo, site } = repoRead(req);
      const branch = (req.query.branch as string) || site.defaultBranch;
      const files = repo.listMarkdownFiles(branch);
      const items: TreeItem[] = files.map((path) => {
        let title = path;
        let status = "";
        try {
          const { frontmatter } = parseFrontmatter(repo.readFile(branch, path));
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
      const { repo, site } = repoRead(req);
      const branch = (req.query.branch as string) || site.defaultBranch;
      const docPath = validateDocPath(req.query.path);
      const raw = repo.readFile(branch, docPath);
      const { frontmatter, content } = parseFrontmatter(raw);
      res.json({ path: docPath, branch, frontmatter, content });
    }),
  );

  const writeDoc = (mode: "create" | "upsert") =>
    h((req: Request, res: Response) => {
      const { repo, site } = repoWrite(req);
      const branch = requireBranch(req.body?.branch);
      const docPath = validateDocPath(req.body?.path);
      ensureCanWrite(req, site, branch);

      // Version is server-authoritative (time-based, minute cooldown); any
      // client-supplied version is ignored so neither users nor AI control it.
      const fmInput = (req.body?.frontmatter as Record<string, unknown>) ?? {};
      fmInput.version = stampVersion();
      const frontmatter = validateFrontmatter(fmInput);
      const content = typeof req.body?.content === "string" ? req.body.content : "";

      if (mode === "create" && repo.fileExists(branch, docPath)) {
        throw new HttpError(409, `File already exists: ${docPath}`);
      }

      const serialized = serializeDoc(frontmatter, content);
      repo.writeFileToBranch(branch, docPath, serialized);
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
      const { repo, site } = repoWrite(req);
      const branch = requireBranch(req.body?.branch ?? req.query.branch);
      const docPath = validateDocPath(req.body?.path ?? req.query.path);
      ensureCanWrite(req, site, branch);
      repo.deleteFileFromBranch(branch, docPath);
      res.json({ path: docPath, branch, deleted: true, staged: true });
    }),
  );

  // ---- Commits ----
  router.post(
    "/commits",
    requireAuth,
    h(async (req, res) => {
      const { repo, site } = repoWrite(req);
      const branch = requireBranch(req.body?.branch);
      const message = (req.body?.message as string) || "Update documentation";
      const author = (req.body?.author as string) || req.principal!.name;
      ensureCanWrite(req, site, branch);
      const result = repo.commit(branch, message, author); // commits (+ pushes in GitHub mode)
      res.status(201).json(result);
    }),
  );

  // ---- Diff ----
  router.get(
    "/diff",
    h((req, res) => {
      const { repo } = repoRead(req);
      const base = requireBranch(req.query.base, "base");
      const head = requireBranch(req.query.head, "head");
      const files = repo.diff(base, head);
      res.json({ base, head, files });
    }),
  );

  // Docs whose body meaningfully changed between two branches.
  router.get(
    "/changed-docs",
    h((req, res) => {
      const { repo } = repoRead(req);
      const base = requireBranch(req.query.base, "base");
      const head = requireBranch(req.query.head, "head");
      res.json({ base, head, paths: repo.changedDocsBetween(base, head) });
    }),
  );

  // ---- Merge ----
  router.post(
    "/merge",
    requireRole("admin", "reviewer"),
    h(async (req, res) => {
      const { repo, site } = repoWrite(req);
      const base = requireBranch(req.body?.base, "base");
      const head = requireBranch(req.body?.head, "head");
      const message = (req.body?.message as string) || `Merge ${head} into ${base}`;
      if (repo.githubEnabled) {
        const pr = await github.ensurePullRequest(site.githubRepo, head, base, `Merge ${head} into ${base}`);
        const merged = await github.mergePullRequest(site.githubRepo, pr.number, message);
        repo.fetchRemote(true);
        res.status(200).json({
          merged: merged.merged,
          sha: merged.sha,
          branch: base,
          pullRequest: pr,
        });
        return;
      }
      const result = repo.merge(base, head, message);
      res.status(201).json(result);
    }),
  );

  // ---- Suggestions (inline proposed changes from branches) ----
  router.get(
    "/suggestions",
    h((req, res) => {
      const { repo, site } = repoRead(req);
      const base = (req.query.base as string) || site.defaultBranch;
      const docPath = validateDocPath(req.query.path);
      const suggestions = repo.suggestionsForFile(docPath, base);
      res.json({ path: docPath, base, suggestions });
    }),
  );

  router.get(
    "/suggestions/summary",
    h((req, res) => {
      const { repo, site } = repoRead(req);
      const base = (req.query.base as string) || site.defaultBranch;
      res.json({
        base,
        counts: repo.suggestionCounts(base),
        news: repo.newDocsForBase(base),
        deletions: repo.deletedDocsForBase(base),
      });
    }),
  );

  // Accept a specific (possibly edited) change: write the resulting content
  // directly onto base (main). Reviewer/admin only.
  router.post(
    "/suggestions/accept",
    requireRole("admin", "reviewer"),
    h((req, res) => {
      const { repo, site } = repoWrite(req);
      const base = (req.body?.base as string) || site.defaultBranch;
      const docPath = validateDocPath(req.body?.path);
      const isDelete = req.body?.delete === true;
      const fromBranch = typeof req.body?.head === "string" ? (req.body.head as string) : null;
      // Capture base's pre-accept content so we can fast-forward other branches
      // that merely tracked it (see propagateAcceptToBranches).
      const pre = repo.fileExists(base, docPath) ? repo.readFile(base, docPath) : "";

      let result;
      if (isDelete) {
        // Accept a deletion proposed on a branch: remove the file from base.
        const message = (req.body?.message as string) || `Delete ${docPath}`;
        result = repo.applyContentsToBase(base, [], message, req.principal!.name, [docPath]);
      } else {
        const rawContent = typeof req.body?.content === "string" ? req.body.content : "";
        // Re-stamp the version and promote review→stable server-side.
        const parsed = parseFrontmatter(rawContent);
        const content =
          Object.keys(parsed.frontmatter).length > 0
            ? serializeDoc(
                {
                  ...parsed.frontmatter,
                  version: stampVersion(),
                  status: promoteOnAccept(parsed.frontmatter.status),
                },
                parsed.content,
              )
            : rawContent;
        const message = (req.body?.message as string) || `Update ${docPath}`;
        result = repo.applyContentToBase(base, docPath, content, message, req.principal!.name);
      }
      // Bring the source branch (and stale unmodified branches) in line with base.
      repo.propagateAcceptToBranches(base, [docPath], { [docPath]: pre }, fromBranch, req.principal!.name);
      res.json(result);
    }),
  );

  // Accept ALL of a branch's changes into base in a single commit.
  router.post(
    "/suggestions/accept-all",
    requireRole("admin", "reviewer"),
    h((req, res) => {
      const { repo, site } = repoWrite(req);
      const base = (req.body?.base as string) || site.defaultBranch;
      const head = requireBranch(req.body?.head, "head");
      const message = (req.body?.message as string) || `Accept all changes from ${head}`;
      const result = repo.acceptBranchIntoBase(base, head, message, req.principal!.name);
      res.json(result);
    }),
  );

  // ---- Search ----
  router.get(
    "/search",
    h((req, res) => {
      const { repo, site } = repoRead(req);
      const branch = (req.query.branch as string) || site.defaultBranch;
      const q = ((req.query.q as string) || "").trim();
      res.json({ branch, query: q, hits: q ? repo.searchDocs(branch, q) : [] });
    }),
  );

  // ---- Image assets ----
  // Images are content-addressed binary blobs stored under assets/ on the
  // default branch (immutable, shared by every branch and already present when a
  // doc is accepted into main — no per-branch propagation needed). Upload commits
  // (and pushes) the blob; docs reference it as ![alt](assets/<hash>.<ext>).
  router.post(
    "/assets",
    express.raw({ type: () => true, limit: "25mb" }),
    requireAuth,
    h((req, res) => {
      const site = siteOf(req);
      const buf = req.body as Buffer;
      if (!Buffer.isBuffer(buf) || buf.length === 0) throw new HttpError(400, "Empty image body");
      if (buf.length > MAX_IMAGE_BYTES) throw new HttpError(413, "Image too large (max 25MB)");
      const ext = pickImageExt({ contentType: req.headers["content-type"], name: String(req.query.name ?? ""), buf });
      if (!ext) throw new HttpError(415, "Unsupported image type");
      const repoPath = repoFor(site).addImage(site.defaultBranch, buf, ext, req.principal!.name);
      res.status(201).json({ path: repoPath, url: `/api/assets?path=${encodeURIComponent(repoPath)}` });
    }),
  );

  // Serve an image blob. Public sites serve freely; private sites require a
  // principal — and since <img> can't send an Authorization header, a session/
  // OAuth token may be passed as `?token=` for that case.
  router.get(
    "/assets",
    h(async (req, res) => {
      const site = siteOf(req);
      let principal = req.principal;
      if (!principal && typeof req.query.token === "string" && req.query.token) {
        principal =
          (await store.resolveSession(req.query.token)) ||
          (await store.resolveOAuthToken(req.query.token));
      }
      if (site.visibility === "private" && !principal) {
        throw new HttpError(401, "This documentation is private.", "private");
      }
      const p = String(req.query.path ?? "");
      if (!p.startsWith("assets/") || p.includes("..") || p.includes("\\")) {
        throw new HttpError(400, "invalid path");
      }
      const ext = (p.split(".").pop() ?? "").toLowerCase();
      const buf = repoFor(site).readBinary(site.defaultBranch, p);
      res.setHeader("Content-Type", mimeForExt(ext));
      res.setHeader("Cache-Control", "public, max-age=300");
      res.end(buf);
    }),
  );

  // Expose deployment/site metadata for the UI. Always available (even on an
  // unlinked or private domain) so the frontend can render the right shell.
  router.get("/meta", (req, res) => {
    const site = req.site;
    const linked = Boolean(site);
    const isPrivate = site?.visibility === "private";
    const repo = site?.githubRepo || "";
    res.json({
      statuses: DOC_STATUSES,
      brand: site?.brandName || config.brandName,
      version: config.buildVersion,
      defaultBranch: site?.defaultBranch || config.defaultBranch,
      linked,
      private: isPrivate,
      github: repo ? { repo, url: `${config.githubServer}/${repo}` } : null,
    });
  });

  return router;
}
