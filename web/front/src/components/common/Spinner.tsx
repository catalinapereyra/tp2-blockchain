import React from "react";

interface SpinnerProps {
  size?: number;
  color?: string;
  thickness?: number;
  style?: React.CSSProperties;
}

/**
 * Círculo de carga animado, reutilizable. Usa el @keyframes spin global (index.css).
 */
export default function Spinner({ size = 18, color = "#6366f1", thickness = 2, style }: SpinnerProps) {
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
