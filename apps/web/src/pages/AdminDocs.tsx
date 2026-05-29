import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { TreeItem } from "@hls/core";
import { api } from "../api";
import { StatusBadge } from "../components/StatusBadge";

export function AdminDocs() {
  const [branches, setBranches] = useState<string[]>(["main"]);
  const [branch, setBranch] = useState("main");
  const [items, setItems] = useState<TreeItem[]>([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    api.branches().then((r) => setBranches(r.branches.map((b) => b.name))).catch(() => {});
  }, []);

  useEffect(() => {
    setErr("");
    api
      .tree(branch)
      .then((r) => setItems(r.items))
      .catch((e) => setErr(String(e.message)));
  }, [branch]);

  return (
    <section className="card">
      <h2>Documents</h2>
      <div className="row" style={{ marginBottom: 18 }}>
        <span className="mono">Branch</span>
        <select
          className="field"
          value={branch}
          style={{ width: 160 }}
          onChange={(e) => setBranch(e.target.value)}
        >
          {branches.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
      </div>
      {err && <div className="banner bad">{err}</div>}
      <table className="t-docs">
        <thead>
          <tr>
            <th>Title</th>
            <th>Status</th>
            <th>Path</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {items.map((it) => (
            <tr key={it.path}>
              <td className="td-title" data-label="Title">
                {it.title}
              </td>
              <td data-label="Status">
                <StatusBadge status={it.status} />
              </td>
              <td data-label="Path">
                <code className="mono">{it.path}</code>
              </td>
              <td className="td-edit" style={{ textAlign: "right" }}>
                <Link
                  className="edit-link"
                  to={`/admin/editor?branch=${encodeURIComponent(branch)}&path=${encodeURIComponent(it.path)}`}
                >
                  edit
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
