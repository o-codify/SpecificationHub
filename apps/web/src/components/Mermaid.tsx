import { useEffect, useState } from "react";

// Unique id per render target (mermaid.render needs a DOM-safe id).
let seq = 0;

const currentTheme = () =>
  document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";

/**
 * Render a Mermaid diagram from its source. Mermaid is a heavy dependency, so
 * it's imported lazily (its own chunk) — only loaded when a doc actually
 * contains a ```mermaid block. Re-renders on theme change, falls back to the
 * raw source if it fails to parse, and opens fullscreen (dimmed modal) on click
 * so large diagrams are readable.
 */
export function Mermaid({ chart }: { chart: string }) {
  const [theme, setTheme] = useState(currentTheme);
  const [svg, setSvg] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  // Track light/dark so the diagram re-renders with matching colours.
  useEffect(() => {
    const obs = new MutationObserver(() => {
      const t = currentTheme();
      setTheme((prev) => (prev === t ? prev : t));
    });
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      const mermaid = (await import("mermaid")).default;
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: "strict",
        theme: theme === "dark" ? "dark" : "default",
      });
      const out = await mermaid.render(`mmd-${seq++}`, chart);
      if (alive) {
        setSvg(out.svg);
        setError(null);
      }
    })().catch((e) => {
      if (alive) setError(e instanceof Error ? e.message : String(e));
    });
    return () => {
      alive = false;
    };
  }, [chart, theme]);

  // Esc closes the fullscreen view.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (error) {
    return (
      <pre className="mermaid-error" title={error}>
        <code>{chart}</code>
      </pre>
    );
  }

  return (
    <>
      <div
        className="mermaid-diagram"
        role="button"
        tabIndex={0}
        title="Click to enlarge"
        onClick={() => svg && setOpen(true)}
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      {open && (
        <div className="mermaid-modal" role="dialog" aria-modal="true" onClick={() => setOpen(false)}>
          <button className="mermaid-modal-close" aria-label="Close" onClick={() => setOpen(false)}>
            ✕
          </button>
          <div
            className="mermaid-modal-fig"
            onClick={(e) => e.stopPropagation()}
            dangerouslySetInnerHTML={{ __html: svg }}
          />
        </div>
      )}
    </>
  );
}
