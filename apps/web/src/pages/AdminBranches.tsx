import { useEffect, useState } from "react";
import { api } from "../api";
import { useAuth } from "../auth";
import { useToast } from "../toast";

export function AdminBranches() {
  const { authed } = useAuth();
  const toast = useToast();
  const [branches, setBranches] = useState<string[]>([]);
  const [defaultBranch, setDefaultBranch] = useState("main");
  const [name, setName] = useState("");
  const [from, setFrom] = useState("main");

  const load = () => {
    api
      .branches()
      .then((r) => {
        setBranches(r.branches.map((b) => b.name));
        setDefaultBranch(r.default);
        if (!r.branches.some((b) => b.name === from)) setFrom(r.default);
      })
      .catch((e) => toast.show(String(e.message), "bad"));
  };

  useEffect(load, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createBranch(name.trim(), from);
      toast.show(`Created branch ${name} from ${from}.`);
      setName("");
      load();
    } catch (e) {
      toast.show(String((e as Error).message), "bad");
    }
  };

  const remove = async (b: string) => {
    try {
      await api.deleteBranch(b);
      toast.show(`Deleted branch ${b}.`);
      load();
    } catch (e) {
      toast.show(String((e as Error).message), "bad");
    }
  };

  return (
    <section className="card">
      <h2>Branches</h2>
      {authed && (
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
      )}

      <div style={{ borderTop: "1px solid var(--border)", marginTop: 12 }}>
        {branches.map((b) => (
          <div className="branch-row" key={b}>
            <code>{b}</code>
            {b === defaultBranch ? (
              <span className="pill">default</span>
            ) : (
              authed && (
                <button className="del-link" onClick={() => remove(b)}>
                  delete
                </button>
              )
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
