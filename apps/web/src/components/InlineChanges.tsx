import { useMemo, useState } from "react";
import { parseFrontmatter, serializeDoc, type FrontMatter } from "@hls/core";
import type { FileSuggestion } from "../api";
import { api } from "../api";
import { useToast } from "../toast";
import { applyChange, changesFor, renderTrackedHtml, type Change } from "../trackChanges";
import { nextVersion } from "../version";

interface Props {
  path: string;
  base: string;
  content: string; // body markdown (frontmatter stripped)
  frontmatter: FrontMatter;
  suggestions: FileSuggestion[];
  onResolved: () => void;
}

interface Pop {
  id: string;
  x: number;
  y: number;
}

export function InlineChanges({ path, base, content, frontmatter, suggestions, onResolved }: Props) {
  const toast = useToast();
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [pop, setPop] = useState<Pop | null>(null);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState("");
  const [busy, setBusy] = useState(false);

  const changes = useMemo(
    () =>
      changesFor(
        content,
        suggestions.map((s) => ({ branch: s.branch, headMd: parseFrontmatter(s.headContent).content })),
      ),
    [content, suggestions],
  );
  const visible = changes.filter((c) => !dismissed.includes(c.id));
  const html = useMemo(() => renderTrackedHtml(content, visible), [content, visible]);

  const current = (): Change | undefined => changes.find((c) => c.id === pop?.id);

  const onClick = (e: React.MouseEvent) => {
    const el = (e.target as HTMLElement).closest(".sug") as HTMLElement | null;
    if (!el) {
      setPop(null);
      setEditing(false);
      return;
    }
    const id = el.dataset.id!;
    setPop({ id, x: Math.min(e.clientX, window.innerWidth - 240), y: e.clientY + 10 });
    setEditing(false);
  };

  const close = () => {
    setPop(null);
    setEditing(false);
  };

  const accept = async () => {
    const c = current();
    if (!c) return;
    setBusy(true);
    try {
      const nextBody = applyChange(content, c, editing ? editText : undefined);
      const full = serializeDoc({ ...frontmatter, version: nextVersion(frontmatter.version) }, nextBody);
      await api.acceptSuggestion(path, base, full, `Accept change from ${c.branch}`);
      toast.show(
        <>
          Change from <code>{c.branch}</code> applied to <code>{base}</code>
        </>,
      );
      close();
      onResolved();
    } catch (err) {
      toast.show(<>Could not apply: {String((err as Error).message)}</>);
    } finally {
      setBusy(false);
    }
  };

  const startEdit = () => {
    const c = current();
    if (!c) return;
    setEditText(c.newBlocks.join("\n\n"));
    setEditing(true);
  };
  const reject = () => {
    if (pop) setDismissed((d) => [...d, pop.id]);
    close();
  };

  const c = current();
  return (
    <>
      <div className="doc-body has-change" onClick={onClick} dangerouslySetInnerHTML={{ __html: html }} />
      {pop && c && (
        <div className="sug-pop open" style={{ left: pop.x, top: pop.y }} onClick={(e) => e.stopPropagation()}>
          <div className="sp-head">
            from <b>{c.branch}</b>
          </div>
          {editing ? (
            <>
              <textarea
                className="field"
                style={{ minHeight: 96, fontFamily: "var(--font-mono)", fontSize: 13, marginBottom: 8 }}
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
              />
              <div className="sp-acts">
                <button className="btn btn-good sp-btn" disabled={busy} onClick={accept}>
                  Apply
                </button>
                <button className="btn btn-ghost sp-btn" disabled={busy} onClick={() => setEditing(false)}>
                  Cancel
                </button>
              </div>
            </>
          ) : (
            <div className="sp-acts">
              <button className="btn btn-good sp-btn" disabled={busy} onClick={accept}>
                {busy ? "…" : "Accept"}
              </button>
              {c.kind !== "del" && (
                <button className="btn btn-ghost sp-btn" disabled={busy} onClick={startEdit}>
                  Edit
                </button>
              )}
              <button className="btn btn-ghost sp-btn" disabled={busy} onClick={reject}>
                Reject
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
