import { execFile, execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createPatch } from "diff";
import { config } from "./config.js";
import type { SiteContext } from "./site.js";
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

export interface CommitResult {
  sha: string;
  branch: string;
}

export interface FileSuggestion {
  branch: string;
  baseContent: string;
  headContent: string;
}

export interface NewDoc {
  path: string;
  title: string;
  status: string;
  branch: string;
}

export interface BranchSyncStatus {
  branch: string;
  base: string;
  upToDate: boolean; // no DOC differs in content (commits are irrelevant)
  staleFiles: string[]; // docs base has a newer version of that this branch hasn't
  conflictFiles: string[]; // docs whose content changed on BOTH base and the branch
}

export type SyncStrategy = "merge" | "prefer-main" | "prefer-mine" | "reset";

// Per-repo `git fetch` throttling state, keyed by repo dir (a SiteRepo is created
// per request, so this can't live on the instance).
const fetchState = new Map<string, { lastFetch: number; inFlight: boolean }>();

/**
 * All git operations for ONE site (one bare repo + its worktrees). A new instance
 * is cheap; construct it per request from the resolved SiteContext via repoFor().
 */
export class SiteRepo {
  constructor(readonly site: SiteContext) {}

  // ---- low-level ----
  private repo(args: string[]): string {
    return git(args, { cwd: this.site.repoDir });
  }

  /** Like repo(), but returns raw bytes — for binary blobs such as images. */
  private repoBuf(args: string[]): Buffer {
    try {
      return execFileSync("git", args, { cwd: this.site.repoDir, maxBuffer: 256 * 1024 * 1024 });
    } catch (err) {
      const e = err as { stderr?: Buffer | string; message?: string };
      const stderr = e.stderr ? e.stderr.toString() : "";
      throw new GitError(`git ${args.join(" ")} failed: ${stderr || e.message}`, stderr);
    }
  }

  get githubEnabled(): boolean {
    return Boolean(config.githubToken && this.site.githubRepo);
  }

  private githubRemoteUrl(): string {
    return `${config.githubServer}/${this.site.githubRepo}.git`;
  }

  private worktreeDir(branch: string): string {
    return path.join(this.site.worktreesDir, branch.replace(/[/\\]/g, "__"));
  }

