import { marked } from "marked";
import TurndownService from "turndown";

marked.setOptions({ gfm: true, breaks: false });

const turndown = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
  bulletListMarker: "-",
  emDelimiter: "*",
});

/** Markdown → HTML (for loading into the contenteditable editor / preview). */
export function mdToHtml(md: string): string {
  return marked.parse(md ?? "", { async: false }) as string;
}

/** Inline Markdown → HTML without a block <p> wrapper (bold/italic/links/code). */
export function mdInline(md: string): string {
  return marked.parseInline(md ?? "", { async: false }) as string;
}

/** HTML (from contenteditable) → Markdown (for saving to Git). */
export function htmlToMd(html: string): string {
  const md = turndown.turndown(html ?? "").trim();
  return md ? md + "\n" : "";
}

/** Strip a leading `# Title` line from markdown body (title is edited separately). */
export function stripLeadingH1(md: string): string {
  return md.replace(/^\s*#\s+.*(?:\r?\n)+/, "");
}
