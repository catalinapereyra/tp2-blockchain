import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { colors, fontFamily, fontSize, fontWeight, radius, shadow } from "../../styles";

interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
}

interface ConfirmContextValue {
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm debe usarse dentro de <ConfirmProvider>");
  return ctx.confirm;
}

interface State {
  open: boolean;
  opts: ConfirmOptions;
  resolve?: (v: boolean) => void;
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>({ open: false, opts: { message: "" } });

  const confirm = useCallback((opts: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => setState({ open: true, opts, resolve }));
  }, []);

  const close = useCallback((result: boolean) => {
    setState((s) => {
      s.resolve?.(result);
      return { ...s, open: false };
    });
  }, []);

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {state.open && (
        <div style={s.overlay} onClick={() => close(false)}>
          <div style={s.card} onClick={(e) => e.stopPropagation()}>
            {state.opts.title && <h3 style={s.title}>{state.opts.title}</h3>}
            <p style={s.message}>{state.opts.message}</p>
            <div style={s.actions}>
              <button style={s.cancelBtn} onClick={() => close(false)}>
                {state.opts.cancelText ?? "Cancelar"}
              </button>
              <button
                style={{ ...s.confirmBtn, ...(state.opts.danger ? s.confirmDanger : {}) }}
                onClick={() => close(true)}
              >
                {state.opts.confirmText ?? "Aceptar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

const s: Record<string, React.CSSProperties> = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(15,23,42,0.45)",
    backdropFilter: "blur(2px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1200,
    padding: 20,
  },
  card: {
    background: colors.surface,
    borderRadius: radius["2xl"],
    padding: "24px 24px 20px",
    width: "100%",
    maxWidth: 380,
    boxShadow: shadow.lg,
    fontFamily: fontFamily.sans,
    animation: "toastIn 0.16s ease-out",
  },
  title: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text, margin: "0 0 6px" },
  message: { fontSize: fontSize.md, color: colors.textSecondary, lineHeight: 1.5, margin: "0 0 20px" },
  actions: { display: "flex", justifyContent: "flex-end", gap: 8 },
  cancelBtn: {
    background: colors.surface, color: colors.textMuted, border: `1.5px solid ${colors.border}`,
    padding: "9px 18px", borderRadius: radius.md, fontSize: fontSize.base, fontWeight: fontWeight.semibold,
    cursor: "pointer", fontFamily: fontFamily.sans,
  },
  confirmBtn: {
    background: colors.primary, color: colors.textOnBrand, border: "none",
    padding: "9px 18px", borderRadius: radius.md, fontSize: fontSize.base, fontWeight: fontWeight.semibold,
    cursor: "pointer", fontFamily: fontFamily.sans,
  },
  confirmDanger: { background: colors.error.fg },
};
