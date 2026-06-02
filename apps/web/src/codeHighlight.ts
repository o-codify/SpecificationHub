// Post-render syntax highlighting + copy button for code blocks rendered as raw
// HTML (the track-changes views, which go through `marked`, not the React
// CodeBlock component). highlight.js is lazy-loaded so it stays out of the main
// bundle. Diffed code blocks (containing <del>/<ins>/.sug markup) are left
// untouched — highlighting would clobber the diff.

let hljsPromise: Promise<typeof import("highlight.js").default> | null = null;
const loadHljs = () =>
  (hljsPromise ??= import("highlight.js").then((m) => m.default));

/** Highlight + decorate every plain `pre > code` inside `root` (idempotent). */
export function enhanceCodeBlocks(root: HTMLElement | null): void {
  if (!root) return;
  root.querySelectorAll<HTMLElement>("pre > code").forEach((code) => {
    const pre = code.parentElement as HTMLElement | null;
    if (!pre || pre.dataset.enhanced === "1") return;
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
