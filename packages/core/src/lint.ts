// Document linter: scans Markdown docs for problems an author (human or AI)
// should fix — invalid frontmatter, broken mermaid diagrams, dead internal
// links, missing image assets, and malformed tables. Pure & dependency-free so
// it runs server-side (MCP `lint_docs`, /api/lint) and could run in the editor.

import { parseFrontmatter, validateFrontmatter, FrontmatterError } from "./index";

export type LintSeverity = "error" | "warning";
export type LintRule = "frontmatter" | "mermaid" | "link" | "image" | "table";

export const LINT_RULES: LintRule[] = ["frontmatter", "mermaid", "link", "image", "table"];

export interface LintFinding {
  path: string; // doc path the finding belongs to
  rule: LintRule;
  severity: LintSeverity;
  message: string;
  line: number | null; // 1-based line in the raw file (best effort)
  snippet?: string; // the offending text, trimmed
}

export interface LintContext {
  /** True if a repo file path exists for the lint (e.g. "docs/a/b.md", "assets/x.png"). */
  fileExists: (repoPath: string) => boolean;
}

// Diagram keywords mermaid accepts as the first token of a block. A block whose
// first meaningful line isn't one of these can never parse.
const MERMAID_TYPES = [
  "graph", "flowchart", "sequencediagram", "classdiagram", "classdiagram-v2",
  "statediagram", "statediagram-v2", "erdiagram", "journey", "gantt", "pie",
  "requirementdiagram", "gitgraph", "mindmap", "timeline", "quadrantchart",
  "sankey-beta", "sankey", "xychart-beta", "xychart", "block-beta", "block",
  "packet-beta", "packet", "kanban", "architecture-beta", "architecture",
  "radar", "treemap", "zenuml", "c4context", "c4container", "c4component",
  "c4dynamic", "c4deployment",
];

/** Resolve `rel` against the directory of `fromPath`, collapsing ./ and ../ */
function resolveRel(fromPath: string, rel: string): string {
  const base = rel.startsWith("/")
    ? rel.slice(1).split("/")
    : [...fromPath.split("/").slice(0, -1), ...rel.split("/")];
  const out: string[] = [];
  for (const seg of base) {
    if (seg === "" || seg === ".") continue;
    if (seg === "..") out.pop();
    else out.push(seg);
  }
  return out.join("/");
}

/** Cells in a pipe-table row (drops the leading/trailing pipe). */
function tableCellCount(row: string): number {
  return row.replace(/^\s*\|/, "").replace(/\|\s*$/, "").split("|").length;
}

