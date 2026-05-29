import { useEffect, useState } from "react";
import type { Role, TokenInfo } from "@hls/core";
import { api } from "../api";

const ROLES: Role[] = ["viewer", "editor", "reviewer", "admin", "ai-agent"];

export function AdminTokens() {
  const [tokens, setTokens] = useState<TokenInfo[]>([]);
  const [name, setName] = useState("");
  const [role, setRole] = useState<Role>("ai-agent");
  const [prefixes, setPrefixes] = useState("ai/");
  const [created, setCreated] = useState<string>("");
  const [err, setErr] = useState("");

  const load = () => {
    api
      .tokens()
      .then((r) => setTokens(r.tokens))
      .catch((e) => setErr(String(e.message)));
  };

  useEffect(load, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    setCreated("");
    try {
      const r = await api.createToken(
        name.trim(),
        role,
        prefixes
          .split(",")
          .map((p) => p.trim())
          .filter(Boolean),
      );
      setCreated(r.token);
      setName("");
      load();
    } catch (e) {
      setErr(String((e as Error).message));
    }
  };

  const remove = async (id: string) => {
    setErr("");
    try {
      await api.deleteToken(id);
      load();
    } catch (e) {
      setErr(String((e as Error).message));
    }
  };

  return (
    <section className="card">
      <h2>Tokens</h2>
      <form className="row wrap" onSubmit={create} style={{ marginBottom: 18 }}>
        <input
          className="field"
          style={{ width: 230 }}
          placeholder="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <select
          className="field"
          style={{ width: 150 }}
          value={role}
          onChange={(e) => setRole(e.target.value as Role)}
        >
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <input
          className="field"
          style={{ width: 160 }}
          placeholder="allowed prefixes (comma)"
          value={prefixes}
          onChange={(e) => setPrefixes(e.target.value)}
        />
        <button type="submit" className="btn btn-primary">
          Create token
        </button>
      </form>

      {created && (
        <div className="banner good" style={{ marginBottom: 18 }}>
          New token (copy now, shown once): <code>{created}</code>
        </div>
      )}
      {err && <div className="banner bad" style={{ marginBottom: 18 }}>{err}</div>}

      <div className="table-wrap">
        <table className="t-tokens">
          <thead>
            <tr>
              <th>Name</th>
              <th>Role</th>
              <th>Prefixes</th>
              <th>Created</th>
              <th>Last used</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {tokens.map((t) => (
              <tr key={t.id}>
                <td className="tk-name" data-label="Name">
                  {t.name}
                </td>
                <td data-label="Role">{t.role}</td>
                <td data-label="Prefixes">
                  <span className="mono">{t.allowed_branch_prefixes.join(", ") || "—"}</span>
                </td>
                <td data-label="Created">
                  <span className="mono">{t.created_at.slice(0, 10)}</span>
                </td>
                <td data-label="Last used">
                  <span className="mono">
                    {t.last_used_at ? t.last_used_at.slice(0, 10) : "—"}
                  </span>
                </td>
                <td className="tk-del" style={{ textAlign: "right" }}>
                  <button className="del-link" onClick={() => remove(t.id)}>
                    delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
