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

/**
 * Markdown → HTML for the reader's document body. Matches the <Markdown>
 * component by wrapping the H1 text in `<span class="hl">` so the heading
 * gets the same accent highlight in the track-changes view.
 */
export function mdToHtmlDoc(md: string): string {
  return mdToHtml(md).replace(/<h1>([\s\S]*?)<\/h1>/g, '<h1><span class="hl">$1</span></h1>');
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
