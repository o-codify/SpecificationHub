import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import type { SearchHit, TreeItem } from "@hls/core";
import { api } from "../api";
import { useBranchParam } from "../hooks";
import { pathToSlug } from "../docpath";
import { statusColor, setViewAccent } from "../status";
import { StatusBadge } from "../components/StatusBadge";
import { ThemeToggle } from "../components/ThemeToggle";
import { Highlight } from "../components/Highlight";

export interface DocsContext {
  branch: string;
  tree: TreeItem[];
}

export function DocsLayout() {
  const [branch, setBranch] = useBranchParam();
  const [branches, setBranches] = useState<string[]>(["main"]);
  const [tree, setTree] = useState<TreeItem[]>([]);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[] | null>(null);
  const [searchedFor, setSearchedFor] = useState("");
  const [error, setError] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  useEffect(() => setViewAccent("docs"), []);

  useEffect(() => {
    api
      .branches()
      .then((r) => setBranches(r.branches.map((b) => b.name)))
      .catch(() => setBranches(["main"]));
  }, []);

  useEffect(() => {
    setError("");
    api
      .tree(branch)
      .then((r) => setTree(r.items))
      .catch((e) => setError(String(e.message ?? e)));
  }, [branch]);

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

  const currentSlug = useMemo(() => {
    const m = location.pathname.match(/^\/docs\/?(.*)$/);
    return m ? m[1] : "";
  }, [location.pathname]);

  const branchQuery = `?branch=${encodeURIComponent(branch)}`;

  return (
    <>
      <header className="topbar">
        <button className="menu-btn" aria-label="Menu" onClick={() => setSidebarOpen((o) => !o)}>
          ☰
        </button>
        <Link to={`/docs${branchQuery}`} className="brand" title="Docs home">
          HLS <b>Hub</b>
        </Link>
        <div className="spacer" />
        <Link className="admin-link" to="/admin">
          Admin
        </Link>
        <ThemeToggle />
      </header>

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
              {hits.length === 0 && (
                <div className="sb-empty">No matches for “{searchedFor}”.</div>
              )}
              {hits.map((hit) => (
                <Link
                  key={hit.path}
                  className="sb-result"
                  to={`/docs/${pathToSlug(hit.path)}${branchQuery}`}
                  onClick={() => {
                    clearSearch();
                    setSidebarOpen(false);
                  }}
                >
                  <div className="rt">
                    <Highlight text={hit.title} query={searchedFor} />
                  </div>
                  <div className="rs">
                    <Highlight text={hit.snippet} query={searchedFor} />
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="sb-list">
              {tree.map((item) => {
                const slug = pathToSlug(item.path);
                const active = slug === currentSlug;
                return (
                  <Link
                    key={item.path}
                    className={`sb-item${active ? " active" : ""}`}
                    to={`/docs/${slug}${branchQuery}`}
                    style={{ "--dot": statusColor(item.status) } as CSSProperties}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <span className="sb-name">
                      <i className="dot" />
                      <b>{item.title}</b>
                    </span>
                    <StatusBadge status={item.status} />
                  </Link>
                );
              })}
              {tree.length === 0 && !error && <div className="muted">No documents.</div>}
            </div>
          )}
          {error && <div className="banner bad">{error}</div>}
        </aside>

        <main className="doc-main">
          <Outlet context={{ branch, tree } satisfies DocsContext} />
        </main>
      </div>
    </>
  );
}
