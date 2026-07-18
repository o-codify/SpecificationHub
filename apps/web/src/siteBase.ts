/**
 * The site's path prefix — "" for a host-bound site, "/hls" when the binding is
 * a base URL with a path (docs.example.com/hls).
 *
 * Read synchronously from the server-injected `window.__SITE_META__` on the
 * initial document, because it must be known before the router mounts and
 * before the first API call. React Router's `basename` covers <Link>/navigate(),
 * but NOT hand-built URLs (fetch paths, asset URLs, links injected as raw HTML)
 * — those go through `withBase()`.
 */
function read(): string {
  const m = (window as unknown as { __SITE_META__?: { basePath?: unknown } }).__SITE_META__;
  const p = m && typeof m === "object" ? m.basePath : "";
  return typeof p === "string" && p.startsWith("/") ? p.replace(/\/+$/, "") : "";
}

export const siteBase = read();

/** Prefix a root-absolute path with the site's base path. */
export function withBase(p: string): string {
  if (!siteBase || !p.startsWith("/")) return p;
  return `${siteBase}${p}`;
}
