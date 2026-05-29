import { type CSSProperties } from "react";
import { statusColor } from "../status";
import { StatusBadge } from "./StatusBadge";

export interface DocFile {
  path: string;
  title: string;
  status: string;
  isNew?: boolean;
}

type FileNode = { kind: "file" } & DocFile;
interface DirNode {
  kind: "dir";
  name: string;
  path: string;
  index?: FileNode; // a direct child file named index.*
  children: TreeNode[];
}
export type TreeNode = FileNode | DirNode;

interface RawDir {
  name: string;
  path: string;
  dirs: Map<string, RawDir>;
  files: FileNode[];
}

const prettyDir = (name: string) =>
  name
    .replace(/^\d+[-_]/, "")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim() || name;

/**
 * Group a flat list of doc files into a directory tree:
 * - a directory with several files (or any sub-directories) becomes a category;
 * - a directory with a single file and no sub-directories collapses to that file;
 * - a category with an `index.*` file is represented by that index doc;
 *   without one, clicking it opens the first descendant doc.
 */
export function buildDocTree(items: DocFile[]): TreeNode[] {
  const root: RawDir = { name: "", path: "docs", dirs: new Map(), files: [] };
  for (const it of items) {
    const rel = it.path.replace(/^docs\//, "");
    const parts = rel.split("/");
    const fname = parts.pop();
    if (!fname) continue;
    let cur = root;
    let curPath = "docs";
    for (const seg of parts) {
      curPath += "/" + seg;
      let next = cur.dirs.get(seg);
      if (!next) {
        next = { name: seg, path: curPath, dirs: new Map(), files: [] };
        cur.dirs.set(seg, next);
      }
      cur = next;
    }
    cur.files.push({ kind: "file", path: it.path, title: it.title, status: it.status, isNew: it.isNew });
  }

  const convert = (raw: RawDir): TreeNode => {
    const subDirs = [...raw.dirs.values()].sort((a, b) => a.name.localeCompare(b.name));
    const files = raw.files.slice().sort((a, b) => a.path.localeCompare(b.path));
    if (subDirs.length === 0 && files.length === 1) return files[0];
    const index = files.find((f) => /(^|\/)index\.[^/]+$/i.test(f.path));
    const childFiles = index ? files.filter((f) => f !== index) : files;
    return {
      kind: "dir",
      name: raw.name,
      path: raw.path,
      index,
      children: [...childFiles, ...subDirs.map(convert)],
    };
  };

  const topDirs = [...root.dirs.values()].sort((a, b) => a.name.localeCompare(b.name)).map(convert);
  const topFiles = root.files.slice().sort((a, b) => a.path.localeCompare(b.path));
  return [...topDirs, ...topFiles];
}

/** The doc a category opens to: its index, else the first descendant doc. */
export function firstDocPath(node: TreeNode): string {
  if (node.kind === "file") return node.path;
  if (node.index) return node.index.path;
  for (const c of node.children) {
    const p = firstDocPath(c);
    if (p) return p;
  }
  return "";
}

function descendantCount(node: TreeNode, counts: Record<string, number>): number {
  if (node.kind === "file") return counts[node.path] || 0;
  let n = node.index ? counts[node.index.path] || 0 : 0;
  for (const c of node.children) n += descendantCount(c, counts);
  return n;
}

function hasNewDescendant(node: TreeNode): boolean {
  if (node.kind === "file") return !!node.isNew;
  return node.children.some(hasNewDescendant);
}

interface Ctx {
  currentPath?: string;
  counts: Record<string, number>;
  expanded: Set<string>;
  onOpen: (path: string) => void;
  onToggle: (dirPath: string) => void;
}

function NodeView({ node, depth, ctx }: { node: TreeNode; depth: number; ctx: Ctx }) {
  const indent = { paddingLeft: 12 + depth * 14 } as CSSProperties;

  if (node.kind === "file") {
    const active = ctx.currentPath === node.path;
    const n = ctx.counts[node.path] || 0;
    return (
      <div
        className={`sb-item${active ? " active" : ""}`}
        style={{ ...indent, ["--dot" as string]: statusColor(node.status) } as CSSProperties}
        onClick={() => ctx.onOpen(node.path)}
      >
        <span className="sb-name">
          <i className="dot" />
          <b>{node.title}</b>
        </span>
        {node.isNew ? (
          <span className="sb-new">new</span>
        ) : (
          n > 0 && <span className="sb-change">{n}</span>
        )}
        <StatusBadge status={node.status} />
      </div>
    );
  }

  const target = node.index ? node.index.path : firstDocPath(node);
  const active = !!node.index && ctx.currentPath === node.index.path;
  const expanded = ctx.expanded.has(node.path);
  const title = node.index ? node.index.title : prettyDir(node.name);
  const status = node.index?.status ?? "";
  const agg = descendantCount(node, ctx.counts);
  return (
    <>
      <div
        className={`sb-item sb-cat${active ? " active" : ""}${node.index ? "" : " sb-folder"}`}
        style={{ ...indent, ["--dot" as string]: statusColor(status) } as CSSProperties}
      >
        <button
          className="sb-chev"
          aria-label={expanded ? "Collapse" : "Expand"}
          aria-expanded={expanded}
          onClick={(e) => {
            e.stopPropagation();
            ctx.onToggle(node.path);
          }}
        >
          {expanded ? "▾" : "▸"}
        </button>
        <span className="sb-name" onClick={() => ctx.onOpen(target)}>
          {node.index && <i className="dot" />}
          <b>{title}</b>
        </span>
        {!expanded && hasNewDescendant(node) && <span className="sb-new">new</span>}
        {!expanded && agg > 0 && <span className="sb-change">{agg}</span>}
        {node.index && <StatusBadge status={status} />}
      </div>
      {expanded &&
        node.children.map((c) => (
          <NodeView key={c.path} node={c} depth={depth + 1} ctx={ctx} />
        ))}
    </>
  );
}

export function DocTree({
  nodes,
  currentPath,
  counts,
  expanded,
  onOpen,
  onToggle,
}: {
  nodes: TreeNode[];
  currentPath?: string;
  counts: Record<string, number>;
  expanded: Set<string>;
  onOpen: (path: string) => void;
  onToggle: (dirPath: string) => void;
}) {
  const ctx: Ctx = { currentPath, counts, expanded, onOpen, onToggle };
  return (
    <>
      {nodes.map((n) => (
        <NodeView key={n.path} node={n} depth={0} ctx={ctx} />
      ))}
    </>
  );
}
