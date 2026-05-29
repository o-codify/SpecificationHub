import { useEffect, useState } from "react";
import type { DiffFile } from "@hls/core";
import { api } from "../api";

function DiffPatch({ patch }: { patch: string }) {
  const lines = patch.split("\n");
  // Drop the file header (everything before the first hunk) for a cleaner view.
  const firstHunk = lines.findIndex((l) => l.startsWith("@@"));
  const body = firstHunk >= 0 ? lines.slice(firstHunk) : lines;
  return (
    <pre className="patch">
      {body.map((line, i) => {
        let cls = "";
        if (line.startsWith("+") && !line.startsWith("+++")) cls = "l-add";
        else if (line.startsWith("-") && !line.startsWith("---")) cls = "l-del";
        else if (line.startsWith("@@")) cls = "l-hunk";
        return (
          <span key={i} className={cls}>
            {line || " "}
            {"\n"}
          </span>
        );
      })}
    </pre>
  );
}

export function AdminDiff() {
  const [branches, setBranches] = useState<string[]>(["main"]);
  const [base, setBase] = useState("main");
  const [head, setHead] = useState("");
  const [files, setFiles] = useState<DiffFile[] | null>(null);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    api
      .branches()
      .then((r) => {
        const names = r.branches.map((b) => b.name);
        setBranches(names);
        const other = names.find((n) => n !== "main");
        if (other) setHead(other);
      })
      .catch(() => {});
  }, []);

  const run = async () => {
    setErr("");
    setMsg("");
    setFiles(null);
    if (!head) {
      setErr("Choose a head branch");
      return;
    }
    try {
      const r = await api.diff(base, head);
      setFiles(r.files);
    } catch (e) {
      setErr(String((e as Error).message));
    }
  };

  const merge = async () => {
    setErr("");
    setMsg("");
    try {
      const r = await api.merge(base, head, `Merge ${head} into ${base}`);
      const prNote = r.pullRequest ? ` via PR #${r.pullRequest.number}` : "";
      setMsg(`Merged ${head} → ${base}${prNote}${r.sha ? ` — commit ${r.sha.slice(0, 8)}` : ""}.`);
      setFiles(null);
    } catch (e) {
      setErr(String((e as Error).message));
    }
  };

  return (
    <section className="card">
      <h2>Diff &amp; Merge</h2>
      <div className="row">
        <select
          className="field"
          value={base}
          style={{ width: 160 }}
          onChange={(e) => setBase(e.target.value)}
        >
          {branches.map((b) => (
            <option key={b} value={b}>
              base: {b}
            </option>
          ))}
        </select>
        <select
          className="field"
          value={head}
          style={{ width: 160 }}
          onChange={(e) => setHead(e.target.value)}
        >
          <option value="">head…</option>
          {branches.map((b) => (
            <option key={b} value={b}>
              head: {b}
            </option>
          ))}
        </select>
        <button onClick={run} className="btn btn-primary">
          Diff
        </button>
        <button onClick={merge} className="btn btn-good">
          Merge head → base
        </button>
      </div>
      {msg && <div className="banner good" style={{ marginTop: 16 }}>{msg}</div>}
      {err && <div className="banner bad" style={{ marginTop: 16 }}>{err}</div>}

      <div style={{ marginTop: 20 }}>
        {files && files.length === 0 && (
          <div className="diff-empty">No differences between {base} and {head}.</div>
        )}
        {files &&
          files.map((f) => (
            <div key={f.path} className="diff-file">
              <div className="diff-head">
                <span className={`diff-stat ${f.status}`}>{f.status}</span>
                <span className="mono">{f.path}</span>
                <span className="add">+{f.additions}</span>
                <span className="del">−{f.deletions}</span>
              </div>
              <DiffPatch patch={f.patch} />
            </div>
          ))}
      </div>
    </section>
  );
}
