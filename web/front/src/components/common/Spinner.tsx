import React from "react";
import { colors } from "../../styles";

interface SpinnerProps {
  size?: number;
  color?: string;
  thickness?: number;
  style?: React.CSSProperties;
}

/**
 * Círculo de carga animado, reutilizable. Usa el @keyframes spin global (index.css).
 */
export default function Spinner({ size = 18, color = colors.primary, thickness = 2, style }: SpinnerProps) {
  return (
    <span
      style={{
        display: "inline-block",
        width: size,
        height: size,
        border: `${thickness}px solid ${color}33`,
        borderTopColor: color,
        borderRadius: "50%",
        animation: "spin 0.7s linear infinite",
        flexShrink: 0,
        ...style,
      }}
    />
  );
}
