import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { serializeDoc, type Doc, type SearchHit, type TreeItem } from "@spec/core";
import { api, type FileSuggestion, type NewDoc } from "../api";
import { useAuth } from "../auth";
import { useLayout } from "../layout";
import { useToast } from "../toast";
import { useBranchParam } from "../hooks";
import { pathToSlug, slugToPath } from "../docpath";
import { statusColor } from "../status";
import { mdToHtml, stripLeadingH1 } from "../markdownConvert";
import { Markdown } from "../components/Markdown";
import { BranchChanges } from "../components/BranchChanges";
import { StatusBadge } from "../components/StatusBadge";
import { Highlight } from "../components/Highlight";
import { InlineEditor, type EditorInitial } from "../components/InlineEditor";
import { InlineChanges } from "../components/InlineChanges";
import { Suggestions } from "../components/Suggestions";
import { DocTree, buildDocTree } from "../components/DocTree";

type Mode = "view" | "edit" | "new";

export function DocsReader() {
  const { authed } = useAuth();
  const toast = useToast();
  const { sidebarOpen, setSidebarOpen } = useLayout();
  const [branch, setBranch] = useBranchParam();
  const [branches, setBranches] = useState<string[]>(["main"]);
  const [defaultBranch, setDefaultBranch] = useState("main");
  const [baseDoc, setBaseDoc] = useState<Doc | null>(null);
  const [tree, setTree] = useState<TreeItem[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [newDocs, setNewDocs] = useState<NewDoc[]>([]);
  // When the open doc is a brand-new file proposed on another branch (not yet in
  // the default branch), this holds that branch; otherwise null.
  const [newDocBranch, setNewDocBranch] = useState<string | null>(null);
  const [acceptingNew, setAcceptingNew] = useState(false);
  const [treeLoaded, setTreeLoaded] = useState(false);
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());
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
  const branchView = branch !== defaultBranch;

  const slug = useMemo(() => {
    const m = location.pathname.match(/^\/docs\/?(.*)$/);
    return m ? m[1] : "";
  }, [location.pathname]);

  useEffect(() => {
    api
      .branches()
      .then((r) => {
        setBranches(r.branches.map((b) => b.name));
        setDefaultBranch(r.default);
      })
      .catch(() => {});
  }, []);

  const loadTree = useCallback(() => {
    setTreeLoaded(false);
    api
      .tree(branch)
      .then((r) => setTree(r.items))
      .catch((e) => setError(String(e.message ?? e)))
      .finally(() => setTreeLoaded(true));
    if (branch !== defaultBranch) {
      // Branch view: mark docs that differ from the default branch.
      setNewDocs([]);
      api
        .changedDocs(defaultBranch, branch)
        .then((d) => {
          const c: Record<string, number> = {};
          for (const p of d.paths) c[p] = 1;
          setCounts(c);
        })
        .catch(() => setCounts({}));
    } else {
      api
        .suggestionSummary(branch)
        .then((r) => {
          setCounts(r.counts);
          setNewDocs(r.news ?? []);
        })
        .catch(() => {
          setCounts({});
          setNewDocs([]);
        });
    }
  }, [branch, defaultBranch, authed]);

  useEffect(loadTree, [loadTree]);

  const loadDoc = useCallback(() => {
    if (tree.length === 0 && newDocs.length === 0) {
      // No docs to open — clear the loader so the empty state can show.
      setLoading(false);
      setDoc(null);
      setBaseDoc(null);
      setSuggestions([]);
      setNewDocBranch(null);
      return;
    }
    const bv = branch !== defaultBranch;
    setMode("view");
    setLoading(true);
    setError("");
    setDoc(null);
    setSuggestions([]);
    setBaseDoc(null);
    setNewDocBranch(null);
    const treePaths = tree.map((t) => t.path);
    const known = [...treePaths, ...newDocs.map((n) => n.path)];
    let path = slug ? slugToPath(slug, known) : null;
    if (!path && !slug) path = treePaths.find((p) => p.includes("00-introduction")) ?? treePaths[0] ?? null;
    if (!path) {
      setError(`Document not found: ${slug}`);
      setLoading(false);
      return;
    }
    // A brand-new file proposed on a branch (present in `newDocs`, absent from the
    // default branch's tree) is fetched from that branch and shown read-as-new.
    const nd = !treePaths.includes(path) ? newDocs.find((n) => n.path === path) : undefined;
    const sourceBranch = nd ? nd.branch : branch;
    api
      .getDoc(sourceBranch, path)
      .then(async (d) => {
        setDoc(d);
        if (nd) {
          setNewDocBranch(nd.branch);
        } else if (bv) {
          // Branch view: diff against the default branch (main) only.
          try {
            setBaseDoc(await api.getDoc(defaultBranch, d.path));
          } catch {
            setBaseDoc(null);
          }
        } else {
          api
            .suggestions(d.path, branch)
            .then((r) => setSuggestions(r.suggestions))
            .catch(() => setSuggestions([]));
        }
      })
      .catch((e) => setError(String(e.message ?? e)))
      .finally(() => setLoading(false));
  }, [slug, branch, defaultBranch, tree, newDocs, authed]);

  useEffect(loadDoc, [loadDoc]);

  // Auto-expand the category path leading to the open document.
  useEffect(() => {
    if (!doc?.path) return;
    const parts = doc.path.split("/");
    parts.pop();
    const dirs: string[] = [];
    let p = "";
    for (const seg of parts) {
      p = p ? `${p}/${seg}` : seg;
      dirs.push(p);
    }
    setExpandedDirs((prev) => {
      const next = new Set(prev);
      let changed = false;
      for (const d of dirs) if (!next.has(d)) { next.add(d); changed = true; }
      return changed ? next : prev;
    });
  }, [doc?.path]);

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

  const acceptNewDoc = async () => {
    if (!doc || !newDocBranch) return;
    setAcceptingNew(true);
    try {
      const full = serializeDoc(doc.frontmatter, doc.content);
      await api.acceptSuggestion(doc.path, defaultBranch, full, `Add ${doc.path} from ${newDocBranch}`);
      toast.show(
        <>
          Added <code>{doc.path}</code> to <code>{defaultBranch}</code>
        </>,
      );
      loadTree();
      loadDoc();
    } catch (err) {
      toast.show(<>Could not add: {String((err as Error).message)}</>);
    } finally {
      setAcceptingNew(false);
    }
  };

  const fm = doc?.frontmatter;
  const hlStyle = { ["--hl" as string]: statusColor(String(fm?.status ?? "")) } as CSSProperties;
  // Branch view, whole-new doc: it exists on this branch but not on the default
  // branch (baseDoc fetch 404'd → null once loading settled).
  const isBranchNewDoc = branchView && !!doc && baseDoc === null && !loading && !error;
  const treePaths = useMemo(() => new Set(tree.map((t) => t.path)), [tree]);
  const sidebarItems = useMemo(
    () => [
      ...tree.map((t) => ({ path: t.path, title: t.title, status: t.status, isNew: false })),
      ...newDocs
        .filter((n) => !treePaths.has(n.path))
        .map((n) => ({ path: n.path, title: n.title, status: n.status, isNew: true })),
    ],
    [tree, newDocs, treePaths],
  );
  const treeNodes = useMemo(() => buildDocTree(sidebarItems), [sidebarItems]);
  const toggleDir = useCallback(
    (dirPath: string) =>
      setExpandedDirs((prev) => {
        const next = new Set(prev);
        if (next.has(dirPath)) next.delete(dirPath);
        else next.add(dirPath);
        return next;
      }),
    [],
  );

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
            <DocTree
              nodes={treeNodes}
              currentPath={doc?.path}
              counts={counts}
              expanded={expandedDirs}
              onOpen={openDoc}
              onToggle={toggleDir}
            />
            {sidebarItems.length === 0 && !error && <div className="muted">No documents.</div>}
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
        ) : loading || !treeLoaded ? (
          <div className="muted">Loading…</div>
        ) : error ? (
          <div className="banner bad">{error}</div>
        ) : doc && fm ? (
          <>
            <div className="doc-meta">
              <StatusBadge status={String(fm.status ?? "")} />
              <span className="pill">v{String(fm.version ?? "0.1.0")}</span>
              {(newDocBranch || isBranchNewDoc) && (
                <span
                  className="badge-new"
                  title={newDocBranch ? `New document proposed on ${newDocBranch}` : `New on ${branch} (not in ${defaultBranch})`}
                >
                  NEW
                </span>
              )}
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
            {newDocBranch ? (
              <>
                {authed && (
                  <div className="newdoc-bar">
                    <span>
                      New document proposed on <b>{newDocBranch}</b>
                    </span>
                    <button
                      className="btn btn-good sp-btn"
                      disabled={acceptingNew}
                      onClick={acceptNewDoc}
                    >
                      {acceptingNew ? "Adding…" : `Add to ${defaultBranch}`}
                    </button>
                  </div>
                )}
                <div className="doc-body">
                  <Markdown content={doc.content} currentPath={doc.path} branch={newDocBranch} />
                </div>
              </>
            ) : branchView ? (
              <BranchChanges
                path={doc.path}
                base={defaultBranch}
                branch={branch}
                baseBody={baseDoc?.content ?? ""}
                headBody={doc.content}
                frontmatter={fm}
                onReverted={() => {
                  loadDoc();
                  loadTree();
                }}
              />
            ) : suggestions.length > 0 ? (
              <InlineChanges
                path={doc.path}
                base={branch}
                content={doc.content}
                frontmatter={fm}
                suggestions={suggestions}
                readOnly={!authed}
                onResolved={() => {
                  loadDoc();
                  loadTree();
                }}
              />
            ) : (
              <div className="doc-body">
                <Markdown content={doc.content} currentPath={doc.path} branch={branch} />
              </div>
            )}
            {!branchView && authed && suggestions.length > 0 && (
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
        ) : sidebarItems.length === 0 ? (
          <div className="muted">
            No documents yet.{authed ? " Create one with “+ New document”." : ""}
          </div>
        ) : (
          <div className="muted">Select a document.</div>
        )}
      </main>
    </div>
  );
}