/** Lint a single ```mermaid block. `start` is the 1-based line of its first content line. */
function lintMermaid(path: string, block: string[], start: number, out: LintFinding[]): void {
  const meaningful = block.filter((l) => l.trim() && !l.trim().startsWith("%%"));
  if (meaningful.length === 0) {
    out.push({ path, rule: "mermaid", severity: "error", message: "Empty mermaid block.", line: start });
    return;
  }
  const first = meaningful[0].trim();
  const firstTok = first.split(/[\s({:>-]/)[0].toLowerCase();
  if (!MERMAID_TYPES.some((t) => t === firstTok || firstTok.startsWith(t))) {
    out.push({
      path, rule: "mermaid", severity: "error", line: start,
      message: `Unrecognized diagram type "${first.slice(0, 40)}". A mermaid block must start with a diagram keyword (graph, flowchart, sequenceDiagram, classDiagram, …).`,
      snippet: first,
    });
  }

  // Bracket / quote balance across the whole source (ignoring %% comments).
  const src = meaningful.join("\n");
  const pairs: Array<[string, string, string]> = [
    ["(", ")", "parentheses ( )"],
    ["[", "]", "square brackets [ ]"],
    ["{", "}", "braces { }"],
  ];
  for (const [open, close, label] of pairs) {
    const o = src.split(open).length - 1;
    const c = src.split(close).length - 1;
    if (o !== c) {
      out.push({
        path, rule: "mermaid", severity: "error", line: start,
        message: `Unbalanced ${label}: ${o} "${open}" vs ${c} "${close}".`,
      });
    }
  }
  if ((src.split('"').length - 1) % 2 !== 0) {
    out.push({ path, rule: "mermaid", severity: "error", line: start, message: 'Unbalanced double-quotes (").' });
  }

  // Dangling edge: a line ending in an arrow operator with no target node.
  block.forEach((l, idx) => {
    const t = l.trim();
    if (!t || t.startsWith("%%")) return;
    if (/(?:--+>?|==+>?|-\.->?|->>|--[xo]|===)\s*$/.test(t)) {
      out.push({
        path, rule: "mermaid", severity: "error", line: start + idx,
        message: "Edge has no target node (line ends with a dangling arrow).",
        snippet: t,
      });
    }
  });
}

/** Lint inline images & links on one (non-code) line. */
function lintInline(path: string, line: string, lineNo: number, ctx: LintContext, out: LintFinding[]): void {
  // Strip inline code spans so `[x](y)` inside backticks isn't treated as a link.
  const text = line.replace(/`[^`]*`/g, "");
  const RE = /(!?)\[[^\]]*\]\(\s*<?([^)\s>]+)>?(?:\s+"[^"]*")?\s*\)/g;
  let m: RegExpExecArray | null;
  while ((m = RE.exec(text))) {
    const isImg = m[1] === "!";
    const raw = m[2];
    if (!raw) continue;
    // External / anchor / protocol-relative — not ours to verify.
    if (/^[a-z][a-z0-9+.-]*:/i.test(raw) || raw.startsWith("//") || raw.startsWith("#")) continue;
    const target = raw.split("#")[0];
    if (!target) continue;
    if (isImg) {
      const repoPath = target.startsWith("assets/") || target.startsWith("/")
        ? resolveRel("", target)
        : resolveRel(path, target);
      if (!ctx.fileExists(repoPath)) {
        out.push({ path, rule: "image", severity: "error", line: lineNo, message: `Image asset not found: ${raw}`, snippet: raw });
      }
    } else {
      // Only validate links that point at a doc (.md); leave others alone.
      if (!/\.md$/i.test(target)) continue;
      const repoPath = resolveRel(path, target);
      if (!ctx.fileExists(repoPath)) {
        out.push({ path, rule: "link", severity: "error", line: lineNo, message: `Linked document not found: ${raw}`, snippet: raw });
      }
    }
  }
}

/** Lint one document. Returns every finding (unfiltered). */
export function lintDoc(path: string, raw: string, ctx: LintContext): LintFinding[] {
  const out: LintFinding[] = [];
  const norm = raw.replace(/\r\n/g, "\n");
  const lines = norm.split("\n");

  // ---- frontmatter ----
  let bodyStart = 0;
  if (lines[0]?.trim() === "---") {
    const end = lines.indexOf("---", 1);
    if (end === -1) {
      out.push({ path, rule: "frontmatter", severity: "error", line: 1, message: "Frontmatter block is not closed (missing terminating `---`)." });
    } else {
      bodyStart = end + 1;
    }
  } else {
    out.push({ path, rule: "frontmatter", severity: "error", line: 1, message: "Missing YAML frontmatter block (`--- … ---`)." });
  }
  try {
    const { frontmatter } = parseFrontmatter(norm);
    validateFrontmatter(frontmatter);
  } catch (e) {
    const msg = e instanceof FrontmatterError ? e.message : `Invalid frontmatter: ${(e as Error).message}`;
    out.push({ path, rule: "frontmatter", severity: "error", line: 1, message: msg });
  }

  // ---- body: fenced blocks, tables, links/images ----
  let fence: string | null = null;
  let fenceLang = "";
  let fenceStart = 0;
  let fenceLines: string[] = [];
  let tableRun: Array<{ line: number; text: string }> = [];

  const flushTable = () => {
    if (tableRun.length >= 2 && /^[\s|:-]+$/.test(tableRun[1].text) && tableRun[1].text.includes("-")) {
      const cols = tableCellCount(tableRun[0].text);
      const sep = tableCellCount(tableRun[1].text);
      if (sep !== cols) {
        out.push({ path, rule: "table", severity: "warning", line: tableRun[1].line, message: `Table header has ${cols} columns but the separator row has ${sep}.` });
      }
      for (const r of tableRun.slice(2)) {
        const c = tableCellCount(r.text);
        if (c !== cols) {
          out.push({ path, rule: "table", severity: "warning", line: r.line, message: `Table row has ${c} columns; expected ${cols}.`, snippet: r.text.trim() });
        }
      }
    }
    tableRun = [];
  };

  for (let i = bodyStart; i < lines.length; i++) {
    const line = lines[i];
    const fenceMatch = line.match(/^\s*(`{3,}|~{3,})(.*)$/);
    if (fence !== null) {
      if (fenceMatch && line.trim()[0] === fence) {
        if (fenceLang.toLowerCase() === "mermaid") lintMermaid(path, fenceLines, fenceStart, out);
        fence = null;
        fenceLang = "";
        fenceLines = [];
      } else {
        fenceLines.push(line);
      }
      continue;
    }
    if (fenceMatch) {
      flushTable();
      fence = fenceMatch[1][0];
      fenceLang = (fenceMatch[2] || "").trim().split(/\s+/)[0] || "";
      fenceStart = i + 2; // 1-based line number of the first content line (next line)
      fenceLines = [];
      continue;
    }
    if (/\|/.test(line) && line.trim() !== "") {
      tableRun.push({ line: i + 1, text: line });
    } else {
      flushTable();
    }
    lintInline(path, line, i + 1, ctx, out);
  }
  if (fence !== null) {
    if (fenceLang.toLowerCase() === "mermaid") {
      lintMermaid(path, fenceLines, fenceStart, out);
      out.push({ path, rule: "mermaid", severity: "error", line: fenceStart - 1, message: "Mermaid code block is not closed (missing terminating fence)." });
    }
  }
  flushTable();
  return out;
}

export interface LintFilter {
  rule?: LintRule;
  severity?: LintSeverity;
  path?: string; // substring match
}

/** Lint many docs and apply optional filtering. */
export function lintDocs(
  docs: Array<{ path: string; raw: string }>,
  ctx: LintContext,
  filter: LintFilter = {},
): LintFinding[] {
  let out: LintFinding[] = [];
  for (const d of docs) out.push(...lintDoc(d.path, d.raw, ctx));
  if (filter.rule) out = out.filter((f) => f.rule === filter.rule);
  if (filter.severity) out = out.filter((f) => f.severity === filter.severity);
  if (filter.path) out = out.filter((f) => f.path.includes(filter.path!));
  return out;
}
