import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { ethers } from "ethers";
import { api } from "../../lib/api";
import { getDocumentRegistry } from "../../lib/contracts";
import { colors, palette, fontFamily, fontSize, fontWeight, radius, shadow } from "../../styles";

interface DocViewerOptions {
  url: string; // URL del archivo (sirve para verlo y descargarlo)
  fileName?: string; //nombre sugerido al descargar
  title?: string;
  documentId?: number; // id on-chain, para verificar integridad
}

type VerifyResult = "ok" | "fail" | "error" | null;

const VERIFY_LABEL: Record<"ok" | "fail" | "error", string> = {
  ok: "✓ Documento íntegro",
  fail: "⚠ Fue modificado",
  error: "No se pudo verificar",
};

const VERIFY_STYLE: Record<"ok" | "fail" | "error", React.CSSProperties> = {
  ok: { background: colors.success.bg, color: colors.success.fg },
  fail: { background: colors.error.bg, color: colors.error.fg },
  error: { background: colors.warning.bg, color: colors.warning.fg },
};

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
  const [blob, setBlob] = useState<Blob | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<VerifyResult>(null);

  const open = useCallback((opts: DocViewerOptions) => { setDoc(opts); setVerifyResult(null); }, []);
  const close = useCallback(() => setDoc(null), []);

  // doc.url apunta a un endpoint protegido por JWT (/api/documents/:id/file). No se puede
  // usar directamente como src de un <iframe>: el navegador no manda el header
  // Authorization en esas requests, así que el backend respondería 401. Por eso lo bajamos
  // una sola vez acá como Blob (autenticado) y reusamos ese mismo blob para ver, verificar
  // y descargar.
  useEffect(() => {
    if (!doc) {
      setBlob(null);
      setBlobUrl(null);
      setLoadError(false);
      return;
    }

    let cancelled = false;
    let objectUrl: string | null = null;
    setBlob(null);
    setBlobUrl(null);
    setLoadError(false);

    api.fetchFileBlob(doc.url)
      .then((b) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(b);
        setBlob(b);
        setBlobUrl(objectUrl);
      })
      .catch(() => { if (!cancelled) setLoadError(true); });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [doc]);

  // Recalcula el hash del archivo actual y lo compara con el on-chain (sin gas).
  async function verify() {
    if (!doc || doc.documentId == null || !blob) return;
    setVerifying(true);
    setVerifyResult(null);
    try {
      const buf = await blob.arrayBuffer();
      const keccak = ethers.keccak256(new Uint8Array(buf));
      const shaBytes = new Uint8Array(await crypto.subtle.digest("SHA-256", buf));
      const sha = "0x" + Array.from(shaBytes).map((b) => b.toString(16).padStart(2, "0")).join("");

      const registry = await getDocumentRegistry();
      // Los docs viejos usan keccak256 o sha256 según cómo se subieron: probamos ambos
      const ok =
        (await registry.verifyDocument(doc.documentId, keccak).catch(() => false)) ||
        (await registry.verifyDocument(doc.documentId, sha).catch(() => false));
      setVerifyResult(ok ? "ok" : "fail");
    } catch {
      setVerifyResult("error");
    } finally {
      setVerifying(false);
    }
  }

  function download() {
    if (!doc || !blobUrl) return;
    setDownloading(true);
    try {
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = doc.fileName || doc.title || "documento";
      document.body.appendChild(a);
      a.click();
      a.remove();
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
                {doc.documentId != null && (
                  verifyResult ? (
                    <span style={{ ...s.verifyBadge, ...VERIFY_STYLE[verifyResult] }}>{VERIFY_LABEL[verifyResult]}</span>
                  ) : (
                    <button style={s.verifyBtn} onClick={verify} disabled={verifying || !blob}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>
                      {verifying ? "Verificando…" : "Verificar integridad"}
                    </button>
                  )
                )}
                <button style={s.downloadBtn} onClick={download} disabled={downloading || !blobUrl}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  {downloading ? "Descargando…" : "Descargar"}
                </button>
                <button style={s.closeBtn} onClick={close} aria-label="Cerrar">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
            </div>
            <div style={s.body}>
              {blobUrl ? (
                <iframe src={blobUrl} title={doc.title || "Documento"} style={s.frame} />
              ) : (
                <div style={s.loadingBox}>{loadError ? "No se pudo cargar el archivo." : "Cargando documento…"}</div>
              )}
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
  verifyBtn: {
    display: "inline-flex", alignItems: "center", gap: 6,
    background: colors.surface, color: colors.lab, border: `1.5px solid ${palette.emerald200}`,
    padding: "7px 12px", borderRadius: radius.md, fontSize: fontSize.sm, fontWeight: fontWeight.semibold,
    cursor: "pointer", fontFamily: fontFamily.sans,
  },
  verifyBadge: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, padding: "6px 12px", borderRadius: radius.md },
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
  loadingBox: {
    width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center",
    color: colors.textMuted, fontSize: fontSize.base,
  },
  frame: { width: "100%", height: "100%", border: "none" },
};
