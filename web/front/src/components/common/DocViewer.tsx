import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { colors, fontFamily, fontSize, fontWeight, radius, shadow } from "../../styles";

interface DocViewerOptions {
  url: string; // URL del archivo (sirve para verlo y descargarlo)
  fileName?: string; //nombre sugerido al descargar
  title?: string;
}

interface DocViewerContextValue {
  open: (opts: DocViewerOptions) => void;
}

const DocViewerContext = createContext<DocViewerContextValue | null>(null);

export function useDocViewer() {
  const ctx = useContext(DocViewerContext);
  if (!ctx) throw new Error("useDocViewer debe usarse dentro de <DocViewerProvider>");
  return ctx;
}

export function DocViewerProvider({ children }: { children: ReactNode }) {
  const [doc, setDoc] = useState<DocViewerOptions | null>(null);
  const [downloading, setDownloading] = useState(false);

  const open = useCallback((opts: DocViewerOptions) => setDoc(opts), []);
  const close = useCallback(() => setDoc(null), []);

  async function download() {
    if (!doc) return;
    setDownloading(true);
    try {
      const res = await fetch(doc.url);
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = doc.fileName || doc.title || "documento";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(a.href);
    } catch {
      window.open(doc.url, "_blank");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <DocViewerContext.Provider value={{ open }}>
      {children}
      {doc && (
        <div style={s.overlay} onClick={close}>
          <div style={s.modal} onClick={(e) => e.stopPropagation()}>
            <div style={s.header}>
              <span style={s.title}>{doc.title || "Documento"}</span>
              <div style={s.actions}>
                <button style={s.downloadBtn} onClick={download} disabled={downloading}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  {downloading ? "Descargando…" : "Descargar"}
                </button>
                <button style={s.closeBtn} onClick={close} aria-label="Cerrar">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
            </div>
            <div style={s.body}>
              <iframe src={doc.url} title={doc.title || "Documento"} style={s.frame} />
            </div>
          </div>
        </div>
      )}
    </DocViewerContext.Provider>
  );
}

const s: Record<string, React.CSSProperties> = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(15,23,42,0.55)",
    backdropFilter: "blur(2px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1300,
    padding: 20,
  },
  modal: {
    background: colors.surface,
    borderRadius: radius["2xl"],
    boxShadow: shadow.lg,
    width: "100%",
    maxWidth: 820,
    height: "85vh",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    fontFamily: fontFamily.sans,
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    padding: "14px 18px",
    borderBottom: `1px solid ${colors.bgSubtle}`,
  },
  title: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  actions: { display: "flex", alignItems: "center", gap: 8, flexShrink: 0 },
  downloadBtn: {
    display: "inline-flex", alignItems: "center", gap: 6,
    background: colors.primary, color: colors.textOnBrand, border: "none",
    padding: "8px 14px", borderRadius: radius.md, fontSize: fontSize.base, fontWeight: fontWeight.semibold,
    cursor: "pointer", fontFamily: fontFamily.sans,
  },
  closeBtn: {
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    width: 34, height: 34, borderRadius: radius.md,
    background: colors.bgApp, color: colors.textMuted, border: `1px solid ${colors.border}`,
    cursor: "pointer",
  },
  body: { flex: 1, background: colors.bgApp, minHeight: 0 },
  frame: { width: "100%", height: "100%", border: "none" },
};
