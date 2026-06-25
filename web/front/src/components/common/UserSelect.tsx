import React, { useEffect, useRef, useState } from "react";
import { ethers } from "ethers";
import { AppUser } from "../../lib/api";
import { colors, fontFamily, fontSize, fontWeight, radius, shadow } from "../../styles";

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
  accent = colors.primary,
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
          width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={colors.textFaint} strokeWidth="2"
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
    border: `1.5px solid ${colors.border}`,
    borderRadius: radius.md,
    padding: "10px 12px",
    background: colors.surface,
    cursor: "pointer",
    fontFamily: fontFamily.sans,
    textAlign: "left" as const,
    transition: "border-color 0.15s, box-shadow 0.15s",
  },
  triggerDisabled: { background: colors.bgApp, cursor: "not-allowed", color: colors.textFaint },
  selectedRow: { display: "flex", alignItems: "baseline", gap: 8, minWidth: 0 },
  name: { fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: colors.text, whiteSpace: "nowrap" as const, overflow: "hidden", textOverflow: "ellipsis" },
  addr: { fontFamily: fontFamily.mono, fontSize: fontSize.xs, color: colors.textFaint, flexShrink: 0 },
  placeholder: { fontSize: fontSize.base, color: colors.textFaint },
  menu: {
    position: "absolute",
    top: "calc(100% + 6px)",
    left: 0,
    right: 0,
    background: colors.surface,
    border: `1px solid ${colors.border}`,
    borderRadius: radius.lg,
    boxShadow: shadow.md,
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
    borderRadius: radius.sm,
    padding: "9px 10px",
    background: "transparent",
    cursor: "pointer",
    fontFamily: fontFamily.sans,
    textAlign: "left" as const,
    transition: "background 0.12s",
  },
  itemName: { fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: colors.text },
  itemAddr: { fontFamily: fontFamily.mono, fontSize: fontSize.xs, color: colors.textFaint, flexShrink: 0 },
};
