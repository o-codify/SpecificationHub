import { useEffect, useMemo, useState } from "react";
import type { FrontMatter } from "@hls/core";
import { api } from "../api";
import { useAuth } from "../auth";
import { useToast } from "../toast";
import { applyChanges, changesFor, renderTrackedHtml } from "../trackChanges";
import { nextVersion } from "../version";

interface Props {
  path: string;
  base: string; // default branch (main)
  branch: string; // the branch being viewed
  baseBody: string; // main's body
  headBody: string; // this branch's body
  frontmatter: FrontMatter; // this branch's frontmatter
  onReverted: () => void;
}

/**
 * Branch view: shows how THIS branch differs from the default branch (main),
 * inline (track-changes). Clicking a change offers "Revert" — restore main's
 * version for that change on this branch.
 */
export function BranchChanges({ path, base, branch, baseBody, headBody, frontmatter, onReverted }: Props) {
  const { authed } = useAuth();
  const toast = useToast();
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [pop, setPop] = useState<{ id: string; x: number; y: number } | null>(null);
  const [busy, setBusy] = useState(false);

  const changes = useMemo(
    () => changesFor(baseBody, [{ branch, headMd: headBody }]),
    [baseBody, headBody, branch],
  );
  const visible = changes.filter((c) => !dismissed.includes(c.id));
  const html = useMemo(() => renderTrackedHtml(baseBody, visible), [baseBody, visible]);

  const current = () => changes.find((c) => c.id === pop?.id);

  // Close the popover on any click outside it (and outside a change).
  useEffect(() => {
    if (!pop) return;
    const onDocClick = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest(".sug-pop") || t.closest(".sug")) return;
      setPop(null);
    };
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, [pop]);

  const onClick = (e: React.MouseEvent) => {
    if (!authed) return;
    const el = (e.target as HTMLElement).closest(".sug") as HTMLElement | null;
    if (!el) {
      setPop(null);
      return;
    }
    const r = el.getBoundingClientRect();
    setPop({ id: el.dataset.id!, x: Math.min(r.left, window.innerWidth - 230), y: r.bottom + 8 });
  };

  const revert = async () => {
    const c = current();
    if (!c) return;
    setBusy(true);
    try {
      // This branch = main + all its changes; reverting one = keep all the others.
      const newBody = applyChanges(baseBody, changes.filter((x) => x.id !== c.id));
      await api.putDoc(branch, path, { ...frontmatter, version: nextVersion(frontmatter.version) }, newBody);
      await api.commit(branch, `Revert ${path} change to ${base}`);
      toast.show(
        <>
          Reverted to <code>{base}</code> on <code>{branch}</code>
        </>,
      );
      setPop(null);
      onReverted();
    } catch (e) {
      toast.show(<>Could not revert: {String((e as Error).message)}</>);
    } finally {
      setBusy(false);
    }
  };

  const c = current();
  return (
    <>
      <div className="doc-body has-change" onClick={onClick} dangerouslySetInnerHTML={{ __html: html }} />
      {authed && pop && c && (
        <div className="sug-pop open" style={{ left: pop.x, top: pop.y }} onClick={(e) => e.stopPropagation()}>
          <div className="sp-acts">
            <button className="btn btn-ghost sp-btn" disabled={busy} onClick={revert}>
              {busy ? "Reverting…" : "Revert"}
            </button>
            <button
              className="btn btn-ghost sp-btn"
              disabled={busy}
              onClick={() => {
                setDismissed((d) => [...d, pop.id]);
                setPop(null);
              }}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </>
  );
}
