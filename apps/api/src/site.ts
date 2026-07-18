import path from "node:path";
import type { NextFunction, Request, Response } from "express";
import { DOC_STATUSES } from "@spec/core";
import { config } from "./config.js";
import { getSiteByDomain, setSiteDefaultBranch, type SiteRow } from "./db.js";
import { ensureRepo, repoFor, redactSecrets } from "./git.js";

/**
 * The resolved tenant for a request: one bare repo + worktrees + brand + access
 * policy, selected by the request's host. A `legacy` site is the single-tenant
 * fallback (env/local repo on the original on-disk paths) used when no domain
 * bindings exist — so existing deployments keep working unchanged.
 */
export interface SiteContext {
  id: string; // row id (= domain), or "__legacy__"
  domain: string; // matched host, or "" for the legacy fallback
  githubRepo: string; // "owner/name" ("" = local-only)
  brandName: string;
  visibility: "public" | "private";
  repoDir: string;
  worktreesDir: string;
  legacy: boolean;
  defaultBranch: string; // resolved repo HEAD (cached)
  /**
   * Set when the repository couldn't be made available (bad/missing GitHub
   * token, repo not found, network). The site still resolves — brand and
   * settings work — but any repo operation fails with this message instead of
   * retrying the clone on every request.
   */
  repoError?: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      site?: SiteContext | null;
      /** "" for a host-bound site, "/prefix" for a path-bound one. */
      siteBase?: string;
    }
  }
}

/** Lower-case host without port; honours the first X-Forwarded-Host value. */
export function hostFromRequest(req: Request): string {
  const xfh = (req.headers["x-forwarded-host"] as string | undefined)?.split(",")[0]?.trim();
  const host = xfh || req.headers.host || "";
  return host.toLowerCase().replace(/:\d+$/, "");
}

/**
 * First path segments that belong to the app itself, so they can never be taken
 * for a site prefix (and can't be claimed as one when creating a binding).
 */
export const RESERVED_PREFIXES = new Set([
  "api", "assets", "mcp", "oauth", ".well-known",
  "docs", "branches", "review", "settings", "admin",
  "favicon.svg", "favicon.ico", "robots.txt", "index.html",
]);

/** First path segment of a URL path ("" when there is none). */
function firstSegment(urlPath: string): string {
  const seg = urlPath.replace(/^\/+/, "").split(/[/?#]/)[0] ?? "";
  return seg.toLowerCase();
}

/**
 * A site binding is a base URL: either a bare host (`hls.example.com`) or a host
 * plus one path segment (`docs.example.com/hls`). Resolution prefers the more
 * specific path-bound binding and falls back to the host-bound one, so existing
 * bare-domain sites keep working exactly as before.
 */
export async function resolveSiteForRequest(
  host: string,
  urlPath: string,
): Promise<{ site: SiteContext | null; basePath: string; key: string }> {
  const seg = firstSegment(urlPath);
  if (seg && !RESERVED_PREFIXES.has(seg)) {
    const key = `${host}/${seg}`;
    const site = await resolveSite(key);
    if (site) return { site, basePath: `/${seg}`, key };
  }
  const site = await resolveSite(host);
  return { site, basePath: "", key: host };
}

function slug(s: string): string {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, "__")
      .replace(/^_+|_+$/g, "") || "site"
  );
}

function siteFromRow(row: SiteRow): SiteContext {
  // Storage key from the repo slug so several domains pointing at the same repo
  // share one on-disk clone; local-only sites key by domain.
  const key = slug(row.githubRepo || row.domain);
  const dir = path.join(config.dataDir, "sites", key);
  return {
    id: row.id,
    domain: row.domain,
    githubRepo: row.githubRepo,
    brandName: row.brandName?.trim() || config.brandName,
    visibility: row.visibility === "private" ? "private" : "public",
    repoDir: path.join(dir, "repo.git"),
    worktreesDir: path.join(dir, "worktrees"),
    legacy: false,
    defaultBranch: row.defaultBranch || config.defaultBranch,
  };
}

// Resolution cache (keyed by base URL: "host" or "host/prefix"). Holds the
// in-flight/settled promise so concurrent first-hits share one clone. Cleared on
// any site mutation.
const cache = new Map<string, Promise<SiteContext | null>>();

export function clearSiteCache(): void {
  cache.clear();
}

/**
 * Turn a failed clone/fetch into one actionable sentence (no stack, no secrets).
 * The common cause is a GITHUB_TOKEN that can't see the configured repository.
 */
