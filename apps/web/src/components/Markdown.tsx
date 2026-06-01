import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Link } from "react-router-dom";
import { resolveDocHref } from "../docpath";
import { Mermaid } from "./Mermaid";

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
          // A ```mermaid fenced block renders as a diagram instead of code.
          const child = (Array.isArray(children) ? children[0] : children) as
            | { props?: { className?: string; children?: unknown } }
            | undefined;
          const cls = child?.props?.className ?? "";
          if (/\blanguage-mermaid\b/.test(cls)) {
            return <Mermaid chart={codeText(child?.props?.children).replace(/\n$/, "")} />;
          }
          return <pre>{children}</pre>;
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
