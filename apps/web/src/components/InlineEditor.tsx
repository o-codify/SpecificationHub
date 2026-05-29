import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { FrontMatter } from "@hls/core";
import { api, ApiError, type PullRequestInfo } from "../api";
import { htmlToMd } from "../markdownConvert";
import { statusColor } from "../status";
import { useToast } from "../toast";

const STATUSES = ["draft", "review", "stable", "deprecated", "experimental"] as const;

const SLASH: { ic: string; k: string; run: () => void }[] = [
  { ic: "H2", k: "Heading", run: () => document.execCommand("formatBlock", false, "h2") },
  { ic: "H3", k: "Subheading", run: () => document.execCommand("formatBlock", false, "h3") },
  { ic: "B", k: "Bold", run: () => document.execCommand("bold") },
  { ic: "I", k: "Italic", run: () => document.execCommand("italic") },
  { ic: "•", k: "Bulleted list", run: () => document.execCommand("insertUnorderedList") },
  { ic: "1.", k: "Numbered list", run: () => document.execCommand("insertOrderedList") },
  { ic: "”", k: "Quote", run: () => document.execCommand("formatBlock", false, "blockquote") },
  { ic: "</>", k: "Code block", run: () => document.execCommand("formatBlock", false, "pre") },
  { ic: "—", k: "Divider", run: () => document.execCommand("insertHorizontalRule") },
];

function slugify(t: string): string {
  return t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "untitled";
}

export interface EditorInitial {
  path: string;
  frontmatter: FrontMatter;
  bodyHtml: string;
}

interface Props {
  initial: EditorInitial;
  isNew: boolean;
  branch: string;
  onCancel: () => void;
  onSaved: (path: string, title: string) => void;
}

