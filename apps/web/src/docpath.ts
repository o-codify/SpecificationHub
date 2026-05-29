/** Helpers to translate between doc file paths and `/docs/:slug` URLs. */

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
 * Resolve a relative markdown link (href) found inside `currentPath` to an
 * in-app `/docs/:slug` route. Returns null if the href is external/non-doc.
 */
export function resolveDocHref(currentPath: string, href: string, branch: string): string | null {
  if (!href) return null;
  if (/^[a-z]+:/i.test(href) || href.startsWith("#") || href.startsWith("//")) return null;
  const dir = currentPath.includes("/") ? currentPath.slice(0, currentPath.lastIndexOf("/")) : "";
  const joined = normalize(`${dir}/${href}`);
  if (!joined.startsWith("docs/") || !joined.toLowerCase().endsWith(".md")) return null;
  const slug = pathToSlug(joined);
  return `/docs/${slug}?branch=${encodeURIComponent(branch)}`;
}
