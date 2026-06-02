import { useEffect } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../auth";
import { useLayout } from "../layout";
import { setViewAccent } from "../status";
import { ThemeToggle } from "./ThemeToggle";
import { LoginModal } from "./LoginModal";
import { Brand } from "../brand";

export function AppShell() {
  const { authed, user, openLogin, logout } = useAuth();
  const { navOpen, setNavOpen, setSidebarOpen } = useLayout();
  const location = useLocation();

  const onDocs = location.pathname.startsWith("/docs") || location.pathname === "/";
  const section = onDocs
    ? "docs"
    : location.pathname.replace(/^\/+/, "").split("/")[0] || "docs";

  useEffect(() => {
    setViewAccent(section);
    document.body.classList.toggle("is-auth", authed);
    document.body.classList.toggle("v-site", onDocs);
    document.body.classList.toggle("v-admin", !onDocs);
  }, [section, authed, onDocs]);

  // Branches & Review are viewable by everyone (read-only for guests), so just
  // navigate — the NavLink handles routing; we only close the mobile nav.
  const goAdmin = (_e: React.MouseEvent, _to: string) => {
    setNavOpen(false);
  };

  const onMenu = () => {
    if (onDocs) setSidebarOpen(true);
    else setNavOpen(!navOpen);
  };

  return (
    <>
      <header className="topbar">
        <button className="menu-btn" aria-label="Menu" onClick={onMenu}>
          ☰
        </button>
        <Link to="/docs" className="brand" title="Docs home">
          <Brand />
        </Link>
        <nav className={`nav${navOpen ? " open" : ""}`}>
          <NavLink to="/branches" onClick={(e) => goAdmin(e, "/branches")}>
            Branches
          </NavLink>
          <NavLink to="/review" onClick={(e) => goAdmin(e, "/review")}>
            Review
          </NavLink>
        </nav>
        <div className="spacer" />
        <button
          className="btn btn-ghost auth-btn"
          title={authed ? `Signed in as ${user}` : undefined}
          onClick={() => (authed ? logout() : openLogin())}
        >
          {authed ? "Log out" : "Log in"}
        </button>
        <ThemeToggle />
      </header>

      <Outlet />
      <LoginModal />
    </>
  );
}
