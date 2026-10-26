"use client";

import { Activity } from "lucide-react";
import { styles } from "@/lib/styles";
import type { HistoryPoint } from "@/types/dashboard";

interface LiveTelemetryChartProps {
  history: HistoryPoint[];
}

export function LiveTelemetryChart({ history }: LiveTelemetryChartProps) {
  if (history.length < 2) {
    return (
      <div
        style={{
          height: "220px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--text-muted)",
          fontSize: "11px",
          fontFamily: "var(--font-mono-custom)",
          gap: "10px",
        }}
      >
        <Activity size={24} strokeWidth={1.5} style={{ color: "var(--primary)", opacity: 0.7 }} />
        <span>Menunggu aliran data MQTT dari ESP32 untuk membangun grafik real-time...</span>
      </div>
    );
  }

  const width = 800;
  const height = 220;
  const padLeft = 45;
  const padRight = 45;
  const padTop = 20;
  const padBottom = 30;

  const chartWidth = width - padLeft - padRight;
  const chartHeight = height - padTop - padBottom;

  // Compute temp min/max with padding
  const temps = history.map((h) => h.temp);
  const minTemp = Math.floor(Math.min(...temps) - 2);
  const maxTemp = Math.ceil(Math.max(...temps) + 2);
  const tempRange = maxTemp - minTemp || 1;

  // Compute hum min/max with padding
  const hums = history.map((h) => h.hum);
  const minHum = Math.floor(Math.min(...hums) - 5);
  const maxHum = Math.ceil(Math.max(...hums) + 5);
  const humRange = maxHum - minHum || 1;

  // SVG coordinate helpers
  const getX = (index: number) => padLeft + (index / (history.length - 1)) * chartWidth;
  const getYTemp = (v: number) => padTop + chartHeight - ((v - minTemp) / tempRange) * chartHeight;
  const getYHum = (v: number) => padTop + chartHeight - ((v - minHum) / humRange) * chartHeight;

  const tempPoints = history.map((h, i) => `${getX(i)},${getYTemp(h.temp)}`).join(" ");
  const humPoints = history.map((h, i) => `${getX(i)},${getYHum(h.hum)}`).join(" ");

  const tempArea = `${getX(0)},${padTop + chartHeight} ${tempPoints} ${getX(history.length - 1)},${padTop + chartHeight}`;
  const humArea = `${getX(0)},${padTop + chartHeight} ${humPoints} ${getX(history.length - 1)},${padTop + chartHeight}`;

  return (
    <div className={styles.telemetryChartWrap}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className={styles.telemetryChartSvg}
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="chartTempGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FFAB00" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#FFAB00" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="chartHumGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#00E676" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#00E676" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Horizontal gridlines */}
        {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
          const y = padTop + chartHeight * pct;
          const tempVal = (maxTemp - pct * tempRange).toFixed(1);
          const humVal = Math.round(maxHum - pct * humRange);
          return (
            <g key={idx}>
              <line
                x1={padLeft}
                y1={y}
                x2={width - padRight}
                y2={y}
                stroke="rgba(255, 255, 255, 0.05)"
                strokeDasharray="4 4"
              />
              <text
                x={padLeft - 8}
                y={y + 3}
                fill="#FFAB00"
                fontSize="9"
                fontFamily="var(--font-mono-custom)"
                textAnchor="end"
              >
                {tempVal}°
              </text>
              <text
                x={width - padRight + 8}
                y={y + 3}
                fill="#00E676"
                fontSize="9"
                fontFamily="var(--font-mono-custom)"
                textAnchor="start"
              >
                {humVal}%
              </text>
            </g>
          );
        })}

        {/* Areas */}
        <polygon points={tempArea} fill="url(#chartTempGrad)" />
        <polygon points={humArea} fill="url(#chartHumGrad)" />

        {/* Lines */}
        <polyline
          points={tempPoints}
          fill="none"
          stroke="#FFAB00"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <polyline
          points={humPoints}
          fill="none"
          stroke="#00E676"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Data points for latest values */}
        {history.map((h, i) => {
          const isLatest = i === history.length - 1;
          return (
            <g key={i}>
              <circle
                cx={getX(i)}
                cy={getYTemp(h.temp)}
                r={isLatest ? 4 : 2}
                fill="#FFAB00"
                stroke="#0A0E14"
                strokeWidth={isLatest ? 2 : 1}
              />
              <circle
                cx={getX(i)}
                cy={getYHum(h.hum)}
                r={isLatest ? 4 : 2}
                fill="#00E676"
                stroke="#0A0E14"
                strokeWidth={isLatest ? 2 : 1}
              />
            </g>
          );
        })}

        {/* X-axis time marks */}
        {history
          .filter(
            (_, idx) =>
              idx % Math.ceil(history.length / 5) === 0 || idx === history.length - 1
          )
          .map((h, i) => {
            const actualIndex = history.indexOf(h);
            return (
              <text
                key={i}
                x={getX(actualIndex)}
                y={height - 8}
                fill="var(--text-muted)"
                fontSize="9"
                fontFamily="var(--font-mono-custom)"
                textAnchor="middle"
              >
                {h.time}
              </text>
            );
          })}
      </svg>
    </div>
  );
}
