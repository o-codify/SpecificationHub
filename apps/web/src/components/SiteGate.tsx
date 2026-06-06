import { Link, Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../auth";
import { useMeta } from "../brand";

/**
 * Layout route that guards the docs/branches/review pages by site policy:
 *  - domain has no repository binding → /docs shows a friendly "not set up yet"
 *    notice; Branches/Review redirect to /docs (they're meaningless without a
 *    repo). Settings stays reachable (it's outside this gate) so an admin can
 *    bind a repository.
 *  - site is private and the visitor isn't signed in → login wall.
 */
export function SiteGate() {
  const { authed, role, openLogin } = useAuth();
  const meta = useMeta();
  const location = useLocation();

  if (!meta) return null; // brief: meta still loading

  const onDocs = location.pathname.startsWith("/docs") || location.pathname === "/";

  if (!meta.linked) {
    // Branches/Review have nothing to show without a repository — send them home.
    if (!onDocs) return <Navigate to="/docs" replace />;
    // Copy is role-specific: a visitor just learns there's nothing here; an admin
    // gets the action to connect a repository.
    return (
      <div className="gate-wrap">
        <section className="card site-gate">
          {authed && role === "admin" ? (
            <>
              <h2>Connect a repository</h2>
              <p className="muted">
                This address isn’t linked to a documentation repository yet. Connect one in
                Settings to start publishing.
              </p>
              <Link className="btn btn-primary" to="/settings">
                Open Settings
              </Link>
            </>
          ) : (
            <>
              <h2>Nothing here yet</h2>
              <p className="muted">This site doesn’t have any documentation yet.</p>
            </>
          )}
        </section>
      </div>
    );
  }

  if (meta.private && !authed) {
    return (
      <div className="gate-wrap">
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
