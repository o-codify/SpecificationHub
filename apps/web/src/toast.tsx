import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";

type ToastKind = "good" | "bad";

interface ToastCtx {
  show: (node: ReactNode, kind?: ToastKind) => void;
}

const Ctx = createContext<ToastCtx>({ show: () => {} });

export function useToast(): ToastCtx {
  return useContext(Ctx);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [content, setContent] = useState<ReactNode>(null);
  const [kind, setKind] = useState<ToastKind>("good");
  const [visible, setVisible] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  const show = useCallback((node: ReactNode, k: ToastKind = "good") => {
    setContent(node);
    setKind(k);
    setVisible(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setVisible(false), 4200);
  }, []);

  return (
    <Ctx.Provider value={{ show }}>
      {children}
      <div className={`toast${visible ? " show" : ""}`}>
        <div className={`banner ${kind}`}>{content}</div>
      </div>
    </Ctx.Provider>
  );
}
