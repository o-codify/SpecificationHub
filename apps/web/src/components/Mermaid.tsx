import { useEffect, useRef, useState } from "react";

// Unique id per render target (mermaid.render needs a DOM-safe id).
let seq = 0;

const currentTheme = () =>
  document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";

/**
 * Render a Mermaid diagram from its source. Mermaid is a heavy dependency, so
 * it's imported lazily (its own chunk) — only loaded when a doc actually
 * contains a ```mermaid block. Re-renders on theme change and falls back to the
 * raw source if the diagram fails to parse.
 */
export function Mermaid({ chart }: { chart: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [theme, setTheme] = useState(currentTheme);
  const [error, setError] = useState<string | null>(null);

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
      const { svg } = await mermaid.render(`mmd-${seq++}`, chart);
      if (alive && ref.current) {
        ref.current.innerHTML = svg;
        setError(null);
      }
    })().catch((e) => {
      if (alive) setError(e instanceof Error ? e.message : String(e));
    });
    return () => {
      alive = false;
    };
  }, [chart, theme]);

  if (error) {
    return (
      <pre className="mermaid-error" title={error}>
        <code>{chart}</code>
      </pre>
    );
  }
  return <div className="mermaid-diagram" ref={ref} />;
}
