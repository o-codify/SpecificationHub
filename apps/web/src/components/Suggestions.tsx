import { useState } from "react";
import { diffLines } from "diff";
import type { FileSuggestion } from "../api";
import { api } from "../api";
import { useToast } from "../toast";

function DiffBody({ base, head }: { base: string; head: string }) {
  const parts = diffLines(base, head);
  const lines: { cls: string; text: string }[] = [];
  for (const p of parts) {
    const cls = p.added ? "l-add" : p.removed ? "l-del" : "";
    const sign = p.added ? "+" : p.removed ? "-" : " ";
    p.value
      .replace(/\n$/, "")
      .split("\n")
      .forEach((ln) => lines.push({ cls, text: sign + " " + ln }));
  }
  return (
    <pre className="patch">
      {lines.map((l, i) => (
        <span key={i} className={l.cls}>
          {l.text || " "}
          {"\n"}
        </span>
      ))}
    </pre>
  );
}

interface Props {
  path: string;
  base: string;
  suggestions: FileSuggestion[];
  onResolved: () => void;
}

export function Suggestions({ path, base, suggestions, onResolved }: Props) {
  const toast = useToast();
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [busy, setBusy] = useState<string>("");

  const visible = suggestions.filter((s) => !dismissed.includes(s.branch));
  if (visible.length === 0) return null;

  const accept = async (branch: string) => {
    setBusy(branch);
    try {
      const res = await api.acceptSuggestion(path, branch, base);
      toast.show(
        <>
          Accepted change from <code>{branch}</code> · merged to <code>{base}</code>
          {res.pullRequest && (
            <>
              {" · "}
              <a href={res.pullRequest.url} target="_blank" rel="noreferrer">
                PR #{res.pullRequest.number} →
              </a>
            </>
          )}
        </>,
      );
      onResolved();
    } catch (e) {
      toast.show(<>Could not accept: {String((e as Error).message)}</>);
    } finally {
      setBusy("");
    }
  };

  return (
    <section className="suggestions">
      <h3 className="sug-h">
        Proposed changes <span className="sb-change">{visible.length}</span>
      </h3>
      {visible.map((s) => (
        <div className="diff-file" key={s.branch}>
          <div className="diff-head">
            <span className="diff-stat M">~</span>
            <span className="mono">from {s.branch}</span>
            <span style={{ marginLeft: "auto", display: "inline-flex", gap: 6 }}>
              <button
                className="btn btn-good sp-btn"
                disabled={!!busy}
                onClick={() => accept(s.branch)}
              >
                {busy === s.branch ? "Accepting…" : "Accept"}
              </button>
              <button
                className="btn btn-ghost sp-btn"
                disabled={!!busy}
                onClick={() => setDismissed((d) => [...d, s.branch])}
              >
                Reject
              </button>
            </span>
          </div>
          <DiffBody base={s.baseContent} head={s.headContent} />
        </div>
      ))}
    </section>
  );
}
