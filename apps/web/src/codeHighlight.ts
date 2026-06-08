// Post-render syntax highlighting + copy button for code blocks rendered as raw
// HTML (the track-changes views, which go through `marked`, not the React
// CodeBlock component). highlight.js is lazy-loaded so it stays out of the main
// bundle. Diffed code blocks (containing <del>/<ins>/.sug markup) are left
// untouched — highlighting would clobber the diff.

let hljsPromise: Promise<typeof import("highlight.js").default> | null = null;
const loadHljs = () =>
  (hljsPromise ??= import("highlight.js").then((m) => m.default));

let mermaidPromise: Promise<typeof import("mermaid").default> | null = null;
const loadMermaid = () => (mermaidPromise ??= import("mermaid").then((m) => m.default));
let mseq = 0;

/**
 * Open a rendered diagram fullscreen (dimmed backdrop, pan + wheel-zoom), mirroring
 * the React <Mermaid> lightbox for the raw-HTML diff views. Built imperatively
 * because these diagrams are injected outside React's tree.
 */
function openMermaidLightbox(svg: string): void {
  const modal = document.createElement("div");
  modal.className = "mermaid-modal";
  modal.setAttribute("role", "dialog");
  modal.setAttribute("aria-modal", "true");

  const close = document.createElement("button");
  close.className = "mermaid-modal-close";
  close.setAttribute("aria-label", "Close");
  close.textContent = "✕";

  const fig = document.createElement("div");
  fig.className = "mermaid-modal-fig";
  const zoomEl = document.createElement("div");
  zoomEl.className = "mermaid-modal-zoom";
  zoomEl.innerHTML = svg;
  fig.appendChild(zoomEl);

  modal.appendChild(close);
  modal.appendChild(fig);

  const view = { zoom: 1, x: 0, y: 0 };
  const apply = () => {
    zoomEl.style.transform = `translate(${view.x}px, ${view.y}px) scale(${view.zoom})`;
  };
  apply();

  const prevOverflow = document.body.style.overflow;
  document.body.style.overflow = "hidden";

  let removed = false;
  const teardown = () => {
    if (removed) return;
    removed = true;
    document.body.style.overflow = prevOverflow;
    modal.removeEventListener("wheel", onWheel);
    window.removeEventListener("keydown", onKey);
    modal.remove();
  };

  const onWheel = (e: WheelEvent) => {
    e.preventDefault();
    const r = fig.getBoundingClientRect();
    const ox = e.clientX - (r.left + r.width / 2);
    const oy = e.clientY - (r.top + r.height / 2);
    const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
    const zoom = Math.min(12, Math.max(0.4, view.zoom * factor));
    const k = zoom / view.zoom;
    view.x = ox - (ox - view.x) * k;
    view.y = oy - (oy - view.y) * k;
    view.zoom = zoom;
    apply();
  };
  modal.addEventListener("wheel", onWheel, { passive: false });

  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") teardown();
  };
  window.addEventListener("keydown", onKey);

  // Click backdrop / close button closes; clicking the figure does not.
  modal.addEventListener("click", teardown);
  close.addEventListener("click", (e) => {
    e.stopPropagation();
    teardown();
  });

  // Drag-to-pan.
  let drag: { px: number; py: number; x: number; y: number } | null = null;
  fig.addEventListener("click", (e) => e.stopPropagation());
  fig.addEventListener("mousedown", (e) => {
    e.preventDefault();
    drag = { px: e.clientX, py: e.clientY, x: view.x, y: view.y };
    fig.classList.add("grabbing");
  });
  window.addEventListener("mousemove", (e) => {
    if (!drag) return;
    view.x = drag.x + (e.clientX - drag.px);
    view.y = drag.y + (e.clientY - drag.py);
    apply();
  });
  const endDrag = () => {
    drag = null;
    fig.classList.remove("grabbing");
  };
  window.addEventListener("mouseup", endDrag);
  fig.addEventListener("dblclick", () => {
    view.zoom = 1;
    view.x = 0;
    view.y = 0;
    apply();
  });

  document.body.appendChild(modal);
}

