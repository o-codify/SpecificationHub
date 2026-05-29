import { execFile, execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { config } from "./config.js";
import type { DiffFile } from "@hls/core";

export class GitError extends Error {
  detail: string;
  constructor(message: string, detail = "") {
    super(message);
    this.name = "GitError";
    this.detail = detail;
  }
}

export class NotFoundError extends GitError {
  constructor(message: string) {
    super(message);
    this.name = "NotFoundError";
  }
}

export class MergeConflictError extends GitError {
  constructor(message: string, detail = "") {
    super(message, detail);
    this.name = "MergeConflictError";
  }
}

function git(args: string[], opts: { cwd?: string } = {}): string {
  try {
    return execFileSync("git", args, {
      cwd: opts.cwd,
      encoding: "utf8",
      maxBuffer: 128 * 1024 * 1024,
    });
  } catch (err) {
    const e = err as { stderr?: Buffer | string; stdout?: Buffer | string; message?: string };
    const stderr = e.stderr ? e.stderr.toString() : "";
    const stdout = e.stdout ? e.stdout.toString() : "";
    throw new GitError(`git ${args.join(" ")} failed: ${stderr || stdout || e.message}`, stderr || stdout);
  }
}

const repo = (args: string[]) => git(args, { cwd: config.repoDir });
const inDir = (dir: string, args: string[]) => git(args, { cwd: dir });

function identityArgs(name: string, email: string): string[] {
  return ["-c", `user.name=${name}`, "-c", `user.email=${email}`];
}

/** Per-command auth header for GitHub network ops (keeps the token out of repo config). */
function authArgs(): string[] {
  if (!config.githubToken) return [];
  const b64 = Buffer.from(`x-access-token:${config.githubToken}`).toString("base64");
  return ["-c", `http.extraHeader=Authorization: Basic ${b64}`];
}

function githubRemoteUrl(): string {
  return `${config.githubServer}/${config.githubRepo}.git`;
}

/** Build the initial commit (from seed docs) into the local bare repo's default branch. */
function seedInitialCommit(): void {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "hls-seed-"));
  try {
    git(["init", "-b", config.defaultBranch, tmp]);
    const destDocs = path.join(tmp, "docs");
    if (fs.existsSync(config.docsSeedDir)) {
      fs.cpSync(config.docsSeedDir, destDocs, { recursive: true });
    } else {
      fs.mkdirSync(destDocs, { recursive: true });
    }
    inDir(tmp, ["add", "-A"]);
    // --allow-empty so boot succeeds even when no seed docs are present
    // (e.g. the GitHub-only image bundles no docs).
    inDir(tmp, [
      ...identityArgs(config.gitAuthorName, config.gitAuthorEmail),
      "commit",
      "--allow-empty",
      "-m",
      "Initial documentation",
    ]);
    inDir(tmp, ["remote", "add", "origin", config.repoDir]);
    inDir(tmp, ["push", "origin", config.defaultBranch]);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

export function ensureRepo(): void {
  if (fs.existsSync(path.join(config.repoDir, "HEAD"))) {
    if (config.githubEnabled) fetchRemote(true);
    return;
  }
  fs.mkdirSync(config.dataDir, { recursive: true });

  if (config.githubEnabled) {
    // GitHub is the source of truth: clone it (token kept out of stored config).
    git([...authArgs(), "clone", "--bare", githubRemoteUrl(), config.repoDir]);
    git(["config", "remote.origin.fetch", "+refs/heads/*:refs/heads/*"], {
      cwd: config.repoDir,
    });
    if (listBranches().length === 0) {
      // Empty GitHub repo — seed it and push the default branch up.
      seedInitialCommit();
      pushBranch(config.defaultBranch);
    }
    return;
  }

  // Local-only mode: self-contained bare repo seeded from docs/.
  git(["init", "--bare", "-b", config.defaultBranch, config.repoDir]);
  seedInitialCommit();
}

/** Default branch as recorded by the repo's HEAD (e.g. main or master). */
export function currentDefaultBranch(): string {
  try {
    return git(["symbolic-ref", "--short", "HEAD"], { cwd: config.repoDir }).trim() ||
      config.defaultBranch;
  } catch {
    return config.defaultBranch;
  }
}

/** Push a single branch to GitHub (no-op in local mode). */
export function pushBranch(branch: string): void {
  if (!config.githubEnabled) return;
  git([...authArgs(), "push", "origin", `refs/heads/${branch}:refs/heads/${branch}`], {
    cwd: config.repoDir,
  });
}

let lastFetch = 0;
let fetchInFlight = false;

/**
 * Pull remote branch refs so external GitHub changes are reflected.
 * - Reads (force=false): a throttled, **non-blocking** background fetch with an
 *   in-flight guard, so request latency and the event loop are never tied to the
 *   network and concurrent reads can't spawn overlapping fetches.
 * - force=true (e.g. right after a merge): a synchronous fetch so the next read
 *   is guaranteed to reflect the new state.
 * Always non-fatal — network hiccups must not break reads.
 */
export function fetchRemote(force = false): void {
  if (!config.githubEnabled) return;

  if (force) {
    lastFetch = Date.now();
    try {
      git([...authArgs(), "fetch", "origin"], { cwd: config.repoDir });
    } catch {
      /* ignore */
    }
    return;
  }

  const now = Date.now();
  if (fetchInFlight || now - lastFetch < config.syncIntervalMs) return;
  lastFetch = now;
  fetchInFlight = true;
  execFile(
    "git",
    [...authArgs(), "fetch", "origin"],
    { cwd: config.repoDir, maxBuffer: 128 * 1024 * 1024 },
    () => {
      fetchInFlight = false;
    },
  );
}

export function listBranches(): string[] {
  fetchRemote();
  const out = repo(["for-each-ref", "--format=%(refname:short)", "refs/heads"]);
  return out
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean)
    .sort();
}

