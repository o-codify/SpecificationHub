import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { AppShell } from "./components/AppShell";
import { SiteGate } from "./components/SiteGate";
import { useAuth } from "./auth";

/**
 * Map an unknown path to a /docs route, so GitHub-style links like
 * `/unreal/transform-query.md#heading` resolve to the in-app doc (with anchor).
 */
function DocPathRedirect() {
  const loc = useLocation();
  const rest = loc.pathname
    .replace(/^\/+/, "")
    .replace(/\.md$/i, "")
    .replace(/\/index$/i, "");
  const target = rest ? `/docs/${rest}${loc.search}${loc.hash}` : "/docs";
  return <Navigate to={target} replace />;
}
import { DocsReader } from "./pages/DocsReader";
import { AdminBranches } from "./pages/AdminBranches";
import { AdminDiff } from "./pages/AdminDiff";
import { AdminSites } from "./pages/AdminSites";

/** Guests may only see Docs and Review — everything else redirects to Docs. */
function RequireAuth({ children }: { children: ReactNode }) {
  const { ready, authed } = useAuth();
  if (!ready) return null; // wait for auth hydration before deciding
  if (!authed) return <Navigate to="/docs" replace />;
  return <>{children}</>;
}

export function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        {/* Settings: signed-in admins only (outside SiteGate so it's reachable
            even on an unconfigured domain, to bind a repository). */}
        <Route
          path="/settings"
          element={
            <RequireAuth>
              <AdminSites />
            </RequireAuth>
          }
        />

        {/* Everything else is gated by the site's link state / visibility. */}
        <Route element={<SiteGate />}>
          <Route index element={<Navigate to="/docs" replace />} />
          <Route path="/docs/*" element={<DocsReader />} />
          {/* Branches is sign-in only; guests are redirected to Docs. */}
          <Route
            path="/branches"
            element={
              <RequireAuth>
                <div className="page">
                  <AdminBranches />
                </div>
              </RequireAuth>
            }
          />
          {/* Review is readable by everyone; its write actions are gated inside. */}
          <Route
            path="/review"
            element={
              <div className="page">
                <AdminDiff />
              </div>
            }
          />
          <Route path="*" element={<DocPathRedirect />} />
        </Route>
      </Route>
    </Routes>
  );
}
