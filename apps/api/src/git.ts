import { execFile, execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createPatch } from "diff";
import { config } from "./config.js";
import {
  parseFrontmatter,
  promoteOnAccept,
  serializeDoc,
  stampVersion,
  type DiffFile,
  type SearchHit,
} from "@spec/core";

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
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "seed-"));
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
export function pushBranch(branch: string, force = false): void {
  if (!config.githubEnabled) return;
  const refspec = `refs/heads/${branch}:refs/heads/${branch}`;
  const flags = force ? ["--force"] : [];
  git([...authArgs(), "push", "origin", ...flags, refspec], { cwd: config.repoDir });
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
  const email = `${safe}@specification-hub.local`;
  inDir(dir, [...identityArgs(name, email), "commit", "-m", message]);
  pushBranch(branch);
  return { sha: headSha(branch), branch };
}

/**
 * Normalise a doc for review diffing: drop the auto-stamped `version` (it is
 * per-branch and meaningless to compare) and re-serialise the frontmatter so
 * formatting (e.g. inline vs block `tags`) is identical on both sides. So the
 * Review diff shows only meaningful changes — body, status, title, tags values.
 */
function normalizeForDiff(raw: string): string {
  if (!raw) return "";
  try {
    const { frontmatter, content } = parseFrontmatter(raw);
    const fm: Record<string, unknown> = { ...frontmatter };
    delete fm.version;
    return serializeDoc(fm, content);
  } catch {
    return raw;
  }
}