export function branchExists(name: string): boolean {
  try {
    repo(["show-ref", "--verify", "--quiet", `refs/heads/${name}`]);
    return true;
  } catch {
    return false;
  }
}

export function createBranch(name: string, from: string): void {
  if (branchExists(name)) {
    throw new GitError(`Branch already exists: ${name}`);
  }
  if (!branchExists(from)) {
    throw new NotFoundError(`Source branch not found: ${from}`);
  }
  repo(["branch", name, from]);
  pushBranch(name);
}

export function deleteBranch(name: string): void {
  if (name === config.defaultBranch) {
    throw new GitError(`Cannot delete the default branch (${name})`);
  }
  if (!branchExists(name)) {
    throw new NotFoundError(`Branch not found: ${name}`);
  }
  const dir = worktreeDir(name);
  if (fs.existsSync(dir)) {
    try {
      repo(["worktree", "remove", "--force", dir]);
    } catch {
      fs.rmSync(dir, { recursive: true, force: true });
    }
    repo(["worktree", "prune"]);
  }
  repo(["branch", "-D", name]);
  if (config.githubEnabled) {
    try {
      git([...authArgs(), "push", "origin", "--delete", name], { cwd: config.repoDir });
    } catch {
      /* remote branch may already be gone */
    }
  }
}

export function headSha(branch: string): string {
  return repo(["rev-parse", branch]).trim();
}

export function listMarkdownFiles(branch: string): string[] {
  fetchRemote();
  if (!branchExists(branch)) {
    throw new NotFoundError(`Branch not found: ${branch}`);
  }
  const out = repo(["ls-tree", "-r", "--name-only", branch]);
  return out
    .split("\n")
    .map((s) => s.trim())
    .filter((p) => p.startsWith("docs/") && p.toLowerCase().endsWith(".md"))
    .sort();
}

export function fileExists(branch: string, filePath: string): boolean {
  try {
    repo(["cat-file", "-e", `${branch}:${filePath}`]);
    return true;
  } catch {
    return false;
  }
}

export function readFile(branch: string, filePath: string): string {
  if (!branchExists(branch)) {
    throw new NotFoundError(`Branch not found: ${branch}`);
  }
  if (!fileExists(branch, filePath)) {
    throw new NotFoundError(`File not found: ${filePath} on ${branch}`);
  }
  return repo(["show", `${branch}:${filePath}`]);
}

function worktreeDir(branch: string): string {
  return path.join(config.worktreesDir, branch.replace(/[/\\]/g, "__"));
}

