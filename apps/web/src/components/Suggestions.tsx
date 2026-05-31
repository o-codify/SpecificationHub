import { useState } from "react";
import { parseFrontmatter, serializeDoc } from "@spec/core";
import type { FileSuggestion } from "../api";
import { api } from "../api";
import { useToast } from "../toast";
import { changesFor } from "../trackChanges";
import { nextVersion } from "../version";

interface Props {
  path: string;
  base: string;
  suggestions: FileSuggestion[];
  onResolved: () => void;
}

/** Compact panel: accept ALL changes from a given branch at once (or reject). */
export function Suggestions({ path, base, suggestions, onResolved }: Props) {
  const toast = useToast();
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [busy, setBusy] = useState("");

  const visible = suggestions.filter((s) => !dismissed.includes(s.branch));
  if (visible.length === 0) return null;

  const acceptAll = async (s: FileSuggestion) => {
    setBusy(s.branch);
    try {
      const parsed = parseFrontmatter(s.headContent);
      const content = serializeDoc(
        { ...parsed.frontmatter, version: nextVersion(parsed.frontmatter.version) },
        parsed.content,
      );
      await api.acceptSuggestion(path, base, content, `Accept all changes from ${s.branch}`);
      toast.show(
        <>
          All changes from <code>{s.branch}</code> applied to <code>{base}</code>
        </>,
      );
      onResolved();
    } catch (e) {
      toast.show(<>Could not apply: {String((e as Error).message)}</>);
    } finally {
      setBusy("");
    }
  };

  return (
    <section className="suggestions">
      <h3 className="sug-h">
        Proposed changes <span className="sb-change">{visible.length}</span>
      </h3>
      <p className="muted" style={{ margin: "0 0 12px", fontSize: 13 }}>
        Accept individual edits inline above, or take a whole branch at once:
      </p>
      {visible.map((s) => {
        const n = changesFor(parseFrontmatter(s.baseContent).content, [
          { branch: s.branch, headMd: parseFrontmatter(s.headContent).content },
        ]).length;
        return (
          <div className="branch-row" key={s.branch}>
            <code>{s.branch}</code>
            <span className="muted" style={{ fontSize: 12.5 }}>
              {n} change{n === 1 ? "" : "s"}
            </span>
            <span style={{ marginLeft: "auto", display: "inline-flex", gap: 8 }}>
              <button className="btn btn-good sp-btn" disabled={!!busy} onClick={() => acceptAll(s)}>
                {busy === s.branch ? "Applying…" : "Accept all"}
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
        );
      })}
    </section>
  );
}
