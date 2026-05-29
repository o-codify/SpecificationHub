import { diffArrays } from "diff";
import { mdToHtml } from "./markdownConvert";

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

function sugBlock(c: Change): string {
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
