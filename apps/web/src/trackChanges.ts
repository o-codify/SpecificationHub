import { diffArrays } from "diff";
import { mdToHtmlDoc, mdInline } from "./markdownConvert";

/** A "prose" block is a plain paragraph (not heading/list/quote/code/table). */
const isProse = (b: string) => !/^(#{1,6}\s|>\s|[-*+]\s|\d+\.\s|```|\||\s{4})/.test(b.trim());

/** A single-line ATX heading block (e.g. "## Title"). */
const isHeading = (b: string) => {
  const t = b.trim();
  return /^#{1,6}\s/.test(t) && !t.includes("\n");
};

const BULLET = /^\s*([-*+]|\d+\.)\s+/;
/** A list block — starts with a bullet/number. Items may wrap onto indented
 *  continuation lines, so we don't require every line to be a marker. */
const isList = (b: string) => BULLET.test(b.trim());

/** Split a list block into items, folding wrapped continuation lines into the
 *  item they belong to (and stripping the leading marker). */
function listItems(block: string): string[] {
  const out: string[] = [];
  for (const raw of block.replace(/\r\n/g, "\n").split("\n")) {
    if (BULLET.test(raw)) out.push(raw.replace(BULLET, "").trim());
    else if (raw.trim() && out.length) out[out.length - 1] += " " + raw.trim();
  }
  return out;
}

/** A GitHub-flavoured table block (rows of `| … |` with a `---` separator row). */
const isTable = (b: string) => {
  const lines = b.trim().split("\n");
  return lines.length >= 2 && lines.every((l) => l.includes("|")) && /^[\s|:-]+$/.test(lines[1]);
};

export type ChangeKind = "add" | "del" | "replace";

export interface Change {
  id: string;
  branch: string;
  kind: ChangeKind;
  anchor: number; // base block index this change attaches to
  oldBlocks: string[];
  newBlocks: string[];
}

/** Split markdown into top-level blocks (paragraphs/headings/etc.) on blank lines.
 *  Fence-aware: blank lines *inside* a ``` / ~~~ fenced code block do NOT split it
 *  — otherwise a code block (or ASCII/mermaid diagram) containing blank lines is
 *  torn into several "blocks", which mangles the track-changes diff. */
export function splitBlocks(md: string): string[] {
  const lines = md.replace(/\r\n/g, "\n").trim().split("\n");
  const blocks: string[] = [];
  let cur: string[] = [];
  let fence: string | null = null; // fence char ("`" or "~") while inside a code block
  const flush = () => {
    const b = cur.join("\n").trim();
    if (b) blocks.push(b);
    cur = [];
  };
  for (const line of lines) {
    const m = line.match(/^\s*(`{3,}|~{3,})/);
    if (fence !== null) {
      cur.push(line);
      if (m && line.trim()[0] === fence) fence = null; // closing fence
    } else if (m) {
      fence = m[1][0]; // opening fence — keep gathering until it closes
      cur.push(line);
    } else if (line.trim() === "") {
      flush();
    } else {
      cur.push(line);
    }
  }
  flush();
  return blocks;
}

function joinBlocks(blocks: string[]): string {
  return blocks.join("\n\n") + "\n";
}

/** Block-level changes of each branch relative to the base content. */
export function changesFor(
  baseMd: string,
  branches: { branch: string; headMd: string }[],
): Change[] {
  const base = splitBlocks(baseMd);
  const out: Change[] = [];
  let cid = 0;
  for (const { branch, headMd } of branches) {
    const parts = diffArrays(base, splitBlocks(headMd));
    let bi = 0;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (part.removed) {
        const start = bi;
        bi += part.value.length;
        const next = parts[i + 1];
        if (next && next.added) {
          out.push({ id: `c${cid++}`, branch, kind: "replace", anchor: start, oldBlocks: part.value, newBlocks: next.value });
          i++;
        } else {
          out.push({ id: `c${cid++}`, branch, kind: "del", anchor: start, oldBlocks: part.value, newBlocks: [] });
        }
      } else if (part.added) {
        out.push({ id: `c${cid++}`, branch, kind: "add", anchor: bi, oldBlocks: [], newBlocks: part.value });
      } else {
        bi += part.value.length;
      }
    }
  }
  return out;
}

const escAttr = (s: string) => s.replace(/"/g, "&quot;");

/**
 * Inline replace woven into the paragraph: the common leading/trailing words
 * stay as normal prose; the differing middle becomes ONE <del>old clause</del>
 * + ONE <ins>new clause</ins> inside a clickable .sug span (no word-soup).
 */
const escHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Inline constructs whose markers must never be split across a change boundary —
// otherwise a stray `**`, `` ` ``, or half a `[label](url)` leaks as literal text
// (or breaks the markdown). The whole construct stays on one side of the cut.
const INLINE_CONSTRUCTS = [
  /!?\[[^\]\n]*\]\([^)\n]*\)/, // links & images
  /`[^`\n]+`/, // inline code
  /\*\*[^*\n]+\*\*/, // **strong**
  /__[^_\n]+__/, // __strong__
  /~~[^~\n]+~~/, // ~~strike~~
  /\*[^*\n]+\*/, // *em*
  /_[^_\n]+_/, // _em_
];

/** Char ranges of inline constructs in `text` (so a cut never lands inside one). */
function protectedSpans(text: string): Array<[number, number]> {
  const spans: Array<[number, number]> = [];
  for (const base of INLINE_CONSTRUCTS) {
    const re = new RegExp(base.source, "g");
    let m: RegExpExecArray | null;
    while ((m = re.exec(text))) spans.push([m.index, m.index + m[0].length]);
  }
  return spans;
}
const insideSpan = (spans: Array<[number, number]>, idx: number) =>
  spans.some(([a, b]) => idx > a && idx < b);

function clauseInner(
  c: Change,
  oldText: string,
  newText: string,
  render: (s: string) => string = mdInline,
): string {
  const isW = (ch: string | undefined) => !!ch && /\w/.test(ch);
  const oldSpans = protectedSpans(oldText);
  const newSpans = protectedSpans(newText);
  // Character-level common prefix/suffix (handles attached punctuation like
  // "speed" → "speed, …"), then snap the boundaries to whole-word edges so we
  // never cut inside a word.
  let p = 0;
  while (p < oldText.length && p < newText.length && oldText[p] === newText[p]) p++;
  while (p > 0 && isW(oldText[p - 1]) && (isW(oldText[p]) || isW(newText[p]))) p--;
  // …and never cut inside an inline construct (code / **bold** / *em* / links):
  // keep the whole thing — markers and all — on one side, so markdown stays valid.
  while (p > 0 && (insideSpan(oldSpans, p) || insideSpan(newSpans, p))) p--;
  let s = 0;
  while (
    s < oldText.length - p &&
    s < newText.length - p &&
    oldText[oldText.length - 1 - s] === newText[newText.length - 1 - s]
  )
    s++;
  while (
    s > 0 &&
    isW(oldText[oldText.length - s]) &&
    (isW(oldText[oldText.length - 1 - s]) || isW(newText[newText.length - 1 - s]))
  )
    s--;
  while (
    s > 0 &&
    (insideSpan(oldSpans, oldText.length - s) || insideSpan(newSpans, newText.length - s))
  )
    s--;
  const prefix = oldText.slice(0, p);
  const oldMid = oldText.slice(p, oldText.length - s);
  const newMid = newText.slice(p, newText.length - s);
  const suffix = oldText.slice(oldText.length - s);
  let inner = render(prefix);
  inner += `<span class="sug" data-id="${c.id}" data-branch="${escAttr(c.branch)}">`;
  if (oldMid) inner += `<del>${render(oldMid)}</del>`;
  if (newMid) inner += `<ins>${render(newMid)}</ins>`;
  inner += `</span>`;
  inner += render(suffix);
  return inner;
}

/** Whole-text add/remove wrapped in one clickable .sug span. */
function wholeSpan(c: Change, html: string, kind: "ins" | "del"): string {
  return `<span class="sug" data-id="${c.id}" data-branch="${escAttr(c.branch)}"><${kind}>${html}</${kind}></span>`;
}

const isCode = (b: string) => b.trim().startsWith("```");
/** A ```mermaid fenced block — rendered as a diagram, never line-diffed as code. */
const isMermaid = (b: string) => /^```mermaid\b/.test(b.trim());
/** A block that contains a fenced code section anywhere (not necessarily at the start). */
const hasFence = (b: string) => b.includes("```");
/** Plain prose safe to diff inline (no fenced code that inline rendering would break). */
const isSimpleProse = (b: string) => isProse(b) && !hasFence(b);

/** Replace a fenced code block line-by-line; only changed lines are interactive. */
function codeReplace(c: Change, oldBlock: string, newBlock: string): string {
  const inner = (b: string) => {
    const lines = b.replace(/\r\n/g, "\n").replace(/\n+$/, "").split("\n");
    if (lines[0]?.startsWith("```")) lines.shift();
    if (lines[lines.length - 1]?.startsWith("```")) lines.pop();
    return lines;
  };
  const a = inner(oldBlock);
  const b = inner(newBlock);
  let out = "";
  for (const e of alignBy(a, b, similarEntry)) {
    if (e.kind === "same") out += escHtml(e.old!) + "\n";
    else if (e.kind === "mod") out += clauseInner(c, e.old!, e.neu!, escHtml) + "\n";
    else if (e.kind === "del") out += wholeSpan(c, escHtml(e.old!), "del") + "\n";
    else out += wholeSpan(c, escHtml(e.neu!), "ins") + "\n";
  }
  return `<pre><code>${out}</code></pre>`;
}

/** Replace a heading inline: keep the <h*> tag (+ H1 accent), diff just the text. */
function headingReplace(c: Change, oldBlock: string, newBlock: string): string {
  const parse = (b: string) => {
    const m = b.trim().match(/^(#{1,6})\s+([\s\S]*)$/);
    return { level: m ? m[1].length : 2, text: (m ? m[2] : b).trim() };
  };
  const o = parse(oldBlock);
  const n = parse(newBlock);
  const lvl = n.level;
  const wrap = (inner: string) => (lvl === 1 ? `<span class="hl">${inner}</span>` : inner);
  const inner = o.text === n.text ? wrap(mdInline(n.text)) : wrap(clauseInner(c, o.text, n.text));
  return `<h${lvl}>${inner}</h${lvl}>`;
}

/** Render one changed block against its old version, picking the right granularity. */
function renderReplacePair(c: Change, oldBlock: string, newBlock: string): string {
  const attrs = `data-id="${c.id}" data-branch="${escAttr(c.branch)}"`;
  // A heading glued to its body (no blank line between them) lands in one block;
  // peel the heading off both sides so the change stays inline instead of being
  // dumped into a struck/green callout.
  const peel = (b: string) => b.trim().match(/^(#{1,6}\s[^\n]*)\n([\s\S]+)$/);
  const op = peel(oldBlock);
  const np = peel(newBlock);
  if (op && np)
    return headingReplace(c, op[1], np[1]) + renderReplacePair(c, op[2].trim(), np[2].trim());
  if (isHeading(oldBlock) && isHeading(newBlock)) return headingReplace(c, oldBlock, newBlock);
  // Line-diff two plain code blocks — but NOT when mermaid is involved: a
  // ```mermaid block must stay whole so it renders as a diagram (via the callout
  // below → mdToHtmlDoc → renderMermaid), not as interleaved source lines.
  if (isCode(oldBlock) && isCode(newBlock) && !isMermaid(oldBlock) && !isMermaid(newBlock))
    return codeReplace(c, oldBlock, newBlock);
  // Inline diffing (prose/list/table) only when neither side hides a code fence —
  // a fence rendered inline would break (literal ``` and mangled markers).
  if (!hasFence(oldBlock) && !hasFence(newBlock)) {
    if (isProse(oldBlock) && isProse(newBlock)) return `<p>${clauseInner(c, oldBlock, newBlock)}</p>`;
    if (isList(oldBlock) && isList(newBlock)) return listReplace(c, oldBlock, newBlock);
    if (isTable(oldBlock) && isTable(newBlock)) return tableReplace(c, oldBlock, newBlock);
  }
  // Different block kinds, or a block containing a code fence — show as struck
  // old + green new callouts (mdToHtmlDoc renders the fence correctly).
  return (
    `<div class="sug del" ${attrs}>${mdToHtmlDoc(oldBlock)}</div>` +
    `<div class="sug add" ${attrs}>${mdToHtmlDoc(newBlock)}</div>`
  );
}

/** Pair adjacent removed/added runs so a modified entry is one item (not del+add). */
function pairDiff(a: string[], b: string[]): { kind: "same" | "add" | "del" | "mod"; old?: string; neu?: string }[] {
  const out: { kind: "same" | "add" | "del" | "mod"; old?: string; neu?: string }[] = [];
  const parts = diffArrays(a, b);
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (part.removed) {
      const next = parts[i + 1];
      if (next && next.added) {
        const olds = part.value;
        const news = next.value;
        const n = Math.max(olds.length, news.length);
        for (let k = 0; k < n; k++) {
          if (k < olds.length && k < news.length) out.push({ kind: "mod", old: olds[k], neu: news[k] });
          else if (k < olds.length) out.push({ kind: "del", old: olds[k] });
          else out.push({ kind: "add", neu: news[k] });
        }
        i++;
      } else {
        for (const v of part.value) out.push({ kind: "del", old: v });
      }
    } else if (part.added) {
      for (const v of part.value) out.push({ kind: "add", neu: v });
    } else {
      for (const v of part.value) out.push({ kind: "same", old: v });
    }
  }
  return out;
}

type Aligned = { kind: "same" | "add" | "del" | "mod"; old?: string; neu?: string };

/**
 * Align two lists of entries by *similarity* (an LCS over `similar`), so a
 * changed entry pairs with its real counterpart even when other entries were
 * inserted/removed around it — index-pairing would otherwise mismatch them.
 */
function alignBy(olds: string[], news: string[], similar: (a: string, b: string) => boolean): Aligned[] {
  const m = olds.length;
  const n = news.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = m - 1; i >= 0; i--)
    for (let j = n - 1; j >= 0; j--)
      dp[i][j] = similar(olds[i], news[j]) ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const out: Aligned[] = [];
  let i = 0;
  let j = 0;
  while (i < m && j < n) {
    if (similar(olds[i], news[j])) {
      out.push({ kind: olds[i] === news[j] ? "same" : "mod", old: olds[i], neu: news[j] });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      out.push({ kind: "del", old: olds[i++] });
    } else {
      out.push({ kind: "add", neu: news[j++] });
    }
  }
  while (i < m) out.push({ kind: "del", old: olds[i++] });
  while (j < n) out.push({ kind: "add", neu: news[j++] });
  return out;
}

/** Two entries are "the same entry" if they share a label (text before ":") or a real prefix. */
function similarEntry(x: string, y: string): boolean {
  const label = (s: string) => {
    const i = s.indexOf(":");
    return i > 0 ? s.slice(0, i).trim().toLowerCase() : "";
  };
  const lx = label(x);
  const ly = label(y);
  if (lx && ly) return lx === ly;
  let p = 0;
  while (p < x.length && p < y.length && x[p] === y[p]) p++;
  return p >= 3 && p >= Math.min(x.length, y.length) * 0.3;
}

/** Replace a list block item-by-item; only the changed clause/bullet is interactive. */
function listReplace(c: Change, oldBlock: string, newBlock: string): string {
  const ordered = /^\s*\d+\.\s/.test(oldBlock.trim()) || /^\s*\d+\.\s/.test(newBlock.trim());
  const tag = ordered ? "ol" : "ul";
  const a = listItems(oldBlock); // wrapped continuation lines folded into each item
  const b = listItems(newBlock);
  let inner = "";
  for (const e of alignBy(a, b, similarEntry)) {
    if (e.kind === "same") inner += `<li>${mdInline(e.old!)}</li>`;
    else if (e.kind === "mod") inner += `<li>${clauseInner(c, e.old!, e.neu!)}</li>`;
    else if (e.kind === "del") inner += `<li>${wholeSpan(c, mdInline(e.old!), "del")}</li>`;
    else inner += `<li>${wholeSpan(c, mdInline(e.neu!), "ins")}</li>`;
  }
  return `<${tag}>${inner}</${tag}>`;
}

/** Replace a table block row-by-row; only changed rows/cells are interactive. */
function tableReplace(c: Change, oldBlock: string, newBlock: string): string {
  const attrs = `data-id="${c.id}" data-branch="${escAttr(c.branch)}"`;
  const rows = (b: string) => b.trim().split("\n").filter((l) => l.includes("|"));
  const cells = (row: string) =>
    row.replace(/^\s*\|/, "").replace(/\|\s*$/, "").split("|").map((s) => s.trim());
  const a = rows(oldBlock);
  const b = rows(newBlock);
  const header = cells(b[0] ?? a[0] ?? "");
  const head = `<thead><tr>${header.map((h) => `<th>${mdInline(h)}</th>`).join("")}</tr></thead>`;
  const tds = (cs: string[]) => cs.map((x) => `<td>${mdInline(x)}</td>`).join("");
  // Match rows by *content similarity*, ignoring columns that are constant across
  // the whole table (e.g. a repeated "2026-Q2" first column). Keying on the first
  // cell alone wrongly pairs every row when that column repeats, so inserted rows
  // cascade into bogus per-row "modifications" instead of showing as added rows.
  const norm = (s: string | undefined) => (s ?? "").trim().toLowerCase();
  const dataRows = [...a.slice(2), ...b.slice(2)].map(cells);
  const colCount = dataRows.reduce((m, r) => Math.max(m, r.length), 0);
  const constant: boolean[] = [];
  for (let i = 0; i < colCount; i++) {
    constant[i] = new Set(dataRows.map((r) => norm(r[i]))).size <= 1;
  }
  const keyCells = (row: string) => cells(row).filter((_, i) => !constant[i]);
  const rowSimilar = (x: string, y: string): boolean => {
    if (x === y) return true;
    const xc = keyCells(x);
    const yc = keyCells(y);
    const n = Math.max(xc.length, yc.length);
    if (!n) return false;
    let same = 0;
    for (let i = 0; i < n; i++) if (norm(xc[i]) === norm(yc[i])) same++;
    return same / n >= 0.5;
  };
  let body = "";
  for (const e of alignBy(a.slice(2), b.slice(2), rowSimilar)) {
    if (e.kind === "same") {
      body += `<tr>${tds(cells(e.old!))}</tr>`;
    } else if (e.kind === "mod") {
      const oc = cells(e.old!);
      const nc = cells(e.neu!);
      const n = Math.max(oc.length, nc.length);
      let row = "";
      for (let k = 0; k < n; k++) {
        const o = oc[k] ?? "";
        const nw = nc[k] ?? "";
        row += o === nw ? `<td>${mdInline(nw)}</td>` : `<td>${clauseInner(c, o, nw)}</td>`;
      }
      body += `<tr>${row}</tr>`;
    } else if (e.kind === "del") {
      body += `<tr class="sug row-del" ${attrs}>${tds(cells(e.old!))}</tr>`;
    } else {
      body += `<tr class="sug row-add" ${attrs}>${tds(cells(e.neu!))}</tr>`;
    }
  }
  return `<div class="table-wrap"><table>${head}<tbody>${body}</tbody></table></div>`;
}

function sugBlock(c: Change): string {
  const attrs = `data-id="${c.id}" data-branch="${escAttr(c.branch)}"`;
  if (c.kind === "add") {
    return c.newBlocks.length === 1 && isSimpleProse(c.newBlocks[0])
      ? `<p class="sug add" ${attrs}>${mdInline(c.newBlocks[0])}</p>`
      : `<div class="sug add" ${attrs}>${mdToHtmlDoc(joinBlocks(c.newBlocks))}</div>`;
  }
  if (c.kind === "del") {
    return c.oldBlocks.length === 1 && isSimpleProse(c.oldBlocks[0])
      ? `<p class="sug del" ${attrs}>${mdInline(c.oldBlocks[0])}</p>`
      : `<div class="sug del" ${attrs}>${mdToHtmlDoc(joinBlocks(c.oldBlocks))}</div>`;
  }
  // replace — decompose block-by-block so adjacent changed blocks (e.g. a list
  // followed by a code block) each get the right granularity instead of one
  // giant struck/green callout.
  let html = "";
  for (const e of pairDiff(c.oldBlocks, c.newBlocks)) {
    if (e.kind === "same") html += mdToHtmlDoc(e.old!);
    else if (e.kind === "mod") html += renderReplacePair(c, e.old!, e.neu!);
    else if (e.kind === "del") html += `<div class="sug del" ${attrs}>${mdToHtmlDoc(e.old!)}</div>`;
    else html += `<div class="sug add" ${attrs}>${mdToHtmlDoc(e.neu!)}</div>`;
  }
  return html;
}

/** Render the document body with the (visible) changes woven inline as track-changes. */
export function renderTrackedHtml(baseMd: string, changes: Change[]): string {
  const base = splitBlocks(baseMd);
  const addsAt: Record<number, Change[]> = {};
  const coverStart: Record<number, Change> = {};
  const covered = new Set<number>();
  for (const c of changes) {
    if (c.kind === "add") (addsAt[c.anchor] ??= []).push(c);
    else {
      coverStart[c.anchor] = c;
      for (let k = c.anchor; k < c.anchor + c.oldBlocks.length; k++) covered.add(k);
    }
  }
  let html = "";
  let pos = 0;
  while (pos < base.length) {
    (addsAt[pos] || []).forEach((c) => (html += sugBlock(c)));
    const cv = coverStart[pos];
    if (cv) {
      html += sugBlock(cv);
      pos += cv.oldBlocks.length;
    } else if (covered.has(pos)) {
      pos++; // part of a multi-block del/replace already emitted
    } else {
      html += mdToHtmlDoc(base[pos]);
      pos++;
    }
  }
  (addsAt[base.length] || []).forEach((c) => (html += sugBlock(c)));
  return html;
}

/** Apply a set of (non-overlapping vs base) changes to base, highest anchor first. */
export function applyChanges(baseMd: string, changes: Change[]): string {
  const blocks = splitBlocks(baseMd);
  for (const c of [...changes].sort((a, b) => b.anchor - a.anchor)) {
    if (c.kind === "del") blocks.splice(c.anchor, c.oldBlocks.length);
    else if (c.kind === "add") blocks.splice(c.anchor, 0, ...c.newBlocks);
    else blocks.splice(c.anchor, c.oldBlocks.length, ...c.newBlocks);
  }
  return joinBlocks(blocks);
}

/** Produce the new content for accepting one change (optionally with edited markdown). */
export function applyChange(baseMd: string, change: Change, edited?: string): string {
  const blocks = splitBlocks(baseMd);
  const repl = edited != null ? splitBlocks(edited) : change.newBlocks;
  if (change.kind === "del") blocks.splice(change.anchor, change.oldBlocks.length);
  else if (change.kind === "add") blocks.splice(change.anchor, 0, ...repl);
  else blocks.splice(change.anchor, change.oldBlocks.length, ...repl);
  return joinBlocks(blocks);
}
