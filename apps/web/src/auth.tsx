import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { api, getToken, setToken } from "./api";

interface AuthState {
  ready: boolean;
  authed: boolean;
  user: string;
  role: string | null;
}

interface AuthCtx extends AuthState {
  loginOpen: boolean;
  openLogin: () => void;
  closeLogin: () => void;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

export function useAuth(): AuthCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth outside AuthProvider");
  return v;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    ready: false,
    authed: false,
    user: "",
    role: null,
  });
  const [loginOpen, setLoginOpen] = useState(false);

  const hydrate = useCallback(async () => {
    if (!getToken()) {
      setState({ ready: true, authed: false, user: "", role: null });
      return;
    }
    try {
      const me = await api.me();
      if (me.authenticated) {
        setState({ ready: true, authed: true, user: me.name ?? "", role: me.role ?? null });
      } else {
        setToken("");
        setState({ ready: true, authed: false, user: "", role: null });
      }
    } catch {
      setToken("");
      setState({ ready: true, authed: false, user: "", role: null });
    }
  }, []);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const login = useCallback(async (username: string, password: string) => {
    const res = await api.login(username, password);
    setToken(res.token);
    setState({ ready: true, authed: true, user: res.user.name, role: res.user.role });
    setLoginOpen(false);
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } catch {
      /* ignore */
    }
    setToken("");
    setState({ ready: true, authed: false, user: "", role: null });
  }, []);

  return (
    <Ctx.Provider
      value={{
        ...state,
        loginOpen,
        openLogin: () => setLoginOpen(true),
        closeLogin: () => setLoginOpen(false),
        login,
        logout,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}
