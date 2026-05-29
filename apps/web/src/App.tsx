import { useEffect, type ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { DocsReader } from "./pages/DocsReader";
import { AdminBranches } from "./pages/AdminBranches";
import { AdminTokens } from "./pages/AdminTokens";
import { useAuth } from "./auth";

function RequireAuth({ children }: { children: ReactNode }) {
  const { ready, authed, openLogin } = useAuth();
  useEffect(() => {
    if (ready && !authed) openLogin();
  }, [ready, authed, openLogin]);
  if (!ready) return null;
  if (!authed) return <Navigate to="/docs" replace />;
  return <>{children}</>;
}

export function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Navigate to="/docs" replace />} />
        <Route path="/docs/*" element={<DocsReader />} />
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
        <Route
          path="/tokens"
          element={
            <RequireAuth>
              <div className="page">
                <AdminTokens />
              </div>
            </RequireAuth>
          }
        />
        <Route path="*" element={<Navigate to="/docs" replace />} />
      </Route>
    </Routes>
  );
}