export function InlineEditor({ initial, isNew, branch, onCancel, onSaved }: Props) {
  const toast = useToast();
  const titleRef = useRef<HTMLSpanElement>(null);
  const pathRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const slashRef = useRef<HTMLDivElement>(null);
  const pathEdited = useRef(false);

  const [status, setStatus] = useState<string>(String(initial.frontmatter.status || "draft"));
  const [statusMenu, setStatusMenu] = useState(false);
  const [tags, setTags] = useState<string[]>(initial.frontmatter.tags ?? []);
  const [tagInput, setTagInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [slash, setSlash] = useState<{ open: boolean; x: number; y: number; active: number }>({
    open: false,
    x: 0,
    y: 0,
    active: 0,
  });

  // Seed the uncontrolled contenteditable regions once.
  useEffect(() => {
    if (titleRef.current) titleRef.current.textContent = String(initial.frontmatter.title || "");
    if (bodyRef.current) bodyRef.current.innerHTML = initial.bodyHtml || "";
    if (pathRef.current) pathRef.current.textContent = initial.path || "";
    if (isNew) setTimeout(() => titleRef.current?.focus(), 40);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hl = { ["--hl" as string]: statusColor(status) } as CSSProperties;

  const onTitleInput = () => {
    if (isNew && !pathEdited.current && pathRef.current && titleRef.current) {
      pathRef.current.textContent = `docs/${slugify(titleRef.current.textContent || "")}/index.md`;
    }
  };

  const openSlash = () => {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;
    const r = sel.getRangeAt(0).getClientRects()[0] || sel.getRangeAt(0).getBoundingClientRect();
    setSlash({
      open: true,
      x: Math.min(r.left || 120, window.innerWidth - 230),
      y: (r.bottom || 140) + 6,
      active: 0,
    });
  };
  const closeSlash = () => setSlash((s) => ({ ...s, open: false }));
  const applySlash = (i: number) => {
    closeSlash();
    const sel = window.getSelection();
    if (sel && sel.rangeCount) {
      sel.modify("extend", "backward", "character");
      if (sel.toString() === "/") document.execCommand("delete");
      else sel.collapseToEnd();
    }
    SLASH[i].run();
    bodyRef.current?.focus();
  };

  const onBodyKeyUp = (e: React.KeyboardEvent) => {
    if (e.key === "/") openSlash();
  };
  const onBodyKeyDown = (e: React.KeyboardEvent) => {
    if (!slash.open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSlash((s) => ({ ...s, active: (s.active + 1) % SLASH.length }));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSlash((s) => ({ ...s, active: (s.active - 1 + SLASH.length) % SLASH.length }));
    } else if (e.key === "Enter") {
      e.preventDefault();
      applySlash(slash.active);
    } else if (e.key === "Escape") {
      closeSlash();
    }
  };

  const addTag = (raw: string) => {
    const v = raw.trim().replace(/^#+/, "");
    if (v && !tags.includes(v)) setTags([...tags, v]);
    setTagInput("");
  };

  const save = async () => {
    setErr("");
    const title = (titleRef.current?.textContent || "").trim() || "Untitled";
    const path = isNew
      ? (pathRef.current?.textContent || "").trim() || `docs/${slugify(title)}/index.md`
      : initial.path;
    const bodyMd = htmlToMd(bodyRef.current?.innerHTML || "");
    const content = `# ${title}\n\n${bodyMd}`;
    const frontmatter: FrontMatter = {
      ...initial.frontmatter,
      id: String(initial.frontmatter.id || slugify(title)),
      title,
      status: status as FrontMatter["status"],
      version: String(initial.frontmatter.version || "0.1.0"),
      tags,
    };
    setBusy(true);
    try {
      if (isNew) await api.createDoc(branch, path, frontmatter, content);
      else await api.putDoc(branch, path, frontmatter, content);
      let pr: PullRequestInfo | null = null;
      try {
        const res = await api.commit(branch, `Update ${path}`);
        pr = res.pullRequest;
        toast.show(
          <>
            Saved &amp; pushed — commit <code>{res.sha.slice(0, 7)}</code> on{" "}
            <code>{res.branch}</code>
            {pr && (
              <>
                {" · "}
                <a href={pr.url} target="_blank" rel="noreferrer">
                  View PR #{pr.number} →
                </a>
              </>
            )}
          </>,
        );
      } catch {
        toast.show(<>Saved to branch (staged).</>);
      }
      onSaved(path, title);
    } catch (e) {
      setErr(e instanceof ApiError ? e.body.error : String((e as Error).message));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={hl}>
      <div className="doc-meta">
        <span className="status-edit">
          <button
            type="button"
            className="badge-draft status-badge"
            style={{ ["--c" as string]: statusColor(status) } as CSSProperties}
            onClick={(e) => {
              e.stopPropagation();
              setStatusMenu((v) => !v);
            }}
          >
            {status.toUpperCase()}
          </button>
          <div className={`status-menu${statusMenu ? " open" : ""}`}>
            {STATUSES.map((o) => (
              <div
                key={o}
                className={`status-opt${o === status ? " sel" : ""}`}
                onClick={() => {
                  setStatus(o);
                  setStatusMenu(false);
                }}
              >
                <span className="sdot" style={{ ["--sd" as string]: statusColor(o) } as CSSProperties} />
                {o}
              </div>
            ))}
          </div>
        </span>
        <span className="pill">v{String(initial.frontmatter.version || "0.1.0")}</span>
        <span className="tags-edit">
          {tags.map((t) => (
            <span className="tag-chip" key={t}>
              #{t}
              <button type="button" className="tag-x" onClick={() => setTags(tags.filter((x) => x !== t))}>
                ×
              </button>
            </span>
          ))}
          <input
            className="tag-add"
            placeholder="+ tag"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === ",") {
                e.preventDefault();
                addTag(tagInput);
              } else if (e.key === "Backspace" && !tagInput && tags.length) {
                setTags(tags.slice(0, -1));
              }
            }}
          />
        </span>
        <span className="doc-actions">
          <button className="btn btn-ghost doc-act-btn" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button className="btn btn-primary doc-act-btn" onClick={save} disabled={busy}>
            {busy ? "Saving…" : isNew ? "Create & push" : "Save & push"}
          </button>
        </span>
      </div>

      <div
        className="doc-path"
        ref={pathRef}
        data-ph="docs/section/index.md"
        contentEditable={isNew}
        suppressContentEditableWarning
        onInput={() => {
          pathEdited.current = true;
        }}
      />
      <div className="doc-rule" />
      <h1>
        <span
          className="hl"
          ref={titleRef}
          contentEditable
          suppressContentEditableWarning
          data-ph="Untitled document"
          onInput={onTitleInput}
        />
      </h1>
      <div
        className="doc-body"
        ref={bodyRef}
        contentEditable
        suppressContentEditableWarning
        data-ph="Start writing…  (type / for blocks)"
        onKeyUp={onBodyKeyUp}
        onKeyDown={onBodyKeyDown}
        onBlur={() => setTimeout(closeSlash, 150)}
      />

      {err && <div className="banner bad" style={{ marginTop: 16 }}>{err}</div>}

      {slash.open && (
        <div className="slash-menu open" ref={slashRef} style={{ left: slash.x, top: slash.y }}>
          {SLASH.map((o, i) => (
            <div
              key={o.k}
              className={`slash-item${i === slash.active ? " active" : ""}`}
              onMouseDown={(e) => {
                e.preventDefault();
                applySlash(i);
              }}
            >
              <span className="si-ic" dangerouslySetInnerHTML={{ __html: o.ic }} />
              {o.k}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
