import { useEffect, useState } from "react";
import { serializeDoc, type DiffFile } from "@spec/core";
import { api } from "../api";
import { useToast } from "../toast";

function DiffPatch({ patch }: { patch: string }) {
  const lines = patch.split("\n");
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
  const toast = useToast();
  const [branches, setBranches] = useState<string[]>(["main"]);
  const [base, setBase] = useState("main");
  const [head, setHead] = useState("");
  const [files, setFiles] = useState<DiffFile[] | null>(null);
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string>(""); // path being accepted, or "*" for all
  const [err, setErr] = useState("");

  useEffect(() => {
    api
      .branches()
      .then((r) => {
        const names = r.branches.map((b) => b.name);
        setBranches(names);
        setBase(r.default);
        const other = names.find((n) => n !== r.default);
        if (other) setHead(other);
      })
      .catch((e) => setErr(String(e.message)));
  }, []);

  const run = async (b = base, h = head) => {
    setErr("");
    setFiles(null);
    if (!h || h === b) return;
    try {
      // Only docs whose body meaningfully changed (ignores auto-version/whitespace).
      const [d, changed] = await Promise.all([api.diff(b, h), api.changedDocs(b, h)]);
      const keep = new Set(changed.paths);
      setFiles(d.files.filter((f) => keep.has(f.path)));
      setOpen(new Set()); // collapsed by default
    } catch (e) {
      setErr(String((e as Error).message));
    }
  };

  // Re-run whenever the branch pair changes.
  useEffect(() => {
    if (head) void run(base, head);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base, head]);

  const toggle = (path: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });

  const acceptOne = async (path: string) => {
    const d = await api.getDoc(head, path);
    await api.acceptSuggestion(path, base, serializeDoc(d.frontmatter, d.content), `Accept ${path} from ${head}`);
  };

  const accept = async (path: string) => {
    setBusy(path);
    setErr("");
    try {
      await acceptOne(path);
      toast.show(
        <>
          Accepted <code>{path}</code> into <code>{base}</code>
        </>,
      );
      await run();
    } catch (e) {
      setErr(String((e as Error).message));
    } finally {
      setBusy("");
    }
  };

  // "Accept all" applies the whole branch's content into base in ONE commit
  // (status/tags included, version re-stamped). It does NOT merge or touch the
  // branch's PR (individual accepts already commit to base, so the PR usually
  // diverged) and it leaves the branch in place — delete it from Branches if
  // you want. After it runs the branch simply shows no remaining changes.
  const acceptAll = async () => {
    if (!files || files.length === 0) return;
    const branch = head;
    setBusy("*");
    setErr("");
    try {
      const r = await api.acceptAll(base, branch, `Accept all changes from ${branch}`);
      toast.show(
        <>
          Accepted {r.count} document{r.count === 1 ? "" : "s"} from <code>{branch}</code> into{" "}
          <code>{base}</code>
        </>,
      );
      await run();
    } catch (e) {
      setErr(String((e as Error).message));
    } finally {
      setBusy("");
    }
  };

  return (
    <section className="card">
      <h2>Review changes</h2>
      <div className="row">
        <select className="field" value={head} style={{ width: 200 }} onChange={(e) => setHead(e.target.value)}>
          <option value="">branch…</option>
          {branches
            .filter((b) => b !== base)
            .map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
        </select>
        <span className="muted" style={{ fontSize: 13 }}>
          → into <code>{base}</code>
        </span>
        <button
          className="btn btn-good"
          style={{ marginLeft: "auto" }}
          disabled={!files || files.length === 0 || !!busy}
          onClick={acceptAll}
        >
          {busy === "*" ? "Accepting…" : "Accept all"}
        </button>
      </div>

      {err && <div className="banner bad" style={{ marginTop: 16 }}>{err}</div>}

      <div style={{ marginTop: 18 }}>
        {files && files.length === 0 && (
          <div className="diff-empty">
            No changes between <code>{head}</code> and <code>{base}</code>.
          </div>
        )}
        {files &&
          files.map((f) => {
            const expanded = open.has(f.path);
            return (
              <div key={f.path} className="diff-file">
                <div className="diff-head">
                  <button
                    className="sb-chev"
                    aria-label={expanded ? "Collapse" : "Expand"}
                    onClick={() => toggle(f.path)}
                  >
                    {expanded ? "▾" : "▸"}
                  </button>
                  <span className={`diff-stat ${f.status}`}>{f.status}</span>
                  <span className="mono" style={{ cursor: "pointer" }} onClick={() => toggle(f.path)}>
                    {f.path}
                  </span>
                  <span className="add">+{f.additions}</span>
                  <span className="del">−{f.deletions}</span>
                  <button
                    className="btn btn-good sp-btn"
                    style={{ marginLeft: "auto" }}
                    disabled={!!busy}
                    onClick={() => accept(f.path)}
                  >
                    {busy === f.path ? "Accepting…" : "Accept"}
                  </button>
                </div>
                {expanded && <DiffPatch patch={f.patch} />}
              </div>
            );
          })}
      </div>
    </section>
  );
}
