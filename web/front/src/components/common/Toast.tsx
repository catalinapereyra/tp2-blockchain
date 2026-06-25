import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { colors, fontFamily, fontSize, fontWeight, radius, shadow } from "../../styles";

type ToastType = "success" | "error" | "info";

interface ToastLink {
  href: string;
  label: string;
}

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
  link?: ToastLink;
}

interface ToastOptions {
  // Link opcional (ej: ver la transacción firmada en Etherscan).
  link?: ToastLink;
}

interface ToastContextValue {
  show: (message: string, type?: ToastType, options?: ToastOptions) => void;
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
  success: { color: colors.success.fg, bg: colors.success.bg, border: colors.success.border },
  error: { color: colors.error.fg, bg: colors.error.bg, border: colors.error.border },
  info: { color: colors.info.fg, bg: colors.info.bg, border: colors.info.border },
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
      {item.link && (
        <a
          href={item.link.href}
          target="_blank"
          rel="noopener noreferrer"
          style={{ ...s.link, color: ACCENT[item.type].color }}
        >
          {item.link.label}
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
        </a>
      )}
    </div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const show = useCallback((message: string, type: ToastType = "success", options?: ToastOptions) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, type, link: options?.link }]);
    // Si hay un link para clickear, le damos más tiempo al usuario.
    const duration = options?.link ? 8000 : 3000;
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), duration);
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
    borderRadius: radius.lg,
    boxShadow: shadow.md,
    fontFamily: fontFamily.sans,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    animation: "toastIn 0.18s ease-out",
    minWidth: 220,
    pointerEvents: "auto",
  },
  icon: { display: "flex", flexShrink: 0 },
  message: { lineHeight: 1.3 },
  link: {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    marginLeft: 4,
    flexShrink: 0,
    textDecoration: "underline",
    cursor: "pointer",
    fontWeight: fontWeight.semibold,
  },
};
