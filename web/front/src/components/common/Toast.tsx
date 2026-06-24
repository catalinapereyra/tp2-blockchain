import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";

type ToastType = "success" | "error" | "info";

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  show: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

/**
 * Hook para disparar un popup (toast) desde cualquier pantalla.
 * Ej: const toast = useToast(); toast.show("Diagnóstico enviado");
 */
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast debe usarse dentro de <ToastProvider>");
  return ctx;
}

const ACCENT: Record<ToastType, { color: string; bg: string; border: string }> = {
  success: { color: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0" },
  error: { color: "#dc2626", bg: "#fef2f2", border: "#fecaca" },
  info: { color: "#6366f1", bg: "#eef2ff", border: "#c7d2fe" },
};

function ToastCard({ item }: { item: ToastItem }) {
  const a = ACCENT[item.type];
  return (
    <div style={{ ...s.toast, background: a.bg, border: `1px solid ${a.border}`, color: a.color }}>
      <span style={s.icon}>
        {item.type === "success" ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
        ) : item.type === "error" ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>
        )}
      </span>
      <span style={s.message}>{item.message}</span>
    </div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const show = useCallback((message: string, type: ToastType = "success") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3000);
  }, []);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div style={s.container}>
        {toasts.map((t) => <ToastCard key={t.id} item={t} />)}
      </div>
      <style>{`
        @keyframes toastIn {
          from { opacity: 0; transform: translateY(-8px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </ToastContext.Provider>
  );
}

const s: Record<string, React.CSSProperties> = {
  container: {
    position: "fixed",
    top: 20,
    left: "50%",
    transform: "translateX(-50%)",
    display: "flex",
    flexDirection: "column",
    gap: 8,
    zIndex: 1000,
    pointerEvents: "none",
  },
  toast: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "11px 16px",
    borderRadius: 12,
    boxShadow: "0 8px 28px rgba(15,23,42,0.14)",
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 14,
    fontWeight: 600,
    animation: "toastIn 0.18s ease-out",
    minWidth: 220,
  },
  icon: { display: "flex", flexShrink: 0 },
  message: { lineHeight: 1.3 },
};
