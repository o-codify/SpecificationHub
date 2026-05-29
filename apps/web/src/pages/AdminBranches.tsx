import { useEffect, useState } from "react";
import { api } from "../api";

export function AdminBranches() {
  const [branches, setBranches] = useState<string[]>([]);
  const [defaultBranch, setDefaultBranch] = useState("main");
  const [name, setName] = useState("");
  const [from, setFrom] = useState("main");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const load = () => {
    api
      .branches()
      .then((r) => {
        setBranches(r.branches.map((b) => b.name));
        setDefaultBranch(r.default);
        if (!r.branches.some((b) => b.name === from)) setFrom(r.default);
      })
      .catch((e) => setErr(String(e.message)));
  };

  useEffect(load, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg("");
    setErr("");
    try {
      await api.createBranch(name.trim(), from);
      setMsg(`Created branch ${name} from ${from}.`);
      setName("");
      load();
    } catch (e) {
      setErr(String((e as Error).message));
    }
  };

  const remove = async (b: string) => {
    setMsg("");
    setErr("");
    try {
      await api.deleteBranch(b);
      setMsg(`Deleted branch ${b}.`);
      load();
    } catch (e) {
      setErr(String((e as Error).message));
    }
  };

  return (
    <section className="card">
      <h2>Branches</h2>
      <form className="row" onSubmit={create} style={{ marginBottom: 8 }}>
        <input
          className="field"
          style={{ width: 280 }}
          placeholder="new branch name (e.g. ai/draft-pass)"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <select
          className="field"
          value={from}
          style={{ width: 160 }}
          onChange={(e) => setFrom(e.target.value)}
        >
          {branches.map((b) => (
            <option key={b} value={b}>
              from {b}
            </option>
          ))}
        </select>
        <button type="submit" className="btn btn-primary">
          Create
        </button>
      </form>
      {msg && <div className="banner good" style={{ margin: "8px 0 14px" }}>{msg}</div>}
      {err && <div className="banner bad" style={{ margin: "8px 0 14px" }}>{err}</div>}

      <div style={{ borderTop: "1px solid var(--border)", marginTop: 12 }}>
        {branches.map((b) => (
          <div className="branch-row" key={b}>
            <code>{b}</code>
            {b === defaultBranch ? (
              <span className="pill">default</span>
            ) : (
              <button className="del-link" onClick={() => remove(b)}>
                delete
              </button>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
