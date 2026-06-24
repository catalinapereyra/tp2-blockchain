import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";
import Spinner from "./Spinner";
import { colors, fontFamily, fontSize, fontWeight, radius, shadow } from "../../styles";

interface LoaderContextValue {
  show: (message?: string) => void;
  hide: () => void;
}

const LoaderContext = createContext<LoaderContextValue | null>(null);

/**
 * Hook para mostrar un overlay con loader mientras se espera una firma o
 * transacción (ej: MetaMask). Ej:
 *   const loader = useLoader();
 *   loader.show("Confirmá en MetaMask…");
 *   try { ...tx... } finally { loader.hide(); }
 */
export function useLoader() {
  const ctx = useContext(LoaderContext);
  if (!ctx) throw new Error("useLoader debe usarse dentro de <LoaderProvider>");
  return ctx;
}

export function LoaderProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ visible: boolean; message: string }>({
    visible: false,
    message: "",
  });

  const show = useCallback((message = "Procesando…") => setState({ visible: true, message }), []);
  const hide = useCallback(() => setState((s) => ({ ...s, visible: false })), []);

  return (
    <LoaderContext.Provider value={{ show, hide }}>
      {children}
      {state.visible && (
        <div style={s.overlay}>
          <div style={s.card}>
            <Spinner size={42} thickness={3} />
            <span style={s.message}>{state.message}</span>
            <span style={s.hint}>Esto puede tardar unos segundos…</span>
          </div>
        </div>
      )}
    </LoaderContext.Provider>
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
    zIndex: 1100,
  },
  card: {
    background: colors.surface,
    borderRadius: radius["2xl"],
    padding: "28px 32px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 12,
    boxShadow: shadow.lg,
    fontFamily: fontFamily.sans,
    maxWidth: 300,
    textAlign: "center",
  },
  message: { fontSize: fontSize.lg, fontWeight: fontWeight.semibold, color: colors.text, lineHeight: 1.4 },
  hint: { fontSize: fontSize.sm, color: colors.textFaint },
};
