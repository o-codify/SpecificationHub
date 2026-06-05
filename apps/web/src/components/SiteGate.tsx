import { Link, Outlet } from "react-router-dom";
import { useAuth } from "../auth";
import { useMeta } from "../brand";

/**
 * Layout route that guards the docs/branches/review pages by site policy:
 *  - domain has no repository binding → "not linked" notice (admins get a link
 *    to Settings; everyone can still sign in);
 *  - site is private and the visitor isn't signed in → login wall.
 * The Settings route is intentionally NOT wrapped by this gate, so an admin can
 * always reach it to configure bindings.
 */
export function SiteGate() {
  const { authed, role, openLogin } = useAuth();
  const meta = useMeta();

  if (!meta) return null; // brief: meta still loading

  if (!meta.linked) {
    return (
      <div className="page">
        <section className="card site-gate">
          <h2>Domain not linked</h2>
          <p className="muted">
            This domain isn’t connected to a repository yet, so there’s nothing to show here.
          </p>
          {authed ? (
            role === "admin" ? (
              <Link className="btn btn-primary" to="/settings">
                Open settings
              </Link>
            ) : (
              <p className="muted">Ask an administrator to configure it.</p>
            )
          ) : (
            <button className="btn btn-primary" onClick={openLogin}>
              Log in
            </button>
          )}
        </section>
      </div>
    );
  }

  if (meta.private && !authed) {
    return (
      <div className="page">
        <section className="card site-gate">
          <h2>Private documentation</h2>
          <p className="muted">This documentation is private. Sign in to view it.</p>
          <button className="btn btn-primary" onClick={openLogin}>
            Log in
          </button>
        </section>
      </div>
    );
  }

  return <Outlet />;
}
