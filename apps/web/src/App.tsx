import { Navigate, Route, Routes } from "react-router-dom";
import { DocsLayout } from "./pages/DocsLayout";
import { DocViewer } from "./pages/DocViewer";
import { AdminLayout } from "./pages/AdminLayout";
import { AdminDocs } from "./pages/AdminDocs";
import { AdminEditor } from "./pages/AdminEditor";
import { AdminDiff } from "./pages/AdminDiff";
import { AdminBranches } from "./pages/AdminBranches";
import { AdminTokens } from "./pages/AdminTokens";

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/docs" replace />} />
      <Route path="/docs" element={<DocsLayout />}>
        <Route index element={<DocViewer />} />
        <Route path="*" element={<DocViewer />} />
      </Route>
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<AdminDocs />} />
        <Route path="docs" element={<AdminDocs />} />
        <Route path="editor" element={<AdminEditor />} />
        <Route path="diff" element={<AdminDiff />} />
        <Route path="branches" element={<AdminBranches />} />
        <Route path="tokens" element={<AdminTokens />} />
      </Route>
      <Route path="*" element={<Navigate to="/docs" replace />} />
    </Routes>
  );
}
