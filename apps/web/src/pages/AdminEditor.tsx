import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import type { FrontMatter } from "@hls/core";
import { api, ApiError, type PullRequestInfo } from "../api";
import { Markdown } from "../components/Markdown";

const STATUSES = ["draft", "review", "stable", "deprecated", "experimental"];

export function AdminEditor() {
  const [params, setParams] = useSearchParams();
  const [branches, setBranches] = useState<string[]>(["main"]);
  const [branch, setBranch] = useState(params.get("branch") || "main");
  const [path, setPath] = useState(params.get("path") || "");

  const [id, setId] = useState("");
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState("draft");
  const [version, setVersion] = useState("0.1.0");
  const [tags, setTags] = useState("");
  const [content, setContent] = useState("");

  const [isNew, setIsNew] = useState(false);
  const [commitMsg, setCommitMsg] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [pr, setPr] = useState<PullRequestInfo | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.branches().then((r) => setBranches(r.branches.map((b) => b.name))).catch(() => {});
  }, []);

  const load = async () => {
    setErr("");
    setMsg("");
    if (!path) return;
    try {
      const doc = await api.getDoc(branch, path);
      const fm = doc.frontmatter;
      setId(String(fm.id ?? ""));
      setTitle(String(fm.title ?? ""));
      setStatus(String(fm.status ?? "draft"));
      setVersion(String(fm.version ?? "0.1.0"));
      setTags(Array.isArray(fm.tags) ? fm.tags.join(", ") : "");
      setContent(doc.content);
      setIsNew(false);
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) {
        setIsNew(true);
        setContent(`# ${title || "New document"}\n`);
        setMsg("New file — fill in frontmatter and save to create it.");
      } else {
        setErr(String((e as Error).message));
      }
    }
  };

  useEffect(() => {
    if (path) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const buildFrontmatter = (): FrontMatter => ({
    id,
    title,
    status: status as FrontMatter["status"],
    version,
    tags: tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean),
  });

  // Save = write + commit + (in GitHub mode) push & open/refresh the PR — one action.
  const publish = async () => {
    setErr("");
    setMsg("");
    setPr(null);
    setBusy(true);
    try {
      const fm = buildFrontmatter();
      if (isNew) {
        await api.createDoc(branch, path, fm, content);
        setIsNew(false);
      } else {
        await api.putDoc(branch, path, fm, content);
      }
      const res = await api.commit(branch, commitMsg || `Update ${path}`);
      setPr(res.pullRequest);
      setMsg(`Saved & pushed — commit ${res.sha.slice(0, 8)} on ${res.branch}.`);
      setCommitMsg("");
    } catch (e) {
      if (e instanceof ApiError && e.body.fields) {
        setErr(`${e.body.error}`);
      } else {
        setErr(String((e as Error).message));
      }
    } finally {
      setBusy(false);
    }
  };

  const applyTarget = () => {
    const next = new URLSearchParams(params);
    next.set("branch", branch);
    next.set("path", path);
    setParams(next);
    load();
  };

  return (
    <section className="card editor">
      <h2>Editor</h2>
      <div className="row" style={{ flexWrap: "nowrap", marginBottom: 16 }}>
        <select
          className="field"
          style={{ width: 120, flex: "0 0 auto" }}
          value={branch}
          onChange={(e) => setBranch(e.target.value)}
        >
          {branches.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
        <input
          className="field grow"
          placeholder="docs/04-gait-cycle/index.md"
          value={path}
          onChange={(e) => setPath(e.target.value)}
        />
        <button className="btn btn-primary" style={{ flex: "0 0 auto" }} onClick={applyTarget}>
          Load
        </button>
      </div>

      {branch === "main" && (
        <div className="banner" style={{ marginBottom: 20 }}>
          You are on <code>main</code>. Direct writes to main are blocked — switch to or
          create a branch (e.g. <code>ai/…</code>).
        </div>
      )}

      <div className="ed-meta">
        <div>
          <label className="lbl">id</label>
          <input className="field" value={id} onChange={(e) => setId(e.target.value)} />
        </div>
        <div>
          <label className="lbl">title</label>
          <input className="field" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <label className="lbl">status</label>
          <select className="field" value={status} onChange={(e) => setStatus(e.target.value)}>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="lbl">version</label>
          <input className="field" value={version} onChange={(e) => setVersion(e.target.value)} />
        </div>
        <div className="grow2">
          <label className="lbl">tags (comma-separated)</label>
          <input className="field" value={tags} onChange={(e) => setTags(e.target.value)} />
        </div>
      </div>

      <div className="ed-cols">
        <textarea
          className="field"
          rows={14}
          style={{ fontFamily: "var(--font-mono)", fontSize: "13.5px", minHeight: 340 }}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          spellCheck={false}
        />
        <div className="preview">
          <Markdown content={content} currentPath={path} branch={branch} />
        </div>
      </div>

      <div className="row" style={{ flexWrap: "nowrap" }}>
        <input
          className="field grow"
          placeholder="commit message (optional)"
          value={commitMsg}
          onChange={(e) => setCommitMsg(e.target.value)}
        />
        <button
          className="btn btn-primary"
          style={{ flex: "0 0 auto" }}
          disabled={busy}
          onClick={publish}
        >
          {busy ? "Saving…" : isNew ? "Create & push" : "Save & push"}
        </button>
      </div>

      {msg && (
        <div className="banner good" style={{ marginTop: 16 }}>
          {msg}{" "}
          {pr && (
            <a href={pr.url} target="_blank" rel="noreferrer">
              View PR #{pr.number} on GitHub →
            </a>
          )}
        </div>
      )}
      {err && (
        <div className="banner bad" style={{ marginTop: 16 }}>
          {err}
        </div>
      )}
    </section>
  );
}