function describeRepoFailure(ctx: SiteContext, err: unknown): string {
  const raw = redactSecrets(err instanceof Error ? err.message : String(err));
  const repo = ctx.githubRepo || "(local)";
  if (/not granted|403/i.test(raw)) {
    return `GitHub repository ${repo} is not accessible: the configured GITHUB_TOKEN lacks access to it. Grant the token access to this repository (or fix the repo name in Settings).`;
  }
  if (/repository not found|404/i.test(raw)) {
    return `GitHub repository ${repo} was not found — check the owner/name in Settings, and that the token can see it.`;
  }
  if (/authentication failed|401|could not read Username/i.test(raw)) {
    return `GitHub authentication failed for ${repo} — the GITHUB_TOKEN is missing, expired or invalid.`;
  }
  return `Could not prepare the repository ${repo}: ${raw.split("\n")[0]}`;
}

async function doResolve(baseKey: string): Promise<SiteContext | null> {
  const row = baseKey ? await getSiteByDomain(baseKey) : null;
  if (row) {
    const ctx = siteFromRow(row);
    try {
      ensureRepo(ctx); // lazy clone/seed on first hit
    } catch (e) {
      // Don't fail the whole request (and don't re-clone on every hit): record a
      // readable reason, log it once, and let the UI/API report it properly.
      ctx.repoError = describeRepoFailure(ctx, e);
      console.warn(`[site ${ctx.domain}] ${ctx.repoError}`);
      return ctx;
    }
    if (!row.defaultBranch) {
      // Resolve the real HEAD (main/master) once and persist it.
      const branch = repoFor(ctx).currentDefaultBranch();
      ctx.defaultBranch = branch;
      try {
        await setSiteDefaultBranch(row.id, branch);
      } catch {
        /* non-fatal — re-resolves next boot */
      }
    }
    return ctx;
  }
  // No binding for this host → the domain is unconfigured. The app still works
  // for login and Settings (those aren't site-scoped); docs/branches/review are
  // gated in the UI until an admin binds a repository to this domain.
  return null;
}

/**
 * Resolve the site for a base URL — "host" or "host/prefix" (cached).
 * Returns null when nothing is bound to it.
 */
export function resolveSite(baseKey: string): Promise<SiteContext | null> {
  const key = baseKey;
  let p = cache.get(key);
  if (!p) {
    // Unknown first segments (crawlers, one-off paths) each add a negative entry;
    // drop the whole map if it grows past anything a real deployment would need.
    if (cache.size > 500) cache.clear();
    p = doResolve(key);
    cache.set(key, p);
    // Don't cache failures (e.g. a transient clone error) forever.
    p.catch(() => cache.delete(key));
  }
  return p;
}

export interface SiteMeta {
  statuses: readonly string[];
  brand: string;
  version: string;
  defaultBranch: string;
  linked: boolean;
  private: boolean;
  github: { repo: string; url: string } | null;
  /** "" for a host-bound site, "/prefix" when served under a path. */
  basePath: string;
  /** Set when the bound repository can't be reached (bad token, missing repo…). */
  repoError?: string;
}

/**
 * Public site metadata for a host — derived straight from the DB row (no repo
 * clone), so it's cheap enough to inline into the served HTML and to back the
 * /api/meta endpoint. This is what lets the first response carry the right brand.
 */
export async function siteMeta(baseKey: string, basePath = "", repoError?: string): Promise<SiteMeta> {
  const row = await getSiteByDomain(baseKey);
  const repo = row?.githubRepo?.trim() || "";
  return {
    statuses: DOC_STATUSES,
    brand: row?.brandName?.trim() || config.brandName,
    version: config.buildVersion,
    defaultBranch: row?.defaultBranch || config.defaultBranch,
    linked: Boolean(row),
    private: row?.visibility === "private",
    github: repo ? { repo, url: `${config.githubServer}/${repo}` } : null,
    basePath,
    ...(repoError ? { repoError } : {}),
  };
}

/**
 * Express middleware: resolve the site (host- or path-bound) and, for a
 * path-bound one, strip its prefix off `req.url` so every downstream route
 * (/api, /mcp, /oauth, /.well-known, static, SPA) matches exactly as it does on
 * a bare domain. Must run before those are mounted.
 */
export function resolveSiteMiddleware(req: Request, _res: Response, next: NextFunction): void {
  resolveSiteForRequest(hostFromRequest(req), req.path)
    .then(({ site, basePath }) => {
      req.site = site;
      req.siteBase = basePath;
      if (basePath) {
        const rest = req.url.slice(basePath.length);
        req.url = rest.startsWith("/") ? rest : `/${rest}`;
      }
      next();
    })
    .catch((err) => {
      req.site = null;
      req.siteBase = "";
      next(err);
    });
}

/** Express middleware: attach the resolved site (or null) to the request. */
export function attachSite(req: Request, _res: Response, next: NextFunction): void {
  // Already resolved (and prefix-stripped) by resolveSiteMiddleware.
  if (req.site !== undefined) return next();
  resolveSite(hostFromRequest(req))
    .then((site) => {
      req.site = site;
      req.siteBase = "";
      next();
    })
    .catch((err) => {
      req.site = null;
      next(err);
    });
}
