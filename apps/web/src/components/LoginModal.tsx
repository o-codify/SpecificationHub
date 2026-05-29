import { useEffect, useRef, useState } from "react";
import { useAuth } from "../auth";

export function LoginModal() {
  const { loginOpen, closeLogin, login } = useAuth();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const userRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (loginOpen) {
      setError("");
      setTimeout(() => userRef.current?.focus(), 60);
    }
  }, [loginOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && loginOpen) closeLogin();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [loginOpen, closeLogin]);

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!username.trim()) {
      setError("Enter a username");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await login(username.trim(), password);
      setPassword("");
    } catch {
      setError("Invalid login or password. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className={`modal-backdrop${loginOpen ? " open" : ""}`}
      style={{ ["--acc" as string]: "var(--p1)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) closeLogin();
      }}
    >
      <div className="auth-card" role="dialog" aria-modal="true" aria-label="Sign in">
        <button className="modal-close" aria-label="Close" onClick={closeLogin}>
          ✕
        </button>
        <div className="auth-head">
          <div className="brand">
            HLS <b>Hub</b>
          </div>
          <p>Sign in to the admin panel</p>
        </div>
        <form onSubmit={submit}>
          <label className="lbl">Login</label>
          <input
            ref={userRef}
            className="field"
            value={username}
            placeholder="username"
            autoComplete="username"
            onChange={(e) => {
              setUsername(e.target.value);
              setError("");
            }}
          />
          <label className="lbl" style={{ marginTop: 14 }}>
            Password
          </label>
          <input
            className="field"
            type="password"
            value={password}
            placeholder="••••••••"
            autoComplete="current-password"
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && (
            <div className="banner bad" style={{ marginTop: 16 }}>
              {error}
            </div>
          )}
          <button
            type="submit"
            className="btn btn-primary"
            disabled={busy}
            style={{ width: "100%", marginTop: 22, height: 40 }}
          >
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <p className="auth-foot">Admin access lets you edit docs, manage branches and tokens.</p>
      </div>
    </div>
  );
}
