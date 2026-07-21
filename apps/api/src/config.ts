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
  docsSeedDir: envPath("DOCS_SEED", path.join(repoRoot, "docs")),
  webDist: envPath("WEB_DIST", path.join(repoRoot, "apps/web/dist")),
  defaultBranch: process.env.DEFAULT_BRANCH ?? "main",
  // Default brand/title — only a fallback for the bootstrap/unconfigured state.
  // Each site sets its own brand in the app (Settings → bindings); not from env.
  brandName: "Specification Hub",
  // Build/deploy version (set by CI via the BUILD_VERSION build-arg → env);
  // "dev" for local runs. Shown in the UI so a successful deploy is visible.
  buildVersion: process.env.BUILD_VERSION ?? "dev",
  // Public scheme for building absolute URLs (OAuth issuer/endpoints, MCP
  // resource). Behind Cloudflare/Traefik the origin leg is plain http and the
  // forwarded-proto header can't be trusted, so we default a real domain to
  // https and only localhost/dev to http. Set PUBLIC_PROTO=http|https to force it.
  publicProto: (process.env.PUBLIC_PROTO ?? "").trim().toLowerCase(),
  adminUsername: process.env.ADMIN_USERNAME ?? "admin",
  adminPassword: process.env.ADMIN_PASSWORD ?? "",
  sessionTtlHours: Number(process.env.SESSION_TTL_HOURS ?? 168),
  adminPasswordFile: path.join(dataDir, "admin-password.txt"),
  gitAuthorName: "Specification Hub",
  gitAuthorEmail: "hub@specification-hub.local",

  // ---- GitHub integration ----
  // A single shared token (env). Which repository each domain uses is set per
  // site in the app (Settings), not via env. With a token + a site's repo,
  // GitHub is that site's source of truth (commits pushed on accept).
  githubToken: process.env.GITHUB_TOKEN ?? "",
  githubApi: (process.env.GITHUB_API ?? "https://api.github.com").replace(/\/$/, ""),
  githubServer: (process.env.GITHUB_SERVER ?? "https://github.com").replace(/\/$/, ""),
  // Minimum gap between background `git fetch` syncs triggered by reads.
  syncIntervalMs: Number(process.env.SYNC_INTERVAL_MS ?? 10000),
  mcpEnabled: (process.env.MCP_ENABLED ?? "true") !== "false",
  // Access-token lifetime for the MCP OAuth flow (seconds).
  oauthTokenTtlSec: Number(process.env.OAUTH_TOKEN_TTL_SEC ?? 3600),
};