/**
 * Render any `mermaid` fenced blocks in raw-HTML views (track-changes) as real
 * diagrams — the React <Mermaid> component only runs in the live reader, so the
 * diff views otherwise show the mermaid source as a code block. Diffed blocks
 * (with <del>/<ins>) are left as text since the source is mid-edit.
 */
export function renderMermaid(root: HTMLElement | null): void {
  if (!root) return;
  root.querySelectorAll<HTMLElement>("pre > code.language-mermaid").forEach((code) => {
    const pre = code.parentElement as HTMLElement | null;
    if (!pre || pre.dataset.mermaid === "1") return;
    if (code.querySelector("del, ins, .sug")) return; // mid-edit source — keep as text
    pre.dataset.mermaid = "1";
    const src = code.textContent ?? "";
    const dark = document.documentElement.getAttribute("data-theme") === "dark";
    const id = `mmd-tc-${mseq++}`;
    loadMermaid()
      .then(async (mermaid) => {
        // Wait for web fonts so label boxes are measured with the final font
        // (avoids multi-line labels overflowing their node).
        if (document.fonts?.ready) await document.fonts.ready;
        mermaid.initialize({ startOnLoad: false, securityLevel: "strict", theme: dark ? "dark" : "default" });
        return mermaid.render(id, src);
      })
      .then((out) => {
        const div = document.createElement("div");
        div.className = "mermaid-diagram";
        div.setAttribute("role", "button");
        div.setAttribute("tabindex", "0");
        div.title = "Click to enlarge";
        div.innerHTML = out.svg;
        // Open fullscreen instead of bubbling to the doc-body's change handler
        // (which would otherwise pop the Revert/Dismiss menu when the diagram
        // sits inside a tracked-change block).
        div.addEventListener("click", (e) => {
          e.stopPropagation();
          openMermaidLightbox(out.svg);
        });
        const target = pre.parentElement?.classList.contains("code-block") ? pre.parentElement : pre;
        target.replaceWith(div);
      })
      .catch(() => {
        // Parse error: leave the source code block visible, but remove the
        // leftover error graphic ("bomb") mermaid appends to <body> while
        // measuring — otherwise it piles up at the bottom of the page.
        document.getElementById(id)?.remove();
        document.getElementById(`d${id}`)?.remove();
      });
  });
}

/** Highlight + decorate every plain `pre > code` inside `root` (idempotent). */
export function enhanceCodeBlocks(root: HTMLElement | null): void {
  if (!root) return;
  root.querySelectorAll<HTMLElement>("pre > code").forEach((code) => {
    const pre = code.parentElement as HTMLElement | null;
    if (!pre || pre.dataset.enhanced === "1") return;
    // Mermaid blocks become diagrams (renderMermaid), not highlighted code.
    if (code.classList.contains("language-mermaid")) return;
    pre.dataset.enhanced = "1";
    // Skip diffed code — its per-line <del>/<ins>/.sug markup must stay intact.
    if (code.querySelector("del, ins, .sug")) return;

    const raw = code.textContent ?? "";

    // Wrap in .code-block and add a copy button (matching CodeBlock.tsx).
    if (!pre.parentElement?.classList.contains("code-block")) {
      const wrap = document.createElement("div");
      wrap.className = "code-block";
      pre.parentElement?.insertBefore(wrap, pre);
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "code-copy";
      btn.textContent = "Copy";
      btn.setAttribute("aria-label", "Copy code");
      btn.addEventListener("click", (e) => {
        e.stopPropagation(); // don't trigger the doc-body's suggestion click handler
        navigator.clipboard?.writeText(raw).then(
          () => {
            btn.textContent = "Copied";
            window.setTimeout(() => (btn.textContent = "Copy"), 1400);
          },
          () => {},
        );
      });
      wrap.appendChild(btn);
      wrap.appendChild(pre);
    }

    const langClass = [...code.classList].find((c) => c.startsWith("language-"));
    const lang = langClass?.slice("language-".length);
    loadHljs()
      .then((hljs) => {
        try {
          const res =
            lang && hljs.getLanguage(lang)
              ? hljs.highlight(raw, { language: lang, ignoreIllegals: true })
              : hljs.highlightAuto(raw);
          code.innerHTML = res.value;
          code.classList.add("hljs");
        } catch {
          /* leave plain text */
        }
      })
      .catch(() => {});
  });
}