export function diff(base: string, head: string): DiffFile[] {
  fetchRemote();
  if (!branchExists(base)) throw new NotFoundError(`Branch not found: ${base}`);
  if (!branchExists(head)) throw new NotFoundError(`Branch not found: ${head}`);

  // Build the patch from the actual current file contents (normalised), NOT a
  // git range. This (a) compares against the real current `base` so a doc that
  // entered base after the branch forked isn't shown as a brand-new add, and
  // (b) ignores version/formatting noise. The file set comes from
  // changedDocsBetween, which compares by changeKey (version-insensitive).
  const files: DiffFile[] = [];
  for (const file of changedDocsBetween(base, head)) {
    const baseRaw = fileExists(base, file) ? readFile(base, file) : "";
    const headRaw = fileExists(head, file) ? readFile(head, file) : "";
    const a = normalizeForDiff(baseRaw);
    const b = normalizeForDiff(headRaw);
    if (a === b) continue; // only version/formatting differed — nothing to show
    const patch = createPatch(file, a, b, "", "");
    let additions = 0;
    let deletions = 0;
    for (const line of patch.split("\n")) {
      if (line.startsWith("+") && !line.startsWith("+++")) additions++;
      else if (line.startsWith("-") && !line.startsWith("---")) deletions++;
    }
    files.push({
      path: file,
      status: !baseRaw ? "A" : !headRaw ? "D" : "M",
      additions,
      deletions,
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

export interface FileSuggestion {
  branch: string;
  baseContent: string;
  headContent: string;
}

/**
 * Canonical body of a document for change detection — the Markdown body split
 * into trimmed blocks (exactly how the UI's `changesFor` compares them), with
 * frontmatter dropped. Two docs with the same `bodyKey` render as "0 changes",
 * so they must not be reported as proposed changes. This ignores frontmatter-
 * only differences (notably the auto-stamped `version`) and cosmetic whitespace.
 */
function bodyKey(raw: string): string {
  if (!raw) return "";
  let body = raw;
  try {
    body = parseFrontmatter(raw).content;
  } catch {
    /* treat as raw body */
  }
  return body
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean)
    .join("\n\n");
}

/**
 * Like `bodyKey`, but also includes the frontmatter EXCEPT the auto-stamped
 * `version`. So a doc that changed only its status/tags/title (not the body)
 * still counts as a real change — used by the Review diff so such changes show
 * up and can be accepted. Version-only differences still don't count.
 */
function changeKey(raw: string): string {
  let fm = "";
  try {
    const front: Record<string, unknown> = { ...parseFrontmatter(raw).frontmatter };
    delete front.version;
    fm = JSON.stringify(front, Object.keys(front).sort());
  } catch {
    /* no frontmatter */
  }
  return `${fm} ${bodyKey(raw)}`;
}

/** Branches (other than base) whose body of `filePath` differs from base. */
export function suggestionsForFile(filePath: string, base: string): FileSuggestion[] {
  if (!branchExists(base)) throw new NotFoundError(`Branch not found: ${base}`);
  const baseContent = fileExists(base, filePath) ? readFile(base, filePath) : "";
  const baseKey = bodyKey(baseContent);
  const result: FileSuggestion[] = [];
  for (const b of listBranches()) {
    if (b === base) continue;
    if (!fileExists(b, filePath)) continue;
    const headContent = readFile(b, filePath);
    if (bodyKey(headContent) !== baseKey) {
      result.push({ branch: b, baseContent, headContent });
    }
  }
  return result;
}

/** For each docs markdown file, how many non-base branches changed it. */
export function suggestionCounts(base: string): Record<string, number> {
  if (!branchExists(base)) throw new NotFoundError(`Branch not found: ${base}`);
  const counts: Record<string, number> = {};
  for (const b of listBranches()) {
    if (b === base) continue;
    let out: string;
    try {
      out = repo(["diff", "--name-only", `${base}...${b}`]);
    } catch {
      continue;
    }
    for (const line of out.split("\n")) {
      const p = line.trim();
      if (!p.startsWith("docs/") || !p.toLowerCase().endsWith(".md")) continue;
      // Skip files whose body is unchanged (e.g. only the auto-stamped version
      // or cosmetic whitespace differs) — they render as "0 changes".
      const baseC = fileExists(base, p) ? readFile(base, p) : "";
      const headC = fileExists(b, p) ? readFile(b, p) : "";
      if (bodyKey(headC) === bodyKey(baseC)) continue;
      counts[p] = (counts[p] || 0) + 1;
    }
  }
  return counts;
}

/** Docs that meaningfully differ (by body) between `base` and `head` — used for
 *  branch-view change chips, so version-only/whitespace diffs don't show up. */
export function changedDocsBetween(base: string, head: string): string[] {
  if (!branchExists(base)) throw new NotFoundError(`Branch not found: ${base}`);
  if (!branchExists(head)) throw new NotFoundError(`Branch not found: ${head}`);
  let out: string;
  try {
    out = repo(["diff", "--name-only", `${base}...${head}`]);
  } catch {
    return [];
  }
  const paths: string[] = [];
  for (const line of out.split("\n")) {
    const p = line.trim();
    if (!p.startsWith("docs/") || !p.toLowerCase().endsWith(".md")) continue;
    const baseC = fileExists(base, p) ? readFile(base, p) : "";
    const headC = fileExists(head, p) ? readFile(head, p) : "";
    // Body OR status/tags/title differ (version-only/whitespace ignored).
    if (changeKey(headC) !== changeKey(baseC)) paths.push(p);
  }
  return paths;
}

export interface NewDoc {
  path: string;
  title: string;
  status: string;
  branch: string;
}

/** Docs markdown files that exist on some non-base branch but not on `base`
 *  (whole-new documents proposed for addition). First proposing branch wins. */
export function newDocsForBase(base: string): NewDoc[] {
  if (!branchExists(base)) throw new NotFoundError(`Branch not found: ${base}`);
  const seen = new Set<string>();
  const out: NewDoc[] = [];
  for (const b of listBranches()) {
    if (b === base) continue;
    for (const filePath of listMarkdownFiles(b)) {
      if (seen.has(filePath) || fileExists(base, filePath)) continue;
      seen.add(filePath);
      let title = filePath;
      let status = "draft";
      try {
        const { frontmatter } = parseFrontmatter(readFile(b, filePath));
        title = String(frontmatter.title || filePath);
        status = String(frontmatter.status || "draft");
      } catch {
        /* keep defaults */
      }
      out.push({ path: filePath, title, status, branch: b });
    }
  }
  return out;
}

/** Docs that exist in `base` but a branch proposes deleting (removed since fork). */
export function deletedDocsForBase(base: string): { path: string; title: string; branch: string }[] {
  if (!branchExists(base)) throw new NotFoundError(`Branch not found: ${base}`);
  const seen = new Set<string>();
  const out: { path: string; title: string; branch: string }[] = [];
  for (const b of listBranches()) {
    if (b === base) continue;
    let mb = "";
    try {
      mb = repo(["merge-base", base, b]).trim();
    } catch {
      continue;
    }
    if (!mb) continue;
    let names = "";
    try {
      names = repo(["diff", "--diff-filter=D", "--name-only", mb, b]);
    } catch {
      continue;
    }
    for (const line of names.split("\n")) {
      const p = line.trim();
      if (!p.startsWith("docs/") || !p.toLowerCase().endsWith(".md")) continue;
      if (seen.has(p) || !fileExists(base, p)) continue; // already gone from base — skip
      seen.add(p);
      let title = p;
      try {
        title = String(parseFrontmatter(readFile(base, p)).frontmatter.title || p);
      } catch {
        /* keep default */
      }
      out.push({ path: p, title, branch: b });
    }
  }
  return out;
}

/**
 * Full-text search over docs on a branch. The query is split into words and a
 * document matches when it contains ALL of them (case-insensitive, anywhere in
 * the title or body) — so "gait cycle stance swing" matches a doc mentioning
 * those words even when they are not a contiguous phrase.
 */
export function searchDocs(branch: string, query: string, status?: string): SearchHit[] {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  const wantStatus = status?.trim().toLowerCase();
  // Allow filtering by status alone (no query terms) so callers can list e.g.
  // every `request` doc.
  if (terms.length === 0 && !wantStatus) return [];
  const hits: SearchHit[] = [];
  for (const filePath of listMarkdownFiles(branch)) {
    let raw: string;
    try {
      raw = readFile(branch, filePath);
    } catch {
      continue;
    }
    const { frontmatter, content } = parseFrontmatter(raw);
    if (wantStatus && String(frontmatter.status ?? "").toLowerCase() !== wantStatus) continue;
    const title = frontmatter.title ? String(frontmatter.title) : filePath;
    const hay = `${title}\n${content}`;
    const lower = hay.toLowerCase();
    if (!terms.every((t) => lower.includes(t))) continue;
    const positions = terms.map((t) => lower.indexOf(t)).filter((i) => i >= 0);
    const idx = positions.length ? Math.min(...positions) : 0;
    const start = Math.max(0, idx - 40);
    const body = hay.slice(start, idx + 120).replace(/\s+/g, " ").trim();
    hits.push({ path: filePath, title, snippet: (start > 0 ? "…" : "") + body + "…" });
  }
  return hits;
}

/** Commit arbitrary `content` for `filePath` directly onto `base` (+push). This is
 *  the reviewer action of accepting a specific (possibly edited) change into main. */
export function applyContentToBase(
  base: string,
  filePath: string,
  content: string,
  message: string,
  author: string,
): CommitResult {
  if (!branchExists(base)) throw new NotFoundError(`Branch not found: ${base}`);
  const dir = ensureWorktree(base);
  inDir(dir, ["checkout", base]);
  inDir(dir, ["reset", "--hard", base]);
  const abs = path.join(dir, filePath);
  if (!abs.startsWith(dir)) throw new GitError("Invalid path");
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, content, "utf8");
  inDir(dir, ["add", "--", filePath]);
  if (!inDir(dir, ["status", "--porcelain"]).trim()) {
    throw new GitError("No change to apply — base already has this content");
  }
  const name = author || config.gitAuthorName;
  const safe = name.replace(/[^a-zA-Z0-9._-]+/g, "-").toLowerCase() || "author";
  inDir(dir, [...identityArgs(name, `${safe}@specification-hub.local`), "commit", "-m", message]);
  pushBranch(base);
  return { sha: headSha(base), branch: base };
}

/** Write (and optionally delete) several files onto `base` in one commit (+push). */
export function applyContentsToBase(
  base: string,
  files: { path: string; content: string }[],
  message: string,
  author: string,
  deletes: string[] = [],
): CommitResult {
  if (!branchExists(base)) throw new NotFoundError(`Branch not found: ${base}`);
  const dir = ensureWorktree(base);
  inDir(dir, ["checkout", base]);
  inDir(dir, ["reset", "--hard", base]);
  for (const f of files) {
    const abs = path.join(dir, f.path);
    if (!abs.startsWith(dir)) throw new GitError("Invalid path");
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, f.content, "utf8");
    inDir(dir, ["add", "--", f.path]);
  }
  for (const d of deletes) {
    const abs = path.join(dir, d);
    if (!abs.startsWith(dir)) throw new GitError("Invalid path");
    if (fs.existsSync(abs)) inDir(dir, ["rm", "-f", "--", d]);
  }
  if (!inDir(dir, ["status", "--porcelain"]).trim()) {
    throw new GitError("No changes to apply — base already has this content");
  }
  const name = author || config.gitAuthorName;
  const safe = name.replace(/[^a-zA-Z0-9._-]+/g, "-").toLowerCase() || "author";
  inDir(dir, [...identityArgs(name, `${safe}@specification-hub.local`), "commit", "-m", message]);
  pushBranch(base);
  return { sha: headSha(base), branch: base };
}

/**
 * Accept ALL of a branch's meaningful doc changes into `base` in ONE commit:
 * each changed doc is taken from `head` (so status/tags come along), its
 * version re-stamped, and written to base. This applies the content directly
 * and does NOT go through the branch's pull request — so it works even when
 * individual changes were already accepted and the PR has diverged/conflicts.
 */
export function acceptBranchIntoBase(
  base: string,
  head: string,
  message: string,
  author: string,
): CommitResult & { count: number } {
  if (!branchExists(base)) throw new NotFoundError(`Branch not found: ${base}`);
  if (!branchExists(head)) throw new NotFoundError(`Branch not found: ${head}`);
  const paths = changedDocsBetween(base, head);
  if (paths.length === 0) throw new GitError("No changes to accept");
  const preContent: Record<string, string> = {};
  for (const p of paths) preContent[p] = fileExists(base, p) ? readFile(base, p) : "";
  const files: { path: string; content: string }[] = [];
  const deletes: string[] = [];
  for (const p of paths) {
    if (!fileExists(head, p)) {
      deletes.push(p); // removed on the branch → delete from base
      continue;
    }
    const { frontmatter, content } = parseFrontmatter(readFile(head, p));
    files.push({
      path: p,
      content: serializeDoc(
        { ...frontmatter, version: stampVersion(), status: promoteOnAccept(frontmatter.status) },
        content,
      ),
    });
  }
  const res = applyContentsToBase(base, files, message, author, deletes);
  propagateAcceptToBranches(base, paths, preContent, head, author);
  return { ...res, count: files.length + deletes.length };
}

/**
 * After content is accepted into `base`, bring branches into line with it:
 *  - the source branch (whose change was just accepted) adopts base's version,
 *    so it no longer shows a lingering diff (e.g. it stays `review` while base
 *    became `stable`);
 *  - any OTHER branch that still carries the pre-accept base copy of a file
 *    (i.e. it never modified it) is fast-forwarded to the new base content;
 *  - branches that made their OWN changes to a file are left untouched, so the
 *    divergence stays visible for separate review.
 * `preContent` is base's content per path captured BEFORE the accept commit.
 * Best-effort: a branch that can't be updated cleanly is skipped.
 */
export function propagateAcceptToBranches(
  base: string,
  paths: string[],
  preContent: Record<string, string>,
  sourceBranch: string | null,
  author: string,
): string[] {
  const newContent: Record<string, string> = {};
  const deletedInBase: Record<string, boolean> = {};
  for (const p of paths) {
    const exists = fileExists(base, p);
    deletedInBase[p] = !exists;
    newContent[p] = exists ? readFile(base, p) : "";
  }
  const updated: string[] = [];
  for (const b of listBranches()) {
    if (b === base) continue;
    let changed = false;
    for (const p of paths) {
      if (!fileExists(b, p)) continue; // branch never had this file — nothing to do
      const bc = readFile(b, p);
      const tracksOldBase = changeKey(bc) === changeKey(preContent[p] ?? "");
      const adopt = b === sourceBranch || tracksOldBase;
      if (!adopt) continue; // branch has its own divergent edit — leave for review
      if (deletedInBase[p]) {
        deleteFileFromBranch(b, p); // base removed it → remove here too
        changed = true;
      } else if (changeKey(bc) !== changeKey(newContent[p])) {
        writeFileToBranch(b, p, newContent[p]);
        changed = true;
      }
    }
    if (changed) {
      try {
        commit(b, `Sync ${base} into ${b}`, author);
        updated.push(b);
      } catch {
        /* nothing to commit / conflict — best effort, leave the branch as-is */
      }
    }
  }
  return updated;
}

export interface BranchSyncStatus {
  branch: string;
  base: string;
  upToDate: boolean;
  ahead: number; // commits on the branch not in base
  behind: number; // commits on base not in the branch
  staleFiles: string[]; // docs changed on base that this branch hasn't (should pull)
  conflictFiles: string[]; // docs changed on BOTH base and the branch (need a decision)
}

/**
 * How a branch stands relative to `base` (main). `staleFiles` are docs base
 * advanced that the branch never touched (safe to pull); `conflictFiles` were
 * changed on both sides and currently differ (a real decision). Both lists are
 * content-based (changeKey, version-insensitive), so auto-synced files don't
 * show up as false positives.
 */
export function branchSyncStatus(branch: string, base: string): BranchSyncStatus {
  fetchRemote();
  if (!branchExists(base)) throw new NotFoundError(`Branch not found: ${base}`);
  if (!branchExists(branch)) throw new NotFoundError(`Branch not found: ${branch}`);
  if (branch === base) {
    return { branch, base, upToDate: true, ahead: 0, behind: 0, staleFiles: [], conflictFiles: [] };
  }
  let mb = "";
  try {
    mb = repo(["merge-base", base, branch]).trim();
  } catch {
    mb = "";
  }
  const count = (range: string) => {
    try {
      return Number(repo(["rev-list", "--count", range]).trim()) || 0;
    } catch {
      return 0;
    }
  };
  const docs = (out: string) =>
    out
      .split("\n")
      .map((s) => s.trim())
      .filter((p) => p.startsWith("docs/") && p.toLowerCase().endsWith(".md"));
  const baseChanged = mb ? docs(repo(["diff", "--name-only", mb, base])) : [];
  const branchChanged = new Set(mb ? docs(repo(["diff", "--name-only", mb, branch])) : []);
  const differsNow = (p: string) => {
    const b = fileExists(base, p) ? readFile(base, p) : "";
    const h = fileExists(branch, p) ? readFile(branch, p) : "";
    return changeKey(b) !== changeKey(h);
  };
  const staleFiles = baseChanged.filter((p) => !branchChanged.has(p) && differsNow(p));
  const conflictFiles = baseChanged.filter((p) => branchChanged.has(p) && differsNow(p));
  return {
    branch,
    base,
    ahead: count(`${base}..${branch}`),
    behind: count(`${branch}..${base}`),
    staleFiles,
    conflictFiles,
    upToDate: staleFiles.length === 0 && conflictFiles.length === 0,
  };
}

export type SyncStrategy = "merge" | "prefer-main" | "prefer-mine" | "reset";

/**
 * Bring `base` (main) into `branch`, git-style:
 *  - "merge"        — merge base in; on conflict, abort and report the files;
 *  - "prefer-main"  — merge, base wins conflicts (-X theirs);
 *  - "prefer-mine"  — merge, the branch wins conflicts (-X ours);
 *  - "reset"        — hard-reset the branch to base, discarding its own changes.
 * Returns whether it merged and any conflicting files (for "merge").
 */
export function updateBranchFromBase(
  branch: string,
  base: string,
  strategy: SyncStrategy,
  author: string,
): { strategy: SyncStrategy; merged: boolean; conflicts: string[] } {
  if (!branchExists(base)) throw new NotFoundError(`Branch not found: ${base}`);
  if (!branchExists(branch)) throw new NotFoundError(`Branch not found: ${branch}`);
  if (branch === base) throw new GitError("Cannot sync the base branch into itself");
  const dir = ensureWorktree(branch);
  inDir(dir, ["checkout", branch]);
  inDir(dir, ["reset", "--hard", branch]);
  inDir(dir, ["clean", "-fd"]);

  if (strategy === "reset") {
    inDir(dir, ["reset", "--hard", base]);
    pushBranch(branch, true);
    return { strategy, merged: true, conflicts: [] };
  }

  const name = author || config.gitAuthorName;
  const safe = name.replace(/[^a-zA-Z0-9._-]+/g, "-").toLowerCase() || "author";
  // `no-renames`: never treat a delete + a similar file elsewhere as a rename.
  // Docs share basenames across folders (docs/00-overview vs docs/agls/00-overview),
  // so rename detection would otherwise carry one file's edits — or a deleted
  // stub's body — into an unrelated same-named file. Each path stays itself.
  const args = [...identityArgs(name, `${safe}@specification-hub.local`), "merge", "--no-edit", "-X", "no-renames"];
  if (strategy === "prefer-main") args.push("-X", "theirs");
  else if (strategy === "prefer-mine") args.push("-X", "ours");
  args.push(base);
  try {
    inDir(dir, args);
  } catch {
    let conflicts: string[] = [];
    try {
      conflicts = inDir(dir, ["diff", "--name-only", "--diff-filter=U"])
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
    } catch {
      /* ignore */
    }
    try {
      inDir(dir, ["merge", "--abort"]);
    } catch {
      /* ignore */
    }
    return { strategy, merged: false, conflicts };
  }
  pushBranch(branch);
  return { strategy, merged: true, conflicts: [] };
}
