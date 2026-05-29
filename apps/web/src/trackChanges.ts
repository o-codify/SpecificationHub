import { diffArrays } from "diff";
import { mdToHtml, mdInline } from "./markdownConvert";

/** A "prose" block is a plain paragraph (not heading/list/quote/code/table). */
const isProse = (b: string) => !/^(#{1,6}\s|>\s|[-*+]\s|\d+\.\s|```|\||\s{4})/.test(b.trim());

export type ChangeKind = "add" | "del" | "replace";

export interface Change {
  id: string;
  branch: string;
  kind: ChangeKind;
  anchor: number; // base block index this change attaches to
  oldBlocks: string[];
  newBlocks: string[];
}

/** Split markdown into top-level blocks (paragraphs/headings/etc.) on blank lines. */
export function splitBlocks(md: string): string[] {
  return md
    .replace(/\r\n/g, "\n")
    .trim()
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean);
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
function inlineReplace(c: Change): string {
  const a = c.oldBlocks[0].split(/(\s+)/);
  const b = c.newBlocks[0].split(/(\s+)/);
  let p = 0;
  while (p < a.length && p < b.length && a[p] === b[p]) p++;
  let s = 0;
  while (s < a.length - p && s < b.length - p && a[a.length - 1 - s] === b[b.length - 1 - s]) s++;
  const prefix = a.slice(0, p).join("");
  const oldMid = a.slice(p, a.length - s).join("").trim();
  const newMid = b.slice(p, b.length - s).join("").trim();
  const suffix = a.slice(a.length - s).join("");
  let inner = mdInline(prefix);
  inner += `<span class="sug" data-id="${c.id}" data-branch="${escAttr(c.branch)}">`;
  if (oldMid) inner += `<del>${mdInline(oldMid)}</del>`;
  if (newMid) inner += `<ins>${mdInline(newMid)}</ins>`;
  inner += `</span>`;
  inner += mdInline(suffix);
  return `<p>${inner}</p>`;
}

function sugBlock(c: Change): string {
  const attrs = `data-id="${c.id}" data-branch="${escAttr(c.branch)}"`;
  if (
    c.kind === "replace" &&
    c.oldBlocks.length === 1 &&
    c.newBlocks.length === 1 &&
    isProse(c.oldBlocks[0]) &&
    isProse(c.newBlocks[0])
  ) {
    return inlineReplace(c);
  }
  if (c.kind === "add") {
    return c.newBlocks.length === 1 && isProse(c.newBlocks[0])
      ? `<p class="sug add" ${attrs}>${mdInline(c.newBlocks[0])}</p>`
      : `<div class="sug add" ${attrs}>${mdToHtml(joinBlocks(c.newBlocks))}</div>`;
  }
  if (c.kind === "del") {
    return c.oldBlocks.length === 1 && isProse(c.oldBlocks[0])
      ? `<p class="sug del" ${attrs}>${mdInline(c.oldBlocks[0])}</p>`
      : `<div class="sug del" ${attrs}>${mdToHtml(joinBlocks(c.oldBlocks))}</div>`;
  }
  // multi-block replace → struck old callout + green new callout
  return (
    `<div class="sug del" ${attrs}>${mdToHtml(joinBlocks(c.oldBlocks))}</div>` +
    `<div class="sug add" ${attrs}>${mdToHtml(joinBlocks(c.newBlocks))}</div>`
  );
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
      html += mdToHtml(base[pos]);
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
