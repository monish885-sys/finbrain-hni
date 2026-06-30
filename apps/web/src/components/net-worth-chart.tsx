"use client";

import type { NetWorthPoint } from "@capstone/types";

interface NetWorthChartProps {
  data: NetWorthPoint[];
  className?: string;
}

export function NetWorthChart({ data, className }: NetWorthChartProps) {
  if (data.length < 2) return null;

  const values = data.map((d) => d.value_inr);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const width = 400;
  const height = 80;
  const padding = 4;

  const points = data.map((d, i) => {
    const x = padding + (i / (data.length - 1)) * (width - padding * 2);
    const y = height - padding - ((d.value_inr - min) / range) * (height - padding * 2);
    return `${x},${y}`;
  });

  const areaPoints = [
    `${padding},${height - padding}`,
    ...points,
    `${width - padding},${height - padding}`,
  ].join(" ");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className={className} preserveAspectRatio="none">
      <defs>
        <linearGradient id="nwGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4f7cff" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="nwLine" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#4f7cff" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill="url(#nwGradient)" />
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke="url(#nwLine)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
