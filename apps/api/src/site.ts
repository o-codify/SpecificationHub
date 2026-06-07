import path from "node:path";
import type { NextFunction, Request, Response } from "express";
import { DOC_STATUSES } from "@spec/core";
import { config } from "./config.js";
import { getSiteByDomain, setSiteDefaultBranch, type SiteRow } from "./db.js";
import { ensureRepo, repoFor } from "./git.js";

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
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      site?: SiteContext | null;
    }
  }
}

/** Lower-case host without port; honours the first X-Forwarded-Host value. */
export function hostFromRequest(req: Request): string {
  const xfh = (req.headers["x-forwarded-host"] as string | undefined)?.split(",")[0]?.trim();
  const host = xfh || req.headers.host || "";
  return host.toLowerCase().replace(/:\d+$/, "");
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

// Resolution cache (keyed by normalised host). Holds the in-flight/settled
// promise so concurrent first-hits share one clone. Cleared on any site mutation.
const cache = new Map<string, Promise<SiteContext | null>>();

export function clearSiteCache(): void {
  cache.clear();
}

async function doResolve(host: string): Promise<SiteContext | null> {
  const row = host ? await getSiteByDomain(host) : null;
  if (row) {
    const ctx = siteFromRow(row);
    ensureRepo(ctx); // lazy clone/seed on first hit
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

/** Resolve the site for a host (cached). Returns null when the domain is unlinked. */
export function resolveSite(host: string): Promise<SiteContext | null> {
  const key = host;
  let p = cache.get(key);
  if (!p) {
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
}

/**
 * Public site metadata for a host — derived straight from the DB row (no repo
 * clone), so it's cheap enough to inline into the served HTML and to back the
 * /api/meta endpoint. This is what lets the first response carry the right brand.
 */
export async function siteMeta(host: string): Promise<SiteMeta> {
  const row = await getSiteByDomain(host);
  const repo = row?.githubRepo?.trim() || "";
  return {
    statuses: DOC_STATUSES,
    brand: row?.brandName?.trim() || config.brandName,
    version: config.buildVersion,
    defaultBranch: row?.defaultBranch || config.defaultBranch,
    linked: Boolean(row),
    private: row?.visibility === "private",
    github: repo ? { repo, url: `${config.githubServer}/${repo}` } : null,
  };
}

/** Express middleware: attach the resolved site (or null) to the request. */
export function attachSite(req: Request, _res: Response, next: NextFunction): void {
  resolveSite(hostFromRequest(req))
    .then((site) => {
      req.site = site;
      next();
    })
    .catch((err) => {
      req.site = null;
      next(err);
    });
}
