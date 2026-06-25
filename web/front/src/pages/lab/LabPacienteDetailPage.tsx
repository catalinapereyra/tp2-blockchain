import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useWallet } from "../../context/WalletContext";
import { api, type DocumentMetadata } from "../../lib/api";
import { categoryLabel } from "../../lib/categories";
import { palette, colors, fontFamily, fontSize, fontWeight, radius, shadow, gradients } from "../../styles";

function fmtDate(d?: string): string {
  if (!d) return "—";
  const p = new Date(d);
  if (isNaN(p.getTime())) return d;
  return p.toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" });
}

export default function LabPacienteDetailPage() {
  const navigate = useNavigate();
  const { address: patientAddress } = useParams<{ address: string }>();
  const { address } = useWallet();
  const [studies, setStudies] = useState<DocumentMetadata[]>([]);
  const [patientName, setPatientName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!address || !patientAddress) return;
    Promise.all([
      api.getLaboratoryStudies(address),
      api.getProfileByWallet(patientAddress).catch(() => null),
    ])
      .then(([docs, profile]: [DocumentMetadata[], any]) => {
        const mine = docs.filter((d) => d.patientAddress.toLowerCase() === patientAddress.toLowerCase());
        mine.sort((a, b) => new Date(b.studyDate ?? b.createdAt).getTime() - new Date(a.studyDate ?? a.createdAt).getTime());
        setStudies(mine);
        if (profile?.name) setPatientName(`${profile.name} ${profile.lastName ?? ""}`.trim());
      })
      .catch((e: any) => setError(e.message || "Error cargando estudios"))
      .finally(() => setLoading(false));
  }, [address, patientAddress]);

  return (
    <div style={s.page}>
      <div style={s.container}>
        <div style={s.topBar}>
          <button style={s.backBtn} onClick={() => navigate("/lab/pacientes")}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
            Mis pacientes
          </button>
        </div>

        <div style={s.header}>
          <div style={s.avatarWrap}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={palette.emerald500} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
            </svg>
          </div>
          <div>
            {patientName ? <h1 style={s.title}>{patientName}</h1> : <h1 style={s.titleMono}>{patientAddress?.slice(0, 12)}…{patientAddress?.slice(-8)}</h1>}
            {patientName && <p style={s.addr}>{patientAddress?.slice(0, 12)}…{patientAddress?.slice(-8)}</p>}
            <p style={s.subtitle}>{loading ? "Cargando…" : `${studies.length} estudio${studies.length !== 1 ? "s" : ""} subido${studies.length !== 1 ? "s" : ""}`}</p>
          </div>
        </div>

        {loading && <div style={s.center}><div style={s.spinner} /></div>}
        {error && <div style={s.errorBox}>{error}</div>}

        {!loading && studies.length === 0 && (
          <div style={s.empty}><span style={s.emptyText}>No le subiste estudios a este paciente.</span></div>
        )}

        <div style={s.list}>
          {studies.map((d) => (
            <div key={d.documentIdOnChain} style={s.studyCard}>
              <div style={s.studyHead}>
                <div style={s.studyTitleWrap}>
                  <span style={s.studyTitle}>{d.title}</span>
                  <span style={s.catPill}>{categoryLabel(d.documentType)}</span>
                </div>
                <span style={s.date}>{fmtDate(d.studyDate ?? d.createdAt)}</span>
              </div>

              <div style={s.fieldsGrid}>
                {d.studyType && <Field label="Tipo de estudio (off-chain)" value={d.studyType} />}
                {d.labName && <Field label="Laboratorio" value={d.labName} />}
                <Field label="Doc ID (on-chain)" value={`#${d.documentIdOnChain}`} mono />
                <Field label="Archivo" value={d.fileName} />
              </div>

              {d.notes && <p style={s.notes}>📝 {d.notes}</p>}

              <a href={api.fileUrl(d.documentIdOnChain)} target="_blank" rel="noreferrer" style={s.viewBtn}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                Ver / descargar documento
              </a>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={s.field}>
      <span style={s.fieldLabel}>{label}</span>
      <span style={mono ? s.fieldValueMono : s.fieldValue}>{value}</span>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: { minHeight: "calc(100vh - 56px)", background: gradients.app, fontFamily: fontFamily.sans, paddingBottom: 60 },
  container: { maxWidth: 680, margin: "0 auto", padding: "28px 20px" },
  topBar: { marginBottom: 20 },
  backBtn: { display: "inline-flex", alignItems: "center", gap: 5, background: "none", border: "none", color: colors.textMuted, fontSize: fontSize.base, fontWeight: fontWeight.medium, cursor: "pointer", padding: 0, fontFamily: fontFamily.sans },
  header: { display: "flex", alignItems: "center", gap: 12, marginBottom: 24 },
  avatarWrap: { width: 48, height: 48, borderRadius: radius.lg, background: colors.labSoft, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  title: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text, margin: 0, letterSpacing: "-0.3px" },
  titleMono: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text, margin: 0, fontFamily: fontFamily.mono },
  addr: { fontFamily: fontFamily.mono, fontSize: fontSize.xs, color: colors.textFaint, margin: "2px 0 0" },
  subtitle: { fontSize: fontSize.base, color: colors.textFaint, margin: "2px 0 0" },
  center: { display: "flex", justifyContent: "center", padding: "48px 0" },
  spinner: { width: 28, height: 28, border: `3px solid ${colors.border}`, borderTopColor: colors.lab, borderRadius: "50%", animation: "spin 0.8s linear infinite" },
  errorBox: { background: colors.error.bg, border: `1px solid ${colors.error.border}`, borderRadius: radius.md, padding: "12px 16px", fontSize: fontSize.base, color: colors.error.fg },
  empty: { display: "flex", justifyContent: "center", padding: "48px 0" },
  emptyText: { fontSize: fontSize.md, color: colors.textFaint },
  list: { display: "flex", flexDirection: "column" as const, gap: 12 },
  studyCard: { background: colors.surface, border: `1px solid ${colors.bgSubtle}`, borderRadius: radius.xl, padding: "16px 18px", display: "flex", flexDirection: "column" as const, gap: 12, boxShadow: shadow.sm },
  studyHead: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 },
  studyTitleWrap: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" as const },
  studyTitle: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.text },
  catPill: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, background: colors.labSoft, color: colors.lab, padding: "2px 10px", borderRadius: radius.full },
  date: { fontSize: fontSize.sm, color: colors.textFaint, whiteSpace: "nowrap" as const },
  fieldsGrid: { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 },
  field: { display: "flex", flexDirection: "column" as const, gap: 2, minWidth: 0 },
  fieldLabel: { fontSize: 10, fontWeight: fontWeight.semibold, color: colors.textFaint, textTransform: "uppercase" as const, letterSpacing: "0.3px" },
  fieldValue: { fontSize: fontSize.base, color: colors.text },
  fieldValueMono: { fontSize: fontSize.base, color: colors.text, fontFamily: fontFamily.mono },
  notes: { fontSize: fontSize.base, color: colors.textSecondary, lineHeight: 1.5, margin: 0, background: colors.bgApp, borderRadius: radius.md, padding: "8px 12px" },
  viewBtn: { display: "inline-flex", alignItems: "center", gap: 6, alignSelf: "flex-start", fontSize: fontSize.base, color: colors.primary, fontWeight: fontWeight.semibold, textDecoration: "none" },
};
