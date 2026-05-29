import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";

interface ToastCtx {
  show: (node: ReactNode) => void;
}

const Ctx = createContext<ToastCtx>({ show: () => {} });

export function useToast(): ToastCtx {
  return useContext(Ctx);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [content, setContent] = useState<ReactNode>(null);
  const [visible, setVisible] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  const show = useCallback((node: ReactNode) => {
    setContent(node);
    setVisible(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setVisible(false), 4200);
  }, []);

  return (
    <Ctx.Provider value={{ show }}>
      {children}
      <div className={`toast${visible ? " show" : ""}`}>
        <div className="banner good">{content}</div>
      </div>
    </Ctx.Provider>
  );
}
