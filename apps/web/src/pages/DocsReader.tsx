import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { serializeDoc, type Doc, type SearchHit, type TreeItem } from "@spec/core";
import { api, type FileSuggestion, type NewDoc, type DeletedDoc } from "../api";
import { useAuth } from "../auth";
import { useLayout } from "../layout";
import { useToast } from "../toast";
import { useBranchParam } from "../hooks";
import { useBuildVersion } from "../brand";
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
  const buildVersion = useBuildVersion();
  const toast = useToast();
  const { sidebarOpen, setSidebarOpen } = useLayout();
  const [branch, setBranch] = useBranchParam();
  const [branches, setBranches] = useState<string[]>(["main"]);
  const [defaultBranch, setDefaultBranch] = useState("main");
  const [baseDoc, setBaseDoc] = useState<Doc | null>(null);
  const [tree, setTree] = useState<TreeItem[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [newDocs, setNewDocs] = useState<NewDoc[]>([]);
  // path → branch for docs in the default branch that a branch proposes deleting.
  const [delByPath, setDelByPath] = useState<Record<string, string>>({});
  const [deletingDoc, setDeletingDoc] = useState(false);
  // When the open doc is a brand-new file proposed on another branch (not yet in
  // the default branch), this holds that branch; otherwise null.
  const [newDocBranch, setNewDocBranch] = useState<string | null>(null);
  const [acceptingNew, setAcceptingNew] = useState(false);
  const [treeLoaded, setTreeLoaded] = useState(false);
  // On the default branch, whether the suggestions summary (which carries
  // new-doc-on-branch info) has loaded. Until it has, a slug missing from the
  // tree may still be a pending new doc — so we wait instead of showing "not
  // found" (avoids a flash before the branch data arrives).
  const [summaryLoaded, setSummaryLoaded] = useState(false);
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[] | null>(null);
  const [searchedFor, setSearchedFor] = useState("");

  // The desktop sidebar has no scrollbar of its own. Its inner wrapper is
  // translated so the menu scrolls *with the page* (by the same delta), clamped
  // to the menu's own content, and it is NOT reset when you switch docs.
  const sidebarRef = useRef<HTMLElement>(null);
  const sidebarScrollRef = useRef<HTMLDivElement>(null);
  const menuOffsetRef = useRef(0); // current menu scroll offset (px), persisted across nav
  const lastYRef = useRef(0); // last observed window.scrollY (for delta)
  const ignoreNextScrollRef = useRef(false); // swallow the programmatic scroll-to-top on nav

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
      // Branch view: the branch's tree is authoritative (no new-doc lookup).
      setNewDocs([]);
      setDelByPath({});
      setSummaryLoaded(true);
      api
        .changedDocs(defaultBranch, branch)
        .then((d) => {
          const c: Record<string, number> = {};
          for (const p of d.paths) c[p] = 1;
          setCounts(c);
        })
        .catch(() => setCounts({}));
    } else {
      setSummaryLoaded(false);
      api
        .suggestionSummary(branch)
        .then((r) => {
          setCounts(r.counts);
          setNewDocs(r.news ?? []);
          setDelByPath(Object.fromEntries((r.deletions ?? []).map((d: DeletedDoc) => [d.path, d.branch])));
        })
        .catch(() => {
          setCounts({});
          setNewDocs([]);
          setDelByPath({});
        })
        .finally(() => setSummaryLoaded(true));
    }
  }, [branch, defaultBranch, authed]);

  useEffect(loadTree, [loadTree]);

  const loadDoc = useCallback(() => {
    const bv = branch !== defaultBranch;
    if (tree.length === 0 && newDocs.length === 0) {
      // Nothing to open yet. On the default branch, the only doc(s) might be
      // pending new docs on a branch — keep loading until the summary arrives
      // rather than flashing the empty/not-found state.
      if (!bv && !summaryLoaded) {
        setLoading(true);
        return;
      }
      setLoading(false);
      setDoc(null);
      setBaseDoc(null);
      setSuggestions([]);
      setNewDocBranch(null);
      return;
    }
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
      // On the default branch the doc may exist only as a pending new doc on a
      // branch — wait for the summary before declaring it missing (no flash).
      if (!bv && !summaryLoaded) {
        setLoading(true);
        return;
      }
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
  }, [slug, branch, defaultBranch, tree, newDocs, summaryLoaded, authed]);

  useEffect(loadDoc, [loadDoc]);

  // Opening a doc starts the PAGE from the top (a navigation, not a kept scroll).
  // The menu must NOT jump to the top with it, so we swallow the scroll event the
  // programmatic reset fires (see the scroll effect below). Keyed on slug so
  // reloading the same doc (e.g. after accepting an edit) doesn't yank the page.
  useEffect(() => {
    if (window.scrollY !== 0) {
      ignoreNextScrollRef.current = true;
      window.scrollTo(0, 0);
    }
  }, [slug, branch]);

  // Drive the desktop menu's scroll from the page scroll: accumulate the page
  // scroll delta into menuOffset, clamp it to the menu's own content (cached in
  // maxRef so a scroll never reads layout), and translate the inner wrapper. No
  // separate scrollbar, and the offset persists across doc navigation (it lives
  // in a ref, untouched by the page reset above).
  const maxRef = useRef(0);
  const isDesktop = () =>
    typeof window !== "undefined" && window.matchMedia("(min-width: 761px)").matches;
  // Recompute the scroll range (on mount / resize / content change) and re-apply.
  const refreshMenu = useCallback(() => {
    const aside = sidebarRef.current;
    const inner = sidebarScrollRef.current;
    if (!aside || !inner) return;
    if (!isDesktop()) {
      inner.style.transform = "";
      maxRef.current = 0;
      return;
    }
    maxRef.current = Math.max(0, inner.scrollHeight - aside.clientHeight);
    let off = menuOffsetRef.current;
    if (off > maxRef.current) off = maxRef.current;
    if (off < 0) off = 0;
    menuOffsetRef.current = off;
    inner.style.transform = `translateY(${-off}px)`;
  }, []);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      const prev = lastYRef.current;
      lastYRef.current = y;
      // Swallow the programmatic scroll-to-top fired on doc open (keep the menu).
      if (ignoreNextScrollRef.current) {
        ignoreNextScrollRef.current = false;
        return;
      }
      const inner = sidebarScrollRef.current;
      if (!inner || !isDesktop()) return;
      let off = menuOffsetRef.current + (y - prev);
      if (off < 0) off = 0;
      else if (off > maxRef.current) off = maxRef.current;
      menuOffsetRef.current = off;
      inner.style.transform = `translateY(${-off}px)`;
    };
    lastYRef.current = window.scrollY;
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", refreshMenu);
    refreshMenu();
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", refreshMenu);
    };
  }, [refreshMenu]);

  // Re-measure when the menu's height can change (tree/search/expanded), so the
  // offset never exceeds the new content and the transform stays correct.
  useEffect(() => {
    refreshMenu();
  }, [refreshMenu, tree, newDocs, hits, expandedDirs, query]);

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
      await api.acceptSuggestion(doc.path, defaultBranch, full, `Add ${doc.path} from ${newDocBranch}`, newDocBranch);
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

  // When viewing the default branch, the branch (if any) proposing to delete the
  // open doc; lets us show a banner + an "Accept deletion" action.
  const delBranch = !branchView && doc ? delByPath[doc.path] : undefined;

  const acceptDeletion = async () => {
    if (!doc || !delBranch) return;
    setDeletingDoc(true);
    try {
      await api.acceptSuggestion(doc.path, defaultBranch, "", `Delete ${doc.path} from ${delBranch}`, delBranch, true);
      toast.show(
        <>
          Deleted <code>{doc.path}</code> from <code>{defaultBranch}</code>
        </>,
      );
      loadTree();
      navigate(`/docs?branch=${encodeURIComponent(branch)}`);
    } catch (err) {
      toast.show(<>Could not delete: {String((err as Error).message)}</>);
    } finally {
      setDeletingDoc(false);
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
      <aside ref={sidebarRef} className={`sidebar${sidebarOpen ? " open" : ""}`}>
       <div className="sidebar-scroll" ref={sidebarScrollRef}>
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
              deletions={delByPath}
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
        {buildVersion && (
          <div className="sb-version" title="Deployed build version">
            build {buildVersion}
          </div>
        )}
       </div>
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
            {/* Title fallback: docs are expected to open with a `# H1` (which the
                body renders). When a doc has no leading H1, show the frontmatter
                title so the reader isn't title-less. */}
            {fm?.title && !/^\s*#\s/.test(doc.content) && (
              <h1>
                <span className="hl">{String(fm.title)}</span>
              </h1>
            )}
            {delBranch && (
              <div className="newdoc-bar del-bar">
                <span>
                  Proposed for <b>deletion</b> on <b>{delBranch}</b>
                </span>
                {authed && (
                  <button className="btn btn-bad sp-btn" disabled={deletingDoc} onClick={acceptDeletion}>
                    {deletingDoc ? "Deleting…" : `Accept deletion`}
                  </button>
                )}
              </div>
            )}
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
