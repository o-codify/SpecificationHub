import { diffArrays, diffWords } from "diff";
import { mdToHtml } from "./markdownConvert";

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

/** Inline word-level replace woven into the paragraph: kept words stay, the
 *  changed run becomes <del>old</del><ins>new</ins> inside a clickable .sug. */
function inlineReplace(c: Change): string {
  const parts = diffWords(c.oldBlocks[0], c.newBlocks[0]);
  let md = "";
  let i = 0;
  while (i < parts.length) {
    if (!parts[i].added && !parts[i].removed) {
      md += parts[i].value;
      i++;
      continue;
    }
    let rem = "";
    let add = "";
    while (i < parts.length && (parts[i].added || parts[i].removed)) {
      if (parts[i].removed) rem += parts[i].value;
      else add += parts[i].value;
      i++;
    }
    md += `<span class="sug sug-inline" data-id="${c.id}" data-branch="${escAttr(c.branch)}">`;
    if (rem) md += `<del>${rem.trim()}</del> `;
    if (add) md += `<ins>${add.trim()}</ins>`;
    md += `</span>`;
  }
  return mdToHtml(md);
}

function sugBlock(c: Change): string {
  if (
    c.kind === "replace" &&
    c.oldBlocks.length === 1 &&
    c.newBlocks.length === 1 &&
    isProse(c.oldBlocks[0]) &&
    isProse(c.newBlocks[0])
  ) {
    return inlineReplace(c);
  }
  const open = `<div class="sug sug-${c.kind}" data-id="${c.id}" data-branch="${escAttr(c.branch)}">`;
  if (c.kind === "add") return open + mdToHtml(joinBlocks(c.newBlocks)) + `</div>`;
  if (c.kind === "del") return open + `<div class="sug-old">${mdToHtml(joinBlocks(c.oldBlocks))}</div></div>`;
  return (
    open +
    `<div class="sug-old">${mdToHtml(joinBlocks(c.oldBlocks))}</div>` +
    `<div class="sug-new">${mdToHtml(joinBlocks(c.newBlocks))}</div></div>`
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

/** Produce the new content for accepting one change (optionally with edited markdown). */
export function applyChange(baseMd: string, change: Change, edited?: string): string {
  const blocks = splitBlocks(baseMd);
  const repl = edited != null ? splitBlocks(edited) : change.newBlocks;
  if (change.kind === "del") blocks.splice(change.anchor, change.oldBlocks.length);
  else if (change.kind === "add") blocks.splice(change.anchor, 0, ...repl);
  else blocks.splice(change.anchor, change.oldBlocks.length, ...repl);
  return joinBlocks(blocks);
}
