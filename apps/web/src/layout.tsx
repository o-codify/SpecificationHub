import { createContext, useContext, useState, type ReactNode } from "react";

interface LayoutCtx {
  sidebarOpen: boolean;
  setSidebarOpen: (v: boolean) => void;
  navOpen: boolean;
  setNavOpen: (v: boolean) => void;
}

const Ctx = createContext<LayoutCtx | null>(null);

export function useLayout(): LayoutCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error("useLayout outside LayoutProvider");
  return v;
}

export function LayoutProvider({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  return (
    <Ctx.Provider value={{ sidebarOpen, setSidebarOpen, navOpen, setNavOpen }}>
      {children}
    </Ctx.Provider>
  );
}
