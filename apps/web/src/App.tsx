import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { DocsReader } from "./pages/DocsReader";
import { AdminBranches } from "./pages/AdminBranches";
import { AdminDiff } from "./pages/AdminDiff";

export function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Navigate to="/docs" replace />} />
        <Route path="/docs/*" element={<DocsReader />} />
        {/* Branches & Review are readable by everyone; the write actions inside
            them (create/delete branch, accept) are gated to signed-in admins. */}
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
    </Routes>
  );
}
