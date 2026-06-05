import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { SiteGate } from "./components/SiteGate";
import { DocsReader } from "./pages/DocsReader";
import { AdminBranches } from "./pages/AdminBranches";
import { AdminDiff } from "./pages/AdminDiff";
import { AdminSites } from "./pages/AdminSites";

export function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        {/* Settings is reachable even on an unlinked/private domain so an admin can
            configure bindings — so it sits OUTSIDE the SiteGate. */}
        <Route path="/settings" element={<AdminSites />} />

        {/* Everything else is gated by the site's link state / visibility. */}
        <Route element={<SiteGate />}>
          <Route index element={<Navigate to="/docs" replace />} />
          <Route path="/docs/*" element={<DocsReader />} />
          {/* Branches & Review are readable by everyone on a public site; the write
              actions inside them are gated to signed-in admins. */}
          <Route
            path="/branches"
            element={
              <div className="page">
                <AdminBranches />
              </div>
            }
          />
          <Route
            path="/review"
            element={
              <div className="page">
                <AdminDiff />
              </div>
            }
          />
          <Route path="*" element={<Navigate to="/docs" replace />} />
        </Route>
      </Route>
    </Routes>
  );
}