  // ---- repo lifecycle ----
  /** Build the initial commit (from seed docs) into the bare repo's default branch. */
  private seedInitialCommit(): void {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "seed-"));
    try {
      git(["init", "-b", this.site.defaultBranch, tmp]);
      const destDocs = path.join(tmp, "docs");
      // Only the legacy/single-tenant site seeds the bundled sample docs; freshly
      // bound multi-tenant sites start empty (their content lives in their repo).
      if (this.site.legacy && fs.existsSync(config.docsSeedDir)) {
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
      inDir(tmp, ["remote", "add", "origin", this.site.repoDir]);
      inDir(tmp, ["push", "origin", this.site.defaultBranch]);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  }

  /** Ensure the bare repo exists (clone from GitHub or init+seed locally). */
  ensure(): void {
    if (fs.existsSync(path.join(this.site.repoDir, "HEAD"))) {
      if (this.githubEnabled) this.fetchRemote(true);
      return;
    }
    fs.mkdirSync(path.dirname(this.site.repoDir), { recursive: true });

    if (this.githubEnabled) {
      // GitHub is the source of truth: clone it (token kept out of stored config).
      git([...authArgs(), "clone", "--bare", this.githubRemoteUrl(), this.site.repoDir]);
      git(["config", "remote.origin.fetch", "+refs/heads/*:refs/heads/*"], {
        cwd: this.site.repoDir,
      });
      if (this.listBranchesNoFetch().length === 0) {
        // Empty GitHub repo — seed it and push the default branch up.
        this.seedInitialCommit();
        this.pushBranch(this.site.defaultBranch);
      }
      return;
    }

    // Local-only mode: self-contained bare repo seeded from docs/.
    git(["init", "--bare", "-b", this.site.defaultBranch, this.site.repoDir]);
    this.seedInitialCommit();
  }

  /** Default branch as recorded by the repo's HEAD (e.g. main or master). */
  currentDefaultBranch(): string {
    try {
      return (
        git(["symbolic-ref", "--short", "HEAD"], { cwd: this.site.repoDir }).trim() ||
        this.site.defaultBranch
      );
    } catch {
      return this.site.defaultBranch;
    }
  }

  /** Push a single branch to GitHub (no-op in local mode). */
  pushBranch(branch: string, force = false): void {
    if (!this.githubEnabled) return;
    const refspec = `refs/heads/${branch}:refs/heads/${branch}`;
    const flags = force ? ["--force"] : [];
    git([...authArgs(), "push", "origin", ...flags, refspec], { cwd: this.site.repoDir });
  }

  /**
   * Pull remote branch refs so external GitHub changes are reflected.
   * - Reads (force=false): a throttled, **non-blocking** background fetch with an
   *   in-flight guard, so request latency and the event loop are never tied to the
   *   network and concurrent reads can't spawn overlapping fetches.
   * - force=true (e.g. right after a merge): a synchronous fetch so the next read
   *   is guaranteed to reflect the new state.
   * Always non-fatal — network hiccups must not break reads.
   */
  fetchRemote(force = false): void {
    if (!this.githubEnabled) return;
    const key = this.site.repoDir;
    const st = fetchState.get(key) ?? { lastFetch: 0, inFlight: false };
    fetchState.set(key, st);

    if (force) {
      st.lastFetch = Date.now();
      try {
        git([...authArgs(), "fetch", "origin"], { cwd: this.site.repoDir });
      } catch {
        /* ignore */
      }
      return;
    }

    const now = Date.now();
    if (st.inFlight || now - st.lastFetch < config.syncIntervalMs) return;
    st.lastFetch = now;
    st.inFlight = true;
    execFile(
      "git",
      [...authArgs(), "fetch", "origin"],
      { cwd: this.site.repoDir, maxBuffer: 128 * 1024 * 1024 },
      () => {
        st.inFlight = false;
      },
    );
  }

  // ---- branches ----
  private listBranchesNoFetch(): string[] {
    const out = this.repo(["for-each-ref", "--format=%(refname:short)", "refs/heads"]);
    return out
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean)
      .sort();
  }

  listBranches(): string[] {
    this.fetchRemote();
    return this.listBranchesNoFetch();
  }

  branchExists(name: string): boolean {
    try {
      this.repo(["show-ref", "--verify", "--quiet", `refs/heads/${name}`]);
      return true;
    } catch {
      return false;
    }
  }

  createBranch(name: string, from: string): void {
    if (this.branchExists(name)) {
      throw new GitError(`Branch already exists: ${name}`);
    }
    if (!this.branchExists(from)) {
      throw new NotFoundError(`Source branch not found: ${from}`);
    }
    this.repo(["branch", name, from]);
    this.pushBranch(name);
  }

  deleteBranch(name: string): void {
    if (name === this.site.defaultBranch) {
      throw new GitError(`Cannot delete the default branch (${name})`);
    }
    if (!this.branchExists(name)) {
      throw new NotFoundError(`Branch not found: ${name}`);
    }
    const dir = this.worktreeDir(name);
    if (fs.existsSync(dir)) {
      try {
        this.repo(["worktree", "remove", "--force", dir]);
      } catch {
        fs.rmSync(dir, { recursive: true, force: true });
      }
      this.repo(["worktree", "prune"]);
    }
    this.repo(["branch", "-D", name]);
    if (this.githubEnabled) {
      try {
        git([...authArgs(), "push", "origin", "--delete", name], { cwd: this.site.repoDir });
      } catch {
        /* remote branch may already be gone */
      }
    }
  }

  headSha(branch: string): string {
    return this.repo(["rev-parse", branch]).trim();
  }

  // ---- files ----
  listMarkdownFiles(branch: string): string[] {
    this.fetchRemote();
    if (!this.branchExists(branch)) {
      throw new NotFoundError(`Branch not found: ${branch}`);
    }
    const out = this.repo(["ls-tree", "-r", "--name-only", branch]);
    return out
      .split("\n")
      .map((s) => s.trim())
      .filter((p) => p.startsWith("docs/") && p.toLowerCase().endsWith(".md"))
      .sort();
  }

  fileExists(branch: string, filePath: string): boolean {
    try {
      this.repo(["cat-file", "-e", `${branch}:${filePath}`]);
      return true;
    } catch {
      return false;
    }
  }

  readFile(branch: string, filePath: string): string {
    if (!this.branchExists(branch)) {
      throw new NotFoundError(`Branch not found: ${branch}`);
    }
    if (!this.fileExists(branch, filePath)) {
      throw new NotFoundError(`File not found: ${filePath} on ${branch}`);
    }
    return this.repo(["show", `${branch}:${filePath}`]);
  }

  private ensureWorktree(branch: string): string {
    if (!this.branchExists(branch)) {
      throw new NotFoundError(`Branch not found: ${branch}`);
    }
    const dir = this.worktreeDir(branch);
    if (fs.existsSync(path.join(dir, ".git"))) {
      return dir;
    }
    fs.mkdirSync(this.site.worktreesDir, { recursive: true });
    this.repo(["worktree", "prune"]);
    // Remove a stale dir without git metadata if present.
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
    this.repo(["worktree", "add", "--force", dir, branch]);
    return dir;
  }

  writeFileToBranch(branch: string, filePath: string, content: string): void {
    const dir = this.ensureWorktree(branch);
    const abs = path.join(dir, filePath);
    if (!abs.startsWith(dir)) {
      throw new GitError("Invalid path");
    }
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, content, "utf8");
    inDir(dir, ["add", "--", filePath]);
  }

  /** Stage a binary file (e.g. an uploaded image) on a branch's worktree. */
  writeBinaryToBranch(branch: string, filePath: string, buf: Buffer): void {
    const dir = this.ensureWorktree(branch);
    const abs = path.join(dir, filePath);
    if (!abs.startsWith(dir)) {
      throw new GitError("Invalid path");
    }
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, buf);
    inDir(dir, ["add", "--", filePath]);
  }

  /**
   * Store an image as a content-addressed blob (assets/<sha>.<ext>) on a branch,
   * committing (and pushing) it. Idempotent — identical bytes reuse the same path.
   * Returns the repo-relative path to reference from Markdown.
   */
  addImage(branch: string, buf: Buffer, ext: string, author: string): string {
    const hash = crypto.createHash("sha256").update(buf).digest("hex").slice(0, 16);
    const repoPath = `assets/${hash}.${ext}`;
    if (!this.fileExists(branch, repoPath)) {
      this.writeBinaryToBranch(branch, repoPath, buf);
      this.commit(branch, `Add image ${repoPath}`, author);
    }
    return repoPath;
  }

  /** Read a file's raw bytes from a branch (for serving images, etc.). */
  readBinary(branch: string, filePath: string): Buffer {
    if (!this.branchExists(branch)) {
      throw new NotFoundError(`Branch not found: ${branch}`);
    }
    if (!this.fileExists(branch, filePath)) {
      throw new NotFoundError(`File not found: ${filePath} on ${branch}`);
    }
    return this.repoBuf(["show", `${branch}:${filePath}`]);
  }

  deleteFileFromBranch(branch: string, filePath: string): void {
    const dir = this.ensureWorktree(branch);
    if (!this.fileExists(branch, filePath) && !fs.existsSync(path.join(dir, filePath))) {
      throw new NotFoundError(`File not found: ${filePath} on ${branch}`);
    }
    inDir(dir, ["rm", "-f", "--", filePath]);
  }

  hasStagedOrPendingChanges(branch: string): boolean {
    const dir = this.ensureWorktree(branch);
    return inDir(dir, ["status", "--porcelain"]).trim().length > 0;
  }

  commit(branch: string, message: string, author: string): CommitResult {
    const dir = this.ensureWorktree(branch);
    const status = inDir(dir, ["status", "--porcelain"]).trim();
    if (!status) {
      throw new GitError("Nothing to commit");
    }
    inDir(dir, ["add", "-A"]);
    const name = author || config.gitAuthorName;
    const safe = name.replace(/[^a-zA-Z0-9._-]+/g, "-").toLowerCase() || "author";
    const email = `${safe}@specification-hub.local`;
    inDir(dir, [...identityArgs(name, email), "commit", "-m", message]);
    this.pushBranch(branch);
    return { sha: this.headSha(branch), branch };
  }

  // ---- diff / change detection ----
  diff(base: string, head: string): DiffFile[] {
    this.fetchRemote();
    if (!this.branchExists(base)) throw new NotFoundError(`Branch not found: ${base}`);
    if (!this.branchExists(head)) throw new NotFoundError(`Branch not found: ${head}`);

    // Build the patch from the actual current file contents (normalised), NOT a
    // git range. This (a) compares against the real current `base` so a doc that
    // entered base after the branch forked isn't shown as a brand-new add, and
    // (b) ignores version/formatting noise. The file set comes from
    // changedDocsBetween, which compares by changeKey (version-insensitive).
    const files: DiffFile[] = [];
    for (const file of this.changedDocsBetween(base, head)) {
      const baseRaw = this.fileExists(base, file) ? this.readFile(base, file) : "";
      const headRaw = this.fileExists(head, file) ? this.readFile(head, file) : "";
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

  merge(base: string, head: string, message: string): CommitResult {
    if (!this.branchExists(base)) throw new NotFoundError(`Branch not found: ${base}`);
    if (!this.branchExists(head)) throw new NotFoundError(`Branch not found: ${head}`);

    const dir = this.ensureWorktree(base);
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
    return { sha: this.headSha(base), branch: base };
  }

  /** Branches (other than base) whose body of `filePath` differs from base. */
  suggestionsForFile(filePath: string, base: string): FileSuggestion[] {
    if (!this.branchExists(base)) throw new NotFoundError(`Branch not found: ${base}`);
    const baseContent = this.fileExists(base, filePath) ? this.readFile(base, filePath) : "";
    const baseK = bodyKey(baseContent);
    const result: FileSuggestion[] = [];
    for (const b of this.listBranches()) {
      if (b === base) continue;
      if (!this.fileExists(b, filePath)) continue;
      const headContent = this.readFile(b, filePath);
      if (bodyKey(headContent) !== baseK) {
        result.push({ branch: b, baseContent, headContent });
      }
    }
    return result;
  }

  /** For each docs markdown file, how many non-base branches changed it. */
  suggestionCounts(base: string): Record<string, number> {
    if (!this.branchExists(base)) throw new NotFoundError(`Branch not found: ${base}`);
    const counts: Record<string, number> = {};
    for (const b of this.listBranches()) {
      if (b === base) continue;
      let out: string;
      try {
        out = this.repo(["diff", "--name-only", `${base}...${b}`]);
      } catch {
        continue;
      }
      for (const line of out.split("\n")) {
        const p = line.trim();
        if (!p.startsWith("docs/") || !p.toLowerCase().endsWith(".md")) continue;
        // Skip files whose body is unchanged (e.g. only the auto-stamped version
        // or cosmetic whitespace differs) — they render as "0 changes".
        const baseC = this.fileExists(base, p) ? this.readFile(base, p) : "";
        const headC = this.fileExists(b, p) ? this.readFile(b, p) : "";
        if (bodyKey(headC) === bodyKey(baseC)) continue;
        counts[p] = (counts[p] || 0) + 1;
      }
    }
    return counts;
  }

  /** Docs that meaningfully differ (by body) between `base` and `head`. */
  changedDocsBetween(base: string, head: string): string[] {
    if (!this.branchExists(base)) throw new NotFoundError(`Branch not found: ${base}`);
    if (!this.branchExists(head)) throw new NotFoundError(`Branch not found: ${head}`);
    let out: string;
    try {
      out = this.repo(["diff", "--name-only", `${base}...${head}`]);
    } catch {
      return [];
    }
    const paths: string[] = [];
    for (const line of out.split("\n")) {
      const p = line.trim();
      if (!p.startsWith("docs/") || !p.toLowerCase().endsWith(".md")) continue;
      const baseC = this.fileExists(base, p) ? this.readFile(base, p) : "";
      const headC = this.fileExists(head, p) ? this.readFile(head, p) : "";
      // Body OR status/tags/title differ (version-only/whitespace ignored).
      if (changeKey(headC) !== changeKey(baseC)) paths.push(p);
    }
    return paths;
  }

  /** Docs markdown files that exist on some non-base branch but not on `base`. */
  newDocsForBase(base: string): NewDoc[] {
    if (!this.branchExists(base)) throw new NotFoundError(`Branch not found: ${base}`);
    const seen = new Set<string>();
    const out: NewDoc[] = [];
    for (const b of this.listBranches()) {
      if (b === base) continue;
      for (const filePath of this.listMarkdownFiles(b)) {
        if (seen.has(filePath) || this.fileExists(base, filePath)) continue;
        seen.add(filePath);
        let title = filePath;
        let status = "draft";
        try {
          const { frontmatter } = parseFrontmatter(this.readFile(b, filePath));
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

  /** Docs that exist in `base` but a branch proposes deleting. */
  deletedDocsForBase(base: string): { path: string; title: string; branch: string }[] {
    if (!this.branchExists(base)) throw new NotFoundError(`Branch not found: ${base}`);
    const seen = new Set<string>();
    const out: { path: string; title: string; branch: string }[] = [];
    for (const b of this.listBranches()) {
      if (b === base) continue;
      let mb = "";
      try {
        mb = this.repo(["merge-base", base, b]).trim();
      } catch {
        continue;
      }
      if (!mb) continue;
      let names = "";
      try {
        names = this.repo(["diff", "--diff-filter=D", "--name-only", mb, b]);
      } catch {
        continue;
      }
      for (const line of names.split("\n")) {
        const p = line.trim();
        if (!p.startsWith("docs/") || !p.toLowerCase().endsWith(".md")) continue;
        if (seen.has(p) || !this.fileExists(base, p)) continue; // already gone from base — skip
        seen.add(p);
        let title = p;
        try {
          title = String(parseFrontmatter(this.readFile(base, p)).frontmatter.title || p);
        } catch {
          /* keep default */
        }
        out.push({ path: p, title, branch: b });
      }
    }
    return out;
  }

  /** Full-text search over docs on a branch (ALL words must match). */
  searchDocs(branch: string, query: string, status?: string): SearchHit[] {
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    const wantStatus = status?.trim().toLowerCase();
    // Allow filtering by status alone (no query terms).
    if (terms.length === 0 && !wantStatus) return [];
    const hits: SearchHit[] = [];
    for (const filePath of this.listMarkdownFiles(branch)) {
      let raw: string;
      try {
        raw = this.readFile(branch, filePath);
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

  /** Commit arbitrary `content` for `filePath` directly onto `base` (+push). */
  applyContentToBase(
    base: string,
    filePath: string,
    content: string,
    message: string,
    author: string,
  ): CommitResult {
    if (!this.branchExists(base)) throw new NotFoundError(`Branch not found: ${base}`);
    const dir = this.ensureWorktree(base);
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
    this.pushBranch(base);
    return { sha: this.headSha(base), branch: base };
  }

  /** Write (and optionally delete) several files onto `base` in one commit (+push). */
  applyContentsToBase(
    base: string,
    files: { path: string; content: string }[],
    message: string,
    author: string,
    deletes: string[] = [],
  ): CommitResult {
    if (!this.branchExists(base)) throw new NotFoundError(`Branch not found: ${base}`);
    const dir = this.ensureWorktree(base);
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
    this.pushBranch(base);
    return { sha: this.headSha(base), branch: base };
  }

  /**
   * Accept ALL of a branch's meaningful doc changes into `base` in ONE commit:
   * each changed doc is taken from `head` (so status/tags come along), its
   * version re-stamped, and written to base.
   */
  acceptBranchIntoBase(
    base: string,
    head: string,
    message: string,
    author: string,
  ): CommitResult & { count: number } {
    if (!this.branchExists(base)) throw new NotFoundError(`Branch not found: ${base}`);
    if (!this.branchExists(head)) throw new NotFoundError(`Branch not found: ${head}`);
    const paths = this.changedDocsBetween(base, head);
    if (paths.length === 0) throw new GitError("No changes to accept");
    const preContent: Record<string, string> = {};
    for (const p of paths) preContent[p] = this.fileExists(base, p) ? this.readFile(base, p) : "";
    const files: { path: string; content: string }[] = [];
    const deletes: string[] = [];
    for (const p of paths) {
      if (!this.fileExists(head, p)) {
        deletes.push(p); // removed on the branch → delete from base
        continue;
      }
      const { frontmatter, content } = parseFrontmatter(this.readFile(head, p));
      files.push({
        path: p,
        content: serializeDoc(
          { ...frontmatter, version: stampVersion(), status: promoteOnAccept(frontmatter.status) },
          content,
        ),
      });
    }
    const res = this.applyContentsToBase(base, files, message, author, deletes);
    this.propagateAcceptToBranches(base, paths, preContent, head, author);
    return { ...res, count: files.length + deletes.length };
  }

  /**
   * After content is accepted into `base`, bring branches into line with it.
   * `preContent` is base's content per path captured BEFORE the accept commit.
   */
  propagateAcceptToBranches(
    base: string,
    paths: string[],
    preContent: Record<string, string>,
    sourceBranch: string | null,
    author: string,
  ): string[] {
    const newContent: Record<string, string> = {};
    const deletedInBase: Record<string, boolean> = {};
    for (const p of paths) {
      const exists = this.fileExists(base, p);
      deletedInBase[p] = !exists;
      newContent[p] = exists ? this.readFile(base, p) : "";
    }
    const updated: string[] = [];
    for (const b of this.listBranches()) {
      if (b === base) continue;
      let changed = false;
      for (const p of paths) {
        if (!this.fileExists(b, p)) continue; // branch never had this file — nothing to do
        const bc = this.readFile(b, p);
        const tracksOldBase = changeKey(bc) === changeKey(preContent[p] ?? "");
        const adopt = b === sourceBranch || tracksOldBase;
        if (!adopt) continue; // branch has its own divergent edit — leave for review
        if (deletedInBase[p]) {
          this.deleteFileFromBranch(b, p); // base removed it → remove here too
          changed = true;
        } else if (changeKey(bc) !== changeKey(newContent[p])) {
          this.writeFileToBranch(b, p, newContent[p]);
          changed = true;
        }
      }
      if (changed) {
        try {
          this.commit(b, `Sync ${base} into ${b}`, author);
          updated.push(b);
        } catch {
          /* nothing to commit / conflict — best effort, leave the branch as-is */
        }
      }
    }
    return updated;
  }

  /**
   * How a branch stands relative to `base`, judged purely by document CONTENT
   * (never by commit counts — each edit is its own commit, so commit-level
   * ahead/behind is meaningless and would falsely look "diverged"). The
   * merge-base diff is only a candidate set; `changeKey` (version-insensitive)
   * decides what actually differs.
   */
  branchSyncStatus(branch: string, base: string): BranchSyncStatus {
    this.fetchRemote();
    if (!this.branchExists(base)) throw new NotFoundError(`Branch not found: ${base}`);
    if (!this.branchExists(branch)) throw new NotFoundError(`Branch not found: ${branch}`);
    if (branch === base) {
      return { branch, base, upToDate: true, staleFiles: [], conflictFiles: [] };
    }
    let mb = "";
    try {
      mb = this.repo(["merge-base", base, branch]).trim();
    } catch {
      mb = "";
    }
    const docs = (out: string) =>
      out
        .split("\n")
        .map((s) => s.trim())
        .filter((p) => p.startsWith("docs/") && p.toLowerCase().endsWith(".md"));
    const baseChanged = mb ? docs(this.repo(["diff", "--name-only", mb, base])) : [];
    const branchChanged = new Set(mb ? docs(this.repo(["diff", "--name-only", mb, branch])) : []);
    const differsNow = (p: string) => {
      const b = this.fileExists(base, p) ? this.readFile(base, p) : "";
      const h = this.fileExists(branch, p) ? this.readFile(branch, p) : "";
      return changeKey(b) !== changeKey(h);
    };
    const staleFiles = baseChanged.filter((p) => !branchChanged.has(p) && differsNow(p));
    const conflictFiles = baseChanged.filter((p) => branchChanged.has(p) && differsNow(p));
    return {
      branch,
      base,
      staleFiles,
      conflictFiles,
      upToDate: staleFiles.length === 0 && conflictFiles.length === 0,
    };
  }

  /** Bring `base` (main) into `branch`, git-style. */
  updateBranchFromBase(
    branch: string,
    base: string,
    strategy: SyncStrategy,
    author: string,
  ): { strategy: SyncStrategy; merged: boolean; conflicts: string[] } {
    if (!this.branchExists(base)) throw new NotFoundError(`Branch not found: ${base}`);
    if (!this.branchExists(branch)) throw new NotFoundError(`Branch not found: ${branch}`);
    if (branch === base) throw new GitError("Cannot sync the base branch into itself");
    const dir = this.ensureWorktree(branch);
    inDir(dir, ["checkout", branch]);
    inDir(dir, ["reset", "--hard", branch]);
    inDir(dir, ["clean", "-fd"]);

    if (strategy === "reset") {
      inDir(dir, ["reset", "--hard", base]);
      this.pushBranch(branch, true);
      return { strategy, merged: true, conflicts: [] };
    }

    const name = author || config.gitAuthorName;
    const safe = name.replace(/[^a-zA-Z0-9._-]+/g, "-").toLowerCase() || "author";
    // `no-renames`: never treat a delete + a similar file elsewhere as a rename.
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
    // prefer-main is a force-to-main: overwrite any doc that still differs from base.
    if (strategy === "prefer-main") {
      const baseDocs = new Set(this.listMarkdownFiles(base));
      for (const p of this.listMarkdownFiles(branch)) {
        if (!baseDocs.has(p)) continue;
        const bc = this.readFile(base, p);
        if (changeKey(bc) !== changeKey(this.readFile(branch, p))) this.writeFileToBranch(branch, p, bc);
      }
      if (this.hasStagedOrPendingChanges(branch)) {
        this.commit(branch, `Sync ${base} into ${branch} (prefer-main)`, author);
        return { strategy, merged: true, conflicts: [] };
      }
    }
    this.pushBranch(branch);
    return { strategy, merged: true, conflicts: [] };
  }
}

/** Construct a SiteRepo for a resolved site (cheap). */
export function repoFor(site: SiteContext): SiteRepo {
  return new SiteRepo(site);
}

/** Ensure a site's bare repo exists (clone/seed lazily). */
export function ensureRepo(site: SiteContext): void {
  new SiteRepo(site).ensure();
}

// ---- shared, site-agnostic helpers ----

/**
 * Normalise a doc for review diffing: drop the auto-stamped `version` and
 * re-serialise the frontmatter so formatting is identical on both sides.
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

/**
 * Canonical body of a document for change detection — Markdown body split into
 * trimmed blocks, frontmatter dropped. Ignores frontmatter-only differences
 * (notably the auto-stamped `version`) and cosmetic whitespace.
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
 * still counts as a real change. Version-only differences still don't count.
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
  return `${fm} ${bodyKey(raw)}`;
}
