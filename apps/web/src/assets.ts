import { getToken } from "./api";
import { withBase } from "./siteBase";

/**
 * Build the served URL for a repo-relative image path (e.g. "assets/ab12.png").
 * Images live on the default branch, so no branch is needed. A token is appended
 * when present so <img> requests work on private sites (where the tag can't send
 * an Authorization header).
 */
export function assetUrl(repoPath: string): string {
  const clean = repoPath.replace(/^\.?\//, "");
  const t = getToken();
  return withBase(
    `/api/assets?path=${encodeURIComponent(clean)}${t ? `&token=${encodeURIComponent(t)}` : ""}`,
  );
}

/** True for an external/inline src we should leave untouched. */
function isExternal(src: string): boolean {
  return /^(https?:|data:|blob:)/i.test(src) || src.includes("/api/assets");
}

/** Resolve a Markdown image src to a served URL (repo paths → /api/assets). */
export function resolveImgSrc(src: string): string {
  if (!src) return src;
  if (isExternal(src)) return src;
  return assetUrl(src);
}

/** Resolve repo-path image srcs to served URLs inside an already-rendered DOM
 *  subtree (used by the dangerouslySetInnerHTML diff/track-changes views). */
export function resolveImages(root: HTMLElement | null): void {
  if (!root) return;
  root.querySelectorAll("img").forEach((img) => {
    const src = img.getAttribute("src") || "";
    if (src && !isExternal(src)) img.setAttribute("src", resolveImgSrc(src));
    img.classList.add("doc-img");
  });
}

/**
 * Rewrite stored `<img src="assets/…">` (from Markdown→HTML) into display URLs
 * for the contenteditable editor, stashing the original repo path in `data-path`
 * so the Markdown serializer can restore it on save.
 */
export function hydrateEditorImages(html: string): string {
  return html.replace(/<img\b[^>]*>/gi, (tag) => {
    if (/\bdata-path=/.test(tag)) return tag;
    const m = /\bsrc\s*=\s*"([^"]*)"/i.exec(tag);
    const src = m ? m[1] : "";
    if (!src || isExternal(src)) return tag;
    const repoPath = src.replace(/^\.?\//, "");
    return tag.replace(/\bsrc\s*=\s*"[^"]*"/i, `src="${assetUrl(repoPath)}" data-path="${repoPath}"`);
  });
}
