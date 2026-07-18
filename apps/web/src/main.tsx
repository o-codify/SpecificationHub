import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "./App";
import { AuthProvider } from "./auth";
import { ToastProvider } from "./toast";
import { LayoutProvider } from "./layout";
import { siteBase } from "./siteBase";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter basename={siteBase || undefined}>
      <AuthProvider>
        <ToastProvider>
          <LayoutProvider>
            <App />
          </LayoutProvider>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
