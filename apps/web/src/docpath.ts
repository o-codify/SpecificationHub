/** Helpers to translate between doc file paths and `/docs/:slug` URLs. */
import { withBase } from "./siteBase";

/** docs/04-gait-cycle/index.md -> 04-gait-cycle ; docs/glossary.md -> glossary */
export function pathToSlug(path: string): string {
  let s = path.replace(/^docs\//, "");
  if (s.toLowerCase().endsWith("/index.md")) s = s.slice(0, -"/index.md".length);
  else if (s.toLowerCase().endsWith(".md")) s = s.slice(0, -".md".length);
  return s;
}

/** Resolve a slug to an actual file path using the known tree paths. */
export function slugToPath(slug: string, knownPaths: string[]): string | null {
  const clean = slug.replace(/^\/+|\/+$/g, "");
  const candidates = [`docs/${clean}/index.md`, `docs/${clean}.md`];
  for (const c of candidates) {
    if (knownPaths.includes(c)) return c;
  }
  // exact path passed as slug
  if (knownPaths.includes(`docs/${clean}`)) return `docs/${clean}`;
  return null;
}

function normalize(p: string): string {
  const parts = p.split("/");
  const out: string[] = [];
  for (const part of parts) {
    if (part === "" || part === ".") continue;
    if (part === "..") out.pop();
    else out.push(part);
  }
  return out.join("/");
}

/**
 * Rewrite relative doc links inside a generated HTML string to in-app
 * `/docs/:slug` routes (resolved relative to `currentPath`). Used by the
 * track-changes views, which inject raw HTML and otherwise leave `./x.md`
 * to be (mis)resolved by the browser against the current URL. External and
 * non-doc links are left untouched.
 */
export function rewriteDocLinks(html: string, currentPath: string, branch: string): string {
  return html.replace(/(<a\b[^>]*\bhref=")([^"]*)(")/gi, (m, pre, href, post) => {
    const resolved = resolveDocHref(currentPath, href, branch);
    // Raw <a href> bypasses the router, so the site's base path must be added
    // here (resolveDocHref stays prefix-free for <Link>, which is basename-aware).
    return resolved ? `${pre}${withBase(resolved)}${post}` : m;
  });
}

/**
 * Resolve a relative markdown link (href) found inside `currentPath` to an
 * in-app `/docs/:slug` route. Returns null if the href is external/non-doc.
 */
export function resolveDocHref(currentPath: string, href: string, branch: string): string | null {
  if (!href) return null;
  if (/^[a-z]+:/i.test(href) || href.startsWith("#") || href.startsWith("//")) return null;
  // Split off a #heading fragment (and any ?query) before path resolution, then
  // carry the fragment onto the in-app route so deep links to a heading work.
  const hashIdx = href.indexOf("#");
  const frag = hashIdx >= 0 ? href.slice(hashIdx) : "";
  let pathPart = (hashIdx >= 0 ? href.slice(0, hashIdx) : href).split("?")[0];
  if (!pathPart) return null;
  const dir = currentPath.includes("/") ? currentPath.slice(0, currentPath.lastIndexOf("/")) : "";
  const joined = normalize(`${dir}/${pathPart}`);
  if (!joined.startsWith("docs/") || !joined.toLowerCase().endsWith(".md")) return null;
  const slug = pathToSlug(joined);
  return `/docs/${slug}?branch=${encodeURIComponent(branch)}${frag}`;
}
