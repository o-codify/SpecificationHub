import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
// Works for both src (apps/api/src) and bundled dist (apps/api/dist) — both 3 levels under root.
const repoRoot = path.resolve(here, "../../..");

function envPath(name: string, fallback: string): string {
  const v = process.env[name];
  return v ? path.resolve(v) : fallback;
}

const dataDir = envPath("DATA_DIR", path.join(repoRoot, "data"));

export const config = {
  port: Number(process.env.PORT ?? 8080),
  repoRoot,
  dataDir,
  repoDir: path.join(dataDir, "repo.git"),
  worktreesDir: path.join(dataDir, "worktrees"),
  // Postgres connection string (required). Coolify/managed Postgres etc.
  databaseUrl: process.env.DATABASE_URL ?? "",
  // Drizzle migrations live next to the package (apps/api/drizzle), resolved the
  // same way from src (tsx) and dist (bundled) since both are one level under it.
  migrationsDir: path.join(here, "../drizzle"),
  adminTokenFile: path.join(dataDir, "admin-token.txt"),
  docsSeedDir: envPath("DOCS_SEED", path.join(repoRoot, "docs")),
  webDist: envPath("WEB_DIST", path.join(repoRoot, "apps/web/dist")),
  defaultBranch: process.env.DEFAULT_BRANCH ?? "main",
  // Site brand/title shown in the UI. Configurable per deployment (the same
  // image powers multiple prods with different names), read at runtime.
  brandName: process.env.BRAND_NAME ?? "HLS Hub",
  adminTokenEnv: process.env.ADMIN_TOKEN ?? "",
  adminUsername: process.env.ADMIN_USERNAME ?? "admin",
  adminPassword: process.env.ADMIN_PASSWORD ?? "",
  sessionTtlHours: Number(process.env.SESSION_TTL_HOURS ?? 168),
  adminPasswordFile: path.join(dataDir, "admin-password.txt"),
  gitAuthorName: "HLS Hub",
  gitAuthorEmail: "hub@hls.local",

  // ---- GitHub integration (optional) ----
  // When both token and repo are set, GitHub becomes the source of truth:
  // commits are pushed, PRs are opened, and merges go through the PR merge API.
  githubToken: process.env.GITHUB_TOKEN ?? "",
  githubRepo: process.env.GITHUB_REPO ?? "", // "owner/name"
  githubApi: (process.env.GITHUB_API ?? "https://api.github.com").replace(/\/$/, ""),
  githubServer: (process.env.GITHUB_SERVER ?? "https://github.com").replace(/\/$/, ""),
  // Minimum gap between background `git fetch` syncs triggered by reads.
  syncIntervalMs: Number(process.env.SYNC_INTERVAL_MS ?? 10000),
  mcpEnabled: (process.env.MCP_ENABLED ?? "true") !== "false",
  // Public base URL of this server (scheme + host, no trailing slash). Used to
  // build absolute OAuth metadata URLs. If empty, derived from request headers
  // (honouring X-Forwarded-Proto / X-Forwarded-Host behind a proxy).
  publicUrl: (process.env.PUBLIC_URL ?? "").replace(/\/$/, ""),
  // Access-token lifetime for the MCP OAuth flow (seconds).
  oauthTokenTtlSec: Number(process.env.OAUTH_TOKEN_TTL_SEC ?? 3600),
  get githubEnabled(): boolean {
    return Boolean(this.githubToken && this.githubRepo);
  },
  get githubOwner(): string {
    return this.githubRepo.split("/")[0] ?? "";
  },
  get githubName(): string {
    return this.githubRepo.split("/")[1] ?? "";
  },
};
