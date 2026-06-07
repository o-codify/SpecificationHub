import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../auth";
import { useMeta } from "../brand";

/**
 * Layout route that guards the docs/branches/review pages by site policy:
 *  - domain has no repository binding → /docs shows a plain notice (just the
 *    fact, no action buttons); Branches/Review redirect to /docs.
 *  - site is private and the visitor isn't signed in → a plain "private" notice.
 * Actions live elsewhere (Settings in the nav for admins; Log in in the top bar).
 */
export function SiteGate() {
  const { authed, role } = useAuth();
  const meta = useMeta();
  const location = useLocation();

  if (!meta) return null; // brief: meta still loading

  const onDocs = location.pathname.startsWith("/docs") || location.pathname === "/";

  if (!meta.linked) {
    if (!onDocs) return <Navigate to="/docs" replace />;
    const admin = authed && role === "admin";
    return (
      <div className="gate-wrap">
        <section className="card site-gate">
          <h2>{admin ? "Repository not connected" : "Nothing here yet"}</h2>
          <p className="muted">
            {admin
              ? "This address isn’t linked to a documentation repository yet."
              : "This site doesn’t have any documentation yet."}
          </p>
        </section>
      </div>
    );
  }

  if (meta.private && !authed) {
    return (
      <div className="gate-wrap">
        <section className="card site-gate">
          <h2>Private documentation</h2>
          <p className="muted">This documentation is private.</p>
        </section>
      </div>
    );
  }

  return <Outlet />;
}
