import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import type { Doc, SearchHit, TreeItem } from "@hls/core";
import { api, type FileSuggestion } from "../api";
import { useAuth } from "../auth";
import { useLayout } from "../layout";
import { useBranchParam } from "../hooks";
import { pathToSlug, slugToPath } from "../docpath";
import { statusColor } from "../status";
import { mdToHtml, stripLeadingH1 } from "../markdownConvert";
import { Markdown } from "../components/Markdown";
import { StatusBadge } from "../components/StatusBadge";
import { Highlight } from "../components/Highlight";
import { InlineEditor, type EditorInitial } from "../components/InlineEditor";
import { Suggestions } from "../components/Suggestions";

type Mode = "view" | "edit" | "new";

export function DocsReader() {
  const { authed } = useAuth();
  const { sidebarOpen, setSidebarOpen } = useLayout();
  const [branch, setBranch] = useBranchParam();
  const [branches, setBranches] = useState<string[]>(["main"]);
  const [tree, setTree] = useState<TreeItem[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[] | null>(null);
  const [searchedFor, setSearchedFor] = useState("");

  const [doc, setDoc] = useState<Doc | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<Mode>("view");
  const [editorInit, setEditorInit] = useState<EditorInitial | null>(null);
  const [suggestions, setSuggestions] = useState<FileSuggestion[]>([]);

  const location = useLocation();
  const navigate = useNavigate();
  const branchQuery = `?branch=${encodeURIComponent(branch)}`;

  const slug = useMemo(() => {
    const m = location.pathname.match(/^\/docs\/?(.*)$/);
    return m ? m[1] : "";
  }, [location.pathname]);

  useEffect(() => {
    api.branches().then((r) => setBranches(r.branches.map((b) => b.name))).catch(() => {});
  }, []);

  const loadTree = useCallback(() => {
    api
      .tree(branch)
      .then((r) => setTree(r.items))
      .catch((e) => setError(String(e.message ?? e)));
    if (authed) {
      api.suggestionSummary(branch).then((r) => setCounts(r.counts)).catch(() => setCounts({}));
    } else {
      setCounts({});
    }
  }, [branch, authed]);

  useEffect(loadTree, [loadTree]);

  const loadDoc = useCallback(() => {
    if (tree.length === 0) return;
    setMode("view");
    setLoading(true);
    setError("");
    setDoc(null);
    setSuggestions([]);
    const known = tree.map((t) => t.path);
    let path = slug ? slugToPath(slug, known) : null;
    if (!path && !slug) path = known.find((p) => p.includes("00-introduction")) ?? known[0] ?? null;
    if (!path) {
      setError(`Document not found: ${slug}`);
      setLoading(false);
      return;
    }
    api
      .getDoc(branch, path)
      .then((d) => {
        setDoc(d);
        if (authed) {
          api
            .suggestions(d.path, branch)
            .then((r) => setSuggestions(r.suggestions))
            .catch(() => setSuggestions([]));
        }
      })
      .catch((e) => setError(String(e.message ?? e)))
      .finally(() => setLoading(false));
  }, [slug, branch, tree, authed]);

  useEffect(loadDoc, [loadDoc]);

  const openDoc = (p: string) => {
    setSidebarOpen(false);
    navigate(`/docs/${pathToSlug(p)}${branchQuery}`);
  };

  const runSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) {
      setHits(null);
      return;
    }
    try {
      const r = await api.search(branch, q);
      setHits(r.hits);
      setSearchedFor(q);
    } catch (err) {
      setError(String((err as Error).message));
    }
  };
  const clearSearch = () => {
    setQuery("");
    setHits(null);
  };

  const startEdit = () => {
    if (!doc) return;
    setEditorInit({
      path: doc.path,
      frontmatter: doc.frontmatter,
      bodyHtml: mdToHtml(stripLeadingH1(doc.content)),
    });
    setMode("edit");
  };
  const startNew = () => {
    setSidebarOpen(false);
    setEditorInit({
      path: "",
      frontmatter: { id: "", title: "", status: "draft", version: "0.1.0", tags: [] },
      bodyHtml: "",
    });
    setMode("new");
  };

  const fm = doc?.frontmatter;
  const hlStyle = { ["--hl" as string]: statusColor(String(fm?.status ?? "")) } as CSSProperties;

  return (
    <div className="docs-shell">
      <aside className={`sidebar${sidebarOpen ? " open" : ""}`}>
        <div className="sb-head">
          <span className="t">Documentation</span>
          <button className="sb-close" aria-label="Close" onClick={() => setSidebarOpen(false)}>
            ✕
          </button>
        </div>
        <div>
          <label className="lbl">Branch</label>
          <select className="field" value={branch} onChange={(e) => setBranch(e.target.value)}>
            {branches.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>
        <form onSubmit={runSearch}>
          <input
            className="field"
            placeholder="Search docs…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </form>

        {hits !== null ? (
          <div className="sb-list">
            <div className="sb-results-head">
              <span>
                {hits.length} result{hits.length === 1 ? "" : "s"}
              </span>
              <button onClick={clearSearch}>clear</button>
            </div>
            {hits.length === 0 && <div className="sb-empty">No matches for “{searchedFor}”.</div>}
            {hits.map((hit) => (
              <div
                key={hit.path}
                className="sb-result"
                onClick={() => {
                  clearSearch();
                  openDoc(hit.path);
                }}
              >
                <div className="rt">
                  <Highlight text={hit.title} query={searchedFor} />
                </div>
                <div className="rs">
                  <Highlight text={hit.snippet} query={searchedFor} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="sb-list">
            {tree.map((item) => {
              const active = doc?.path === item.path;
              const n = counts[item.path] || 0;
              return (
                <div
                  key={item.path}
                  className={`sb-item${active ? " active" : ""}`}
                  style={{ ["--dot" as string]: statusColor(item.status) } as CSSProperties}
                  onClick={() => openDoc(item.path)}
                >
                  <span className="sb-name">
                    <i className="dot" />
                    <b>{item.title}</b>
                  </span>
                  {n > 0 && (
                    <span className="sb-change" title={`${n} proposed change${n > 1 ? "s" : ""}`}>
                      {n}
                    </span>
                  )}
                  <StatusBadge status={item.status} />
                </div>
              );
            })}
            {tree.length === 0 && !error && <div className="muted">No documents.</div>}
          </div>
        )}

        {authed && (
          <button className="sb-create" onClick={startNew}>
            + New document
          </button>
        )}
      </aside>

      <main className="doc-main" style={hlStyle}>
        {mode !== "view" && editorInit ? (
          <InlineEditor
            initial={editorInit}
            isNew={mode === "new"}
            branch={branch}
            onCancel={() => {
              setMode("view");
              if (mode === "new") loadDoc();
            }}
            onSaved={(savedPath) => {
              setMode("view");
              loadTree();
              navigate(`/docs/${pathToSlug(savedPath)}${branchQuery}`);
              loadDoc();
            }}
          />
        ) : loading ? (
          <div className="muted">Loading…</div>
        ) : error ? (
          <div className="banner bad">{error}</div>
        ) : doc && fm ? (
          <>
            <div className="doc-meta">
              <StatusBadge status={String(fm.status ?? "")} />
              <span className="pill">v{String(fm.version ?? "0.1.0")}</span>
              {Array.isArray(fm.tags) &&
                fm.tags.map((t) => (
                  <span key={String(t)} className="tag">
                    #{String(t)}
                  </span>
                ))}
              {authed && (
                <button className="btn btn-ghost doc-edit-btn" onClick={startEdit}>
                  ✎ Edit
                </button>
              )}
            </div>
            <div className="doc-path">{doc.path}</div>
            <div className="doc-rule" />
            <div className="doc-body">
              <Markdown content={doc.content} currentPath={doc.path} branch={branch} />
            </div>
            {authed && (
              <Suggestions
                path={doc.path}
                base={branch}
                suggestions={suggestions}
                onResolved={() => {
                  loadDoc();
                  loadTree();
                }}
              />
            )}
          </>
        ) : (
          <div className="muted">Select a document.</div>
        )}
      </main>
    </div>
  );
}
