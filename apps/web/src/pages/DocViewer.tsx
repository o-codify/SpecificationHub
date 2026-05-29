import { useEffect, useState } from "react";
import { useLocation, useOutletContext } from "react-router-dom";
import type { Doc } from "@hls/core";
import { api } from "../api";
import { slugToPath } from "../docpath";
import type { CSSProperties } from "react";
import { Markdown } from "../components/Markdown";
import { StatusBadge } from "../components/StatusBadge";
import { statusColor } from "../status";
import type { DocsContext } from "./DocsLayout";

export function DocViewer() {
  const ctx = useOutletContext<DocsContext>();
  const location = useLocation();
  const [doc, setDoc] = useState<Doc | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const slug = (() => {
    const m = location.pathname.match(/^\/docs\/?(.*)$/);
    return m ? m[1] : "";
  })();

  useEffect(() => {
    if (ctx.tree.length === 0) return;
    setLoading(true);
    setError("");
    setDoc(null);

    const knownPaths = ctx.tree.map((t) => t.path);
    let path = slug ? slugToPath(slug, knownPaths) : null;
    if (!path && !slug) {
      // landing page: prefer introduction, else first doc
      path =
        knownPaths.find((p) => p.includes("00-introduction")) ?? knownPaths[0] ?? null;
    }
    if (!path) {
      setError(`Document not found: ${slug}`);
      setLoading(false);
      return;
    }

    api
      .getDoc(ctx.branch, path)
      .then((d) => setDoc(d))
      .catch((e) => setError(String(e.message ?? e)))
      .finally(() => setLoading(false));
  }, [slug, ctx.branch, ctx.tree]);

  if (loading) return <div className="muted pad">Loading…</div>;
  if (error) return <div className="banner bad">{error}</div>;
  if (!doc) return <div className="muted pad">Select a document.</div>;

  const fm = doc.frontmatter;
  return (
    <div style={{ "--hl": statusColor(String(fm.status ?? "")) } as CSSProperties}>
      <div className="doc-meta">
        <StatusBadge status={String(fm.status ?? "")} />
        {fm.version && <span className="pill">v{String(fm.version)}</span>}
        {Array.isArray(fm.tags) &&
          fm.tags.map((t) => (
            <span key={String(t)} className="tag">
              #{String(t)}
            </span>
          ))}
      </div>
      <div className="doc-path">{doc.path}</div>
      <div className="doc-rule" />
      <Markdown content={doc.content} currentPath={doc.path} branch={ctx.branch} />
    </div>
  );
}
