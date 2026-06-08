import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";

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
    const id = `mmd-${seq++}`;
    (async () => {
      const mermaid = (await import("mermaid")).default;
      // Measure AND paint with the same, fully-loaded font. We pin mermaid's
      // font to the site font and wait for it to load first — otherwise mermaid
      // sizes each box with the fallback font, the real (wider) font paints over
      // it, and the right edge of every label gets clipped (esp. classDiagram).
      if (document.fonts?.load) {
        try {
          await document.fonts.load('400 14px "IBM Plex Sans"');
          await document.fonts.load('600 14px "IBM Plex Sans"');
        } catch {
          /* fall back to whatever is available */
        }
      }
      if (document.fonts?.ready) await document.fonts.ready;
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: "strict",
        theme: theme === "dark" ? "dark" : "default",
        fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
      });
      const out = await mermaid.render(id, chart);
      if (alive) {
        setSvg(out.svg);
        setError(null);
      }
    })().catch((e) => {
      // Drop the leftover error graphic mermaid appends to <body> on a parse
      // failure; we show our own compact <pre className="mermaid-error"> instead.
      document.getElementById(id)?.remove();
      document.getElementById(`d${id}`)?.remove();
      if (alive) setError(e instanceof Error ? e.message : String(e));
    });
    return () => {
      alive = false;
    };
  }, [chart, theme]);

  // Pan/zoom state for the fullscreen view (like an image viewer).
  const [view, setView] = useState({ zoom: 1, x: 0, y: 0 });
  const [grabbing, setGrabbing] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ px: number; py: number; x: number; y: number } | null>(null);

  // While open: reset the view, lock page scroll, wheel-to-zoom (toward the
  // cursor), and Esc to close.
  useEffect(() => {
    if (!open) return;
    setView({ zoom: 1, x: 0, y: 0 });
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const modal = modalRef.current;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const stage = stageRef.current;
      if (!stage) return;
      const r = stage.getBoundingClientRect();
      const ox = e.clientX - (r.left + r.width / 2);
      const oy = e.clientY - (r.top + r.height / 2);
      const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
      setView((v) => {
        const zoom = Math.min(12, Math.max(0.4, v.zoom * factor));
        const k = zoom / v.zoom;
        return { zoom, x: ox - (ox - v.x) * k, y: oy - (oy - v.y) * k };
      });
    };
    modal?.addEventListener("wheel", onWheel, { passive: false });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      modal?.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (error) {
    return (
      <pre className="mermaid-error" title={error}>
        <code>{chart}</code>
      </pre>
    );
  }

  const startDrag = (e: ReactMouseEvent) => {
    e.preventDefault();
    drag.current = { px: e.clientX, py: e.clientY, x: view.x, y: view.y };
    setGrabbing(true);
  };
  const onDrag = (e: ReactMouseEvent) => {
    const d = drag.current;
    if (!d) return;
    setView((v) => ({ ...v, x: d.x + (e.clientX - d.px), y: d.y + (e.clientY - d.py) }));
  };
  const endDrag = () => {
    drag.current = null;
    setGrabbing(false);
  };

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
        <div className="mermaid-modal" role="dialog" aria-modal="true" ref={modalRef} onClick={() => setOpen(false)}>
          <button className="mermaid-modal-close" aria-label="Close" onClick={() => setOpen(false)}>
            ✕
          </button>
          <div
            ref={stageRef}
            className={`mermaid-modal-fig${grabbing ? " grabbing" : ""}`}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={startDrag}
            onMouseMove={onDrag}
            onMouseUp={endDrag}
            onMouseLeave={endDrag}
            onDoubleClick={() => setView({ zoom: 1, x: 0, y: 0 })}
          >
            <div
              className="mermaid-modal-zoom"
              style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.zoom})` }}
              dangerouslySetInnerHTML={{ __html: svg }}
            />
          </div>
        </div>
      )}
    </>
  );
}
