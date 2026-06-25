import React from "react";
import { palette, fontFamily } from "../styles";

// Logo MediChain (cubo + wordmark) reutilizable, con estilos inline tomados del
// design system para que funcione en cualquier lado sin depender de Landing.css.
interface BrandLogoProps {
  /** Alto del cubo en px; el resto escala proporcional. Default 28 (navbar). */
  markHeight?: number;
  /** Tamaño del wordmark en px. Default 16. */
  fontSize?: number;
}

export default function BrandLogo({ markHeight = 28, fontSize = 16 }: BrandLogoProps) {
  const w = markHeight * 0.9;
  const border = Math.max(2, markHeight * 0.09);
  const tab = markHeight * 0.46;

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 11, fontFamily: fontFamily.sans }}>
      <span
        style={{
          position: "relative", width: w, height: markHeight,
          display: "grid", placeItems: "center", color: palette.turquoise,
          border: `${border}px solid currentColor`, borderRadius: "7px 7px 10px 10px",
          transform: "rotate(30deg)", flexShrink: 0, marginRight: 3,
        }}
      >
        <span
          style={{
            position: "absolute", width: tab, height: tab,
            borderTop: `${border}px solid currentColor`, borderLeft: `${border}px solid currentColor`,
            top: -border * 1.8, left: -border * 1.2,
          }}
        />
        <span style={{ fontSize: markHeight * 0.4, fontWeight: 800, transform: "rotate(-30deg)" }}>M</span>
      </span>
      <span style={{ fontSize, fontWeight: 700, color: palette.navy, letterSpacing: "-0.4px" }}>
        Medi<span style={{ color: palette.turquoise }}>Chain</span>
      </span>
    </span>
  );
}
