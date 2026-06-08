import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Link } from "react-router-dom";
import { resolveDocHref } from "../docpath";
import { resolveImgSrc } from "../assets";
import { Mermaid } from "./Mermaid";
import { CodeBlock } from "./CodeBlock";

interface Props {
  content: string;
  currentPath: string;
  branch: string;
}

/** Flatten a code element's children (usually a single string) to text. */
const codeText = (c: unknown): string =>
  Array.isArray(c) ? c.map(codeText).join("") : typeof c === "string" ? c : "";

/** Plain text of arbitrary React children (recurses into elements). */
function textOf(c: unknown): string {
  if (c == null || typeof c === "boolean") return "";
  if (typeof c === "string" || typeof c === "number") return String(c);
  if (Array.isArray(c)) return c.map(textOf).join("");
  if (typeof c === "object" && "props" in (c as object)) {
    return textOf((c as { props?: { children?: unknown } }).props?.children);
  }
  return "";
}

/** GitHub-style heading slug, so #anchor deep links resolve to a heading. */
function headingId(children: unknown): string {
  return textOf(children)
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s/g, "-");
}

export function Markdown({ content, currentPath, branch }: Props) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1({ children }) {
          return (
            <h1 id={headingId(children)}>
              <span className="hl">{children}</span>
            </h1>
          );
        },
        table: ({ children }) => (
          <div className="table-wrap">
            <table>{children}</table>
          </div>
        ),
        h2: ({ children }) => <h2 id={headingId(children)}>{children}</h2>,
        h3: ({ children }) => <h3 id={headingId(children)}>{children}</h3>,
        h4: ({ children }) => <h4 id={headingId(children)}>{children}</h4>,
        h5: ({ children }) => <h5 id={headingId(children)}>{children}</h5>,
        h6: ({ children }) => <h6 id={headingId(children)}>{children}</h6>,
        pre({ children }) {
          const child = (Array.isArray(children) ? children[0] : children) as
            | { props?: { className?: string; children?: unknown } }
            | undefined;
          const cls = child?.props?.className ?? "";
          const text = codeText(child?.props?.children).replace(/\n$/, "");
          // A ```mermaid block renders as a diagram; any other fenced block gets
          // syntax highlighting + a copy button.
          if (/\blanguage-mermaid\b/.test(cls)) {
            return <Mermaid chart={text} />;
          }
          const lang = /language-([\w-]+)/.exec(cls)?.[1];
          return <CodeBlock code={text} lang={lang} />;
        },
        img({ src, alt, title }) {
          return (
            <img
              src={resolveImgSrc(typeof src === "string" ? src : "")}
              alt={alt ?? ""}
              title={title}
              loading="lazy"
              className="doc-img"
            />
          );
        },
        a({ href, children }) {
          // Same-page anchor (#heading) — scroll within the doc, don't open a tab.
          if (href && href.startsWith("#")) {
            return <a href={href}>{children}</a>;
          }
          const internal = href ? resolveDocHref(currentPath, href, branch) : null;
          if (internal) {
            return <Link to={internal}>{children}</Link>;
          }
          return (
            <a href={href} target="_blank" rel="noreferrer">
              {children}
            </a>
          );
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
