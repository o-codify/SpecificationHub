import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { api, getToken, setToken } from "../api";
import { ThemeToggle } from "../components/ThemeToggle";
import { setViewAccent } from "../status";

type AuthState = "loading" | "out" | "in";

export function AdminLayout() {
  const [state, setState] = useState<AuthState>("loading");
  const [user, setUser] = useState<string>("");
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    if (state !== "in") {
      setViewAccent("login");
      return;
    }
    const section = location.pathname.replace(/^\/admin\/?/, "").split("/")[0] || "documents";
    setViewAccent(section);
  }, [state, location.pathname]);

  const checkSession = async () => {
    if (!getToken()) {
      setState("out");
      return;
    }
    try {
      const me = await api.me();
      if (me.authenticated) {
        setUser(me.name ?? "");
        setState("in");
      } else {
        setToken("");
        setState("out");
      }
    } catch {
      setToken("");
      setState("out");
    }
  };

  useEffect(() => {
    checkSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await api.login(username.trim(), password);
      setToken(res.token);
      setUser(res.user.name);
      setPassword("");
      setState("in");
    } catch (err) {
      setError((err as Error).message || "Login failed");
    } finally {
      setBusy(false);
    }
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch {
      /* ignore */
    }
    setToken("");
    setUser("");
    setState("out");
  };

  if (state === "loading") {
    return <div className="muted pad">Loading…</div>;
  }

  if (state === "out") {
    return (
      <>
        <header className="topbar">
          <Link to="/docs" className="brand">
            HLS <b>Hub</b>
          </Link>
          <div className="spacer" />
          <ThemeToggle />
        </header>
        <div className="auth-wrap">
          <div className="auth-card">
            <div className="auth-head">
              <div className="brand">
                HLS <b>Hub</b>
              </div>
              <p>Sign in to the admin panel</p>
            </div>
            <form onSubmit={login}>
              <label className="lbl">Login</label>
              <input
                className="field"
                value={username}
                autoFocus
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                placeholder="username"
              />
              <label className="lbl" style={{ marginTop: 14 }}>
                Password
              </label>
              <input
                className="field"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                placeholder="••••••••"
              />
              {error && (
                <div className="banner bad" style={{ marginTop: 16 }}>
                  {error}
                </div>
              )}
              <button
                type="submit"
                disabled={busy}
                className="btn btn-primary"
                style={{ width: "100%", marginTop: 22, height: 40 }}
              >
                {busy ? "Signing in…" : "Sign in"}
              </button>
            </form>
            <p className="auth-foot">
              Admin access lets you edit docs, manage branches and tokens.
            </p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <header className="topbar">
        <button className="menu-btn" aria-label="Menu" onClick={() => setNavOpen((o) => !o)}>
          ☰
        </button>
        <Link to="/docs" className="brand">
          HLS <b>Hub</b>
        </Link>
        <nav className={`nav${navOpen ? " open" : ""}`} onClick={() => setNavOpen(false)}>
          <NavLink to="/admin/docs">Docs</NavLink>
          <NavLink to="/admin/editor">Editor</NavLink>
          <NavLink to="/admin/diff">Diff</NavLink>
          <NavLink to="/admin/branches">Branches</NavLink>
          <NavLink to="/admin/tokens">Tokens</NavLink>
        </nav>
        <div className="spacer" />
        <span className="user-tag">
          Signed in as <b>{user}</b>
        </span>
        <button className="btn btn-ghost logout-btn" onClick={logout}>
          Log out
        </button>
        <ThemeToggle />
      </header>
      <main className="admin-main">
        <div className="page">
          <Outlet />
        </div>
      </main>
    </>
  );
}
