import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
// Works for both src (apps/api/src) and bundled dist (apps/api/dist) — both 3 levels under root.
const repoRoot = path.resolve(here, "../../..");

function envPath(name: string, fallback: string): string {
  const v = process.env[name];
  return v ? path.resolve(v) : fallback;
}

const dataDir = envPath("HLS_DATA_DIR", path.join(repoRoot, "data"));

export const config = {
  port: Number(process.env.PORT ?? 8080),
  repoRoot,
  dataDir,
  repoDir: path.join(dataDir, "repo.git"),
  worktreesDir: path.join(dataDir, "worktrees"),
  dbPath: path.join(dataDir, "hls.db"),
  adminTokenFile: path.join(dataDir, "admin-token.txt"),
  docsSeedDir: envPath("HLS_DOCS_SEED", path.join(repoRoot, "docs")),
  webDist: envPath("HLS_WEB_DIST", path.join(repoRoot, "apps/web/dist")),
  defaultBranch: process.env.HLS_DEFAULT_BRANCH ?? "main",
  adminTokenEnv: process.env.HLS_ADMIN_TOKEN ?? "",
  adminUsername: process.env.HLS_ADMIN_USERNAME ?? "admin",
  adminPassword: process.env.HLS_ADMIN_PASSWORD ?? "",
  sessionTtlHours: Number(process.env.HLS_SESSION_TTL_HOURS ?? 168),
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
