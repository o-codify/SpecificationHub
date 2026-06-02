import { useEffect, useRef, useState } from "react";

/**
 * A fenced code block with editor-style syntax highlighting (highlight.js,
 * lazy-loaded so it stays out of the main bundle) and a copy button. Falls back
 * to plain escaped text if the language is unknown or highlighting fails.
 */
export function CodeBlock({ code, lang }: { code: string; lang?: string }) {
  const ref = useRef<HTMLElement>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const hljs = (await import("highlight.js")).default;
      if (!alive || !ref.current) return;
      const language = lang && hljs.getLanguage(lang) ? lang : null;
      const res = language
        ? hljs.highlight(code, { language, ignoreIllegals: true })
        : hljs.highlightAuto(code);
      if (alive && ref.current) ref.current.innerHTML = res.value;
    })().catch(() => {
      /* leave the plain text already rendered */
    });
    return () => {
      alive = false;
    };
  }, [code, lang]);

  const copy = () => {
    navigator.clipboard?.writeText(code).then(
      () => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1400);
      },
      () => {
        /* clipboard unavailable — ignore */
      },
    );
  };

  return (
    <div className="code-block">
      <button className="code-copy" onClick={copy} aria-label="Copy code" type="button">
        {copied ? "Copied" : "Copy"}
      </button>
      <pre>
        <code ref={ref} className={lang ? `hljs language-${lang}` : "hljs"}>
          {code}
        </code>
      </pre>
    </div>
  );
}
