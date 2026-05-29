import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Link } from "react-router-dom";
import { resolveDocHref } from "../docpath";

interface Props {
  content: string;
  currentPath: string;
  branch: string;
}

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
