import React, { useEffect, useRef, useState } from "react";
import { ethers } from "ethers";
import { AppUser } from "../../lib/api";

interface UserSelectProps {
  users: AppUser[];
  value: string; // address seleccionada (checksum) o ""
  onChange: (address: string) => void;
  placeholder?: string;
  emptyText?: string;
  accent?: string; // color de acento para que combine con cada pantalla
  disabled?: boolean;
}

function shortAddr(a: string) {
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

function userName(u: AppUser) {
  return `${u.name} ${u.lastName ?? ""}`.trim();
}

/**
 * Desplegable reutilizable para elegir un usuario (médico / paciente).
 * Muestra el nombre y apellido off-chain en grande y la address chiquita.
 * Estilado para combinar con el resto de la app (no usa el <select> nativo).
 */
export default function UserSelect({
  users,
  value,
  onChange,
  placeholder = "Seleccioná…",
  emptyText = "No hay opciones disponibles.",
  accent = "#6366f1",
  disabled = false,
}: UserSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const selected = users.find(
    (u) => u.walletAddress.toLowerCase() === value.toLowerCase(),
  );

  const isEmpty = users.length === 0;

  return (
    <div ref={ref} style={s.wrap}>
      <button
        type="button"
        disabled={disabled || isEmpty}
        onClick={() => setOpen((o) => !o)}
        style={{
          ...s.trigger,
          ...(open ? { borderColor: accent, boxShadow: `0 0 0 3px ${accent}1a` } : {}),
          ...(disabled || isEmpty ? s.triggerDisabled : {}),
        }}
      >
        {selected ? (
          <span style={s.selectedRow}>
            <span style={s.name}>{userName(selected)}</span>
            <span style={s.addr}>{shortAddr(selected.walletAddress)}</span>
          </span>
        ) : (
          <span style={s.placeholder}>{isEmpty ? emptyText : placeholder}</span>
        )}
        <svg
          width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.15s", flexShrink: 0 }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && !isEmpty && (
        <div style={s.menu}>
          {users.map((u) => {
            const addr = ethers.getAddress(u.walletAddress);
            const isSel = u.walletAddress.toLowerCase() === value.toLowerCase();
            return (
              <button
                key={u.walletAddress}
                type="button"
                onClick={() => {
                  onChange(addr);
                  setOpen(false);
                }}
                style={{ ...s.item, ...(isSel ? { background: `${accent}12` } : {}) }}
                onMouseEnter={(e) => (e.currentTarget.style.background = `${accent}0f`)}
                onMouseLeave={(e) => (e.currentTarget.style.background = isSel ? `${accent}12` : "transparent")}
              >
                <span style={s.itemName}>{userName(u)}</span>
                <span style={s.itemAddr}>{shortAddr(u.walletAddress)}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  wrap: { position: "relative", width: "100%" },
  trigger: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    border: "1.5px solid #e2e8f0",
    borderRadius: 10,
    padding: "10px 12px",
    background: "white",
    cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif",
    textAlign: "left" as const,
    transition: "border-color 0.15s, box-shadow 0.15s",
  },
  triggerDisabled: { background: "#f8fafc", cursor: "not-allowed", color: "#94a3b8" },
  selectedRow: { display: "flex", alignItems: "baseline", gap: 8, minWidth: 0 },
  name: { fontSize: 13, fontWeight: 600, color: "#0f172a", whiteSpace: "nowrap" as const, overflow: "hidden", textOverflow: "ellipsis" },
  addr: { fontFamily: "monospace", fontSize: 11, color: "#94a3b8", flexShrink: 0 },
  placeholder: { fontSize: 13, color: "#94a3b8" },
  menu: {
    position: "absolute",
    top: "calc(100% + 6px)",
    left: 0,
    right: 0,
    background: "white",
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    boxShadow: "0 8px 28px rgba(15,23,42,0.12)",
    padding: 6,
    zIndex: 30,
    maxHeight: 240,
    overflowY: "auto" as const,
  },
  item: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    border: "none",
    borderRadius: 8,
    padding: "9px 10px",
    background: "transparent",
    cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif",
    textAlign: "left" as const,
    transition: "background 0.12s",
  },
  itemName: { fontSize: 13, fontWeight: 600, color: "#0f172a" },
  itemAddr: { fontFamily: "monospace", fontSize: 11, color: "#94a3b8", flexShrink: 0 },
};
