import { useEffect, useState } from "react";
import { api, type SiteBinding } from "../api";
import { useAuth } from "../auth";
import { useToast } from "../toast";
import { refreshMeta } from "../brand";

type Form = { domain: string; repo: string; brand: string; visibility: "public" | "private" };
const EMPTY: Form = { domain: "", repo: "", brand: "", visibility: "public" };

export function AdminSites() {
  const { authed, role, openLogin } = useAuth();
  const toast = useToast();
  const [sites, setSites] = useState<SiteBinding[]>([]);
  const [editing, setEditing] = useState<string | null>(null); // site id, "new", or null
  const [form, setForm] = useState<Form>(EMPTY);

  const isAdmin = authed && role === "admin";

  const load = () => {
    api
      .sites()
      .then((r) => setSites(r.sites))
      .catch((e) => toast.show(String(e.message), "bad"));
  };

  useEffect(() => {
    if (isAdmin) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  if (!authed) {
    return (
      <div className="page">
        <section className="card site-gate">
          <h2>Settings</h2>
          <p className="muted">Sign in as an administrator to manage domain bindings.</p>
          <button className="btn btn-primary" onClick={openLogin}>
            Log in
          </button>
        </section>
      </div>
    );
  }
  if (role !== "admin") {
    return (
      <div className="page">
        <section className="card site-gate">
          <h2>Settings</h2>
          <p className="muted">Administrator access required.</p>
        </section>
      </div>
    );
  }

  const startNew = () => {
    setForm(EMPTY);
    setEditing("new");
  };
  const startEdit = (s: SiteBinding) => {
    setForm({ domain: s.domain, repo: s.repo, brand: s.brand, visibility: s.visibility });
    setEditing(s.id);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editing === "new") {
        await api.createSite(form);
        toast.show(`Added ${form.domain}.`);
      } else if (editing) {
        await api.updateSite(editing, form);
        toast.show(`Updated ${form.domain}.`);
      }
      refreshMeta();
      setEditing(null);
      load();
    } catch (err) {
      toast.show(String((err as Error).message), "bad");
    }
  };

  const remove = async (s: SiteBinding) => {
    try {
      await api.deleteSite(s.id);
      toast.show(`Removed ${s.domain}.`);
      refreshMeta();
      load();
    } catch (err) {
      toast.show(String((err as Error).message), "bad");
    }
  };

  const upd = (patch: Partial<Form>) => setForm((f) => ({ ...f, ...patch }));

  return (
    <div className="page">
      <section className="card">
        <div className="row" style={{ alignItems: "center" }}>
          <h2 style={{ margin: 0 }}>Domain bindings</h2>
          {editing === null && (
            <button className="btn btn-primary" style={{ marginLeft: "auto" }} onClick={startNew}>
              Add binding
            </button>
          )}
        </div>
        <p className="muted" style={{ fontSize: 13, marginTop: 6 }}>
          Map a domain to a repository. A request’s host selects which repo it serves. When no
          bindings exist the server runs in single-repo mode from its environment.
        </p>

        {editing !== null && (
          <form className="site-form" onSubmit={submit} style={{ marginTop: 12 }}>
            <div className="row" style={{ flexWrap: "wrap", gap: 10 }}>
              <label className="fld">
                <span>Domain</span>
                <input
                  className="field"
                  placeholder="docs.example.com"
                  value={form.domain}
                  onChange={(e) => upd({ domain: e.target.value })}
                  autoFocus
                />
              </label>
              <label className="fld">
                <span>Repository (owner/name)</span>
                <input
                  className="field"
                  placeholder="o-codify/SpecificationHub"
                  value={form.repo}
                  onChange={(e) => upd({ repo: e.target.value })}
                />
              </label>
              <label className="fld">
                <span>Brand (optional)</span>
                <input
                  className="field"
                  placeholder="Velt Docs"
                  value={form.brand}
                  onChange={(e) => upd({ brand: e.target.value })}
                />
              </label>
              <label className="fld">
                <span>Visibility</span>
                <select
                  className="field"
                  value={form.visibility}
                  onChange={(e) => upd({ visibility: e.target.value as "public" | "private" })}
                >
                  <option value="public">public — anyone can read</option>
                  <option value="private">private — admin / authorized AI only</option>
                </select>
              </label>
            </div>
            <div className="row" style={{ marginTop: 12 }}>
              <button type="submit" className="btn btn-primary">
                {editing === "new" ? "Add" : "Save"}
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setEditing(null)}>
                Cancel
              </button>
            </div>
          </form>
        )}

        <div style={{ borderTop: "1px solid var(--border)", marginTop: 14 }}>
          {sites.length === 0 && (
            <p className="muted" style={{ padding: "14px 0" }}>
              No bindings yet — the server serves its environment repository on every domain.
            </p>
          )}
          {sites.map((s) => (
            <div className="branch-row" key={s.id}>
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <code>{s.domain}</code>
                <span className="muted" style={{ fontSize: 12 }}>
                  {s.repo || "local-only"} {s.brand ? `· ${s.brand}` : ""}
                </span>
              </div>
              <span className={`pill ${s.visibility === "private" ? "pill-private" : ""}`}>
                {s.visibility}
              </span>
              <button className="del-link" style={{ marginLeft: 12 }} onClick={() => startEdit(s)}>
                edit
              </button>
              <button className="del-link" onClick={() => remove(s)}>
                delete
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
