import { parse as parseYaml, Document, visit } from "yaml";

/** Roles recognized by the platform. */
export type Role = "viewer" | "editor" | "reviewer" | "admin" | "ai-agent";

export const ROLES: Role[] = ["viewer", "editor", "reviewer", "admin", "ai-agent"];

/** Allowed values for the frontmatter `status` field. */
export type DocStatus =
  | "request"
  | "draft"
  | "review"
  | "stable"
  | "deprecated"
  | "experimental";

export const DOC_STATUSES: DocStatus[] = [
  "request", // a documented ask for content — another author/AI fulfils it
  "draft", // being written, not yet ready for review
  "review", // written, awaiting human approval (→ stable on accept)
  "stable", // approved / merged
  "deprecated",
  "experimental",
];

/**
 * Status transition applied when a reviewer accepts changes into the base
 * branch: a doc that was "awaiting review" is now approved → "stable". Every
 * other status is left untouched (a "draft" is still WIP, etc.).
 */
export function promoteOnAccept(status: unknown): DocStatus | string {
  return status === "review" ? "stable" : (status as DocStatus | string);
}

/** Required frontmatter for every document. */
export interface FrontMatter {
  id: string;
  title: string;
  status: DocStatus;
  version: string;
  tags: string[];
  [key: string]: unknown;
}

export interface Doc {
  path: string;
  branch: string;
  frontmatter: FrontMatter;
  content: string;
}

export interface TreeItem {
  path: string;
  type: "file";
  title: string;
  status: DocStatus | string;
}

export interface TreeResponse {
  branch: string;
  items: TreeItem[];
}

export interface BranchInfo {
  name: string;
  isDefault: boolean;
}

export interface DiffFile {
  path: string;
  status: string; // A | M | D | R | ...
  additions: number;
  deletions: number;
  patch: string;
}

export interface DiffResponse {
  base: string;
  head: string;
  files: DiffFile[];
}

export interface SearchHit {
  path: string;
  title: string;
  snippet: string;
}

export interface TokenInfo {
  id: string;
  name: string;
  role: Role;
  allowed_branch_prefixes: string[];
  created_at: string;
  last_used_at: string | null;
}

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;

export interface ParsedDoc {
  frontmatter: Record<string, unknown>;
  content: string;
}

/** Split a markdown string into frontmatter object + body content. */
export function parseFrontmatter(raw: string): ParsedDoc {
  const match = raw.match(FRONTMATTER_RE);
  if (!match) {
    return { frontmatter: {}, content: raw };
  }
  const yamlText = match[1];
  const content = match[2] ?? "";
  let frontmatter: Record<string, unknown> = {};
  const parsed = parseYaml(yamlText);
  if (parsed && typeof parsed === "object") {
    frontmatter = parsed as Record<string, unknown>;
  }
  return { frontmatter, content };
}

/** Serialize frontmatter + content back into a markdown string. */
export function serializeDoc(frontmatter: Record<string, unknown>, content: string): string {
  // Keep array fields inline (`tags: [a, b]`) and never wrap lines, so editing a
  // single scalar field (e.g. status) doesn't reformat unrelated list fields
  // into block style — that kept review diffs minimal (just the changed line).
  const doc = new Document(frontmatter);
  visit(doc, {
    Seq(_key, node) {
      (node as { flow?: boolean }).flow = true;
    },
  });
  const yamlText = doc.toString({ lineWidth: 0 }).trimEnd();
  const body = content.startsWith("\n") ? content.slice(1) : content;
  return `---\n${yamlText}\n---\n\n${body.replace(/^\n+/, "")}`;
}

/**
 * Automatic, time-based document version: `YY.M{DD}.H{MM}` (server clock).
 * e.g. 2026-05-30 14:32 → "26.530.1432". Minute granularity acts as a built-in
 * cooldown: multiple edits within the same minute keep the same version. The
 * version is never set by clients/AI — the server stamps it on every write.
 */
export function stampVersion(date: Date = new Date()): string {
  const pad2 = (n: number) => String(n).padStart(2, "0");
  const yy = pad2(date.getFullYear() % 100);
  const mdd = `${date.getMonth() + 1}${pad2(date.getDate())}`;
  const hmm = `${date.getHours()}${pad2(date.getMinutes())}`;
  return `${yy}.${mdd}.${hmm}`;
}

export class FrontmatterError extends Error {
  fields: string[];
  constructor(message: string, fields: string[]) {
    super(message);
    this.name = "FrontmatterError";
    this.fields = fields;
  }
}

const REQUIRED_FIELDS = ["id", "title", "status", "version", "tags"] as const;

/** Validate & normalize a raw frontmatter object. Throws FrontmatterError on problems. */
export function validateFrontmatter(fm: Record<string, unknown>): FrontMatter {
  const missing: string[] = [];
  for (const field of REQUIRED_FIELDS) {
    if (fm[field] === undefined || fm[field] === null || fm[field] === "") {
      missing.push(field);
    }
  }
  if (missing.length > 0) {
    throw new FrontmatterError(
      `Missing required frontmatter fields: ${missing.join(", ")}`,
      missing,
    );
  }

  const status = String(fm.status);
  if (!DOC_STATUSES.includes(status as DocStatus)) {
    throw new FrontmatterError(
      `Invalid status "${status}". Allowed: ${DOC_STATUSES.join(", ")}`,
      ["status"],
    );
  }

  let tags = fm.tags;
  if (!Array.isArray(tags)) {
    throw new FrontmatterError("Field `tags` must be a list", ["tags"]);
  }
  tags = tags.map((t) => String(t));

  return {
    ...fm,
    id: String(fm.id),
    title: String(fm.title),
    status: status as DocStatus,
    version: String(fm.version),
    tags: tags as string[],
  };
}

export function isValidRole(role: string): role is Role {
  return (ROLES as string[]).includes(role);
}

export * from "./lint";
