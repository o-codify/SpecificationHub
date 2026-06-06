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

export function Markdown({ content, currentPath, branch }: Props) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1({ children }) {
          return (
            <h1>
              <span className="hl">{children}</span>
            </h1>
          );
        },
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