function ensureWorktree(branch: string): string {
  if (!branchExists(branch)) {
    throw new NotFoundError(`Branch not found: ${branch}`);
  }
  const dir = worktreeDir(branch);
  if (fs.existsSync(path.join(dir, ".git"))) {
    return dir;
  }
  fs.mkdirSync(config.worktreesDir, { recursive: true });
  repo(["worktree", "prune"]);
  // Remove a stale dir without git metadata if present.
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
  repo(["worktree", "add", "--force", dir, branch]);
  return dir;
}

export function writeFileToBranch(branch: string, filePath: string, content: string): void {
  const dir = ensureWorktree(branch);
  const abs = path.join(dir, filePath);
  if (!abs.startsWith(dir)) {
    throw new GitError("Invalid path");
  }
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, content, "utf8");
  inDir(dir, ["add", "--", filePath]);
}

export function deleteFileFromBranch(branch: string, filePath: string): void {
  const dir = ensureWorktree(branch);
  if (!fileExists(branch, filePath) && !fs.existsSync(path.join(dir, filePath))) {
    throw new NotFoundError(`File not found: ${filePath} on ${branch}`);
  }
  inDir(dir, ["rm", "-f", "--", filePath]);
}

export interface CommitResult {
  sha: string;
  branch: string;
}

export function hasStagedOrPendingChanges(branch: string): boolean {
  const dir = ensureWorktree(branch);
  return inDir(dir, ["status", "--porcelain"]).trim().length > 0;
}

export function commit(branch: string, message: string, author: string): CommitResult {
  const dir = ensureWorktree(branch);
  const status = inDir(dir, ["status", "--porcelain"]).trim();
  if (!status) {
    throw new GitError("Nothing to commit");
  }
  inDir(dir, ["add", "-A"]);
  const name = author || config.gitAuthorName;
  const safe = name.replace(/[^a-zA-Z0-9._-]+/g, "-").toLowerCase() || "author";
  const email = `${safe}@hls.local`;
  inDir(dir, [...identityArgs(name, email), "commit", "-m", message]);
  pushBranch(branch);
  return { sha: headSha(branch), branch };
}

function parseNumstat(text: string): Map<string, { additions: number; deletions: number }> {
  const map = new Map<string, { additions: number; deletions: number }>();
  for (const line of text.split("\n")) {
    if (!line.trim()) continue;
    const parts = line.split("\t");
    if (parts.length < 3) continue;
    const additions = parts[0] === "-" ? 0 : Number(parts[0]);
    const deletions = parts[1] === "-" ? 0 : Number(parts[1]);
    const file = parts[parts.length - 1];
    map.set(file, { additions, deletions });
  }
  return map;
}

export function diff(base: string, head: string): DiffFile[] {
  fetchRemote();
  if (!branchExists(base)) throw new NotFoundError(`Branch not found: ${base}`);
  if (!branchExists(head)) throw new NotFoundError(`Branch not found: ${head}`);

  const range = `${base}...${head}`;
  const nameStatus = repo(["diff", "--name-status", range]);
  const numstat = parseNumstat(repo(["diff", "--numstat", range]));

  const files: DiffFile[] = [];
  for (const line of nameStatus.split("\n")) {
    if (!line.trim()) continue;
    const parts = line.split("\t");
    const status = parts[0];
    const file = parts[parts.length - 1];
    const counts = numstat.get(file) ?? { additions: 0, deletions: 0 };
    const patch = repo(["diff", range, "--", file]);
    files.push({
      path: file,
      status: status[0],
      additions: counts.additions,
      deletions: counts.deletions,
      patch,
    });
  }
  return files;
}

export function merge(base: string, head: string, message: string): CommitResult {
  if (!branchExists(base)) throw new NotFoundError(`Branch not found: ${base}`);
  if (!branchExists(head)) throw new NotFoundError(`Branch not found: ${head}`);

  const dir = ensureWorktree(base);
  inDir(dir, ["checkout", base]);
  inDir(dir, ["reset", "--hard", base]);
  try {
    inDir(dir, [
      ...identityArgs(config.gitAuthorName, config.gitAuthorEmail),
      "merge",
      "--no-ff",
      "-m",
      message,
      head,
    ]);
  } catch (err) {
    try {
      inDir(dir, ["merge", "--abort"]);
    } catch {
      /* ignore */
    }
    const detail = err instanceof GitError ? err.detail : String(err);
    throw new MergeConflictError(`Merge conflict between ${base} and ${head}`, detail);
  }
  return { sha: headSha(base), branch: base };
}
