import React, { useEffect, useRef, useState } from "react";
import { colors, fontFamily, fontSize, fontWeight, radius, shadow } from "../../styles";

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  accent?: string;
  disabled?: boolean;
}

export default function Select({
  options,
  value,
  onChange,
  placeholder = "Seleccioná…",
  accent = colors.primary,
  disabled = false,
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const selected = options.find((o) => o.value === value);

  return (
    <div ref={ref} style={s.wrap}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        style={{
          ...s.trigger,
          ...(open ? { borderColor: accent, boxShadow: `0 0 0 3px ${accent}1a` } : {}),
          ...(disabled ? s.triggerDisabled : {}),
        }}
      >
        <span style={selected ? s.value : s.placeholder}>{selected ? selected.label : placeholder}</span>
        <svg
          width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={colors.textFaint} strokeWidth="2"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.15s", flexShrink: 0 }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div style={s.menu}>
          {options.map((o) => {
            const isSel = o.value === value;
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
                style={{ ...s.item, ...(isSel ? { background: `${accent}12`, color: accent, fontWeight: fontWeight.semibold } : {}) }}
                onMouseEnter={(e) => (e.currentTarget.style.background = `${accent}0f`)}
                onMouseLeave={(e) => (e.currentTarget.style.background = isSel ? `${accent}12` : "transparent")}
              >
                {o.label}
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
  value: { fontSize: fontSize.base, fontWeight: fontWeight.medium, color: colors.text },
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
    maxHeight: 280,
    overflowY: "auto" as const,
  },
  item: {
    width: "100%",
    textAlign: "left" as const,
    border: "none",
    borderRadius: radius.sm,
    padding: "9px 10px",
    background: "transparent",
    cursor: "pointer",
    fontFamily: fontFamily.sans,
    fontSize: fontSize.base,
    color: colors.text,
    transition: "background 0.12s",
  },
};
