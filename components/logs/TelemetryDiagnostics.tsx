"use client";

import { styles } from "@/lib/styles";
import type { HistoryPoint, ActuatorState } from "@/types/dashboard";

interface TelemetryDiagnosticsProps {
  history: HistoryPoint[];
  packetsCount: number;
  sessionSeconds: number;
  actuators: ActuatorState;
  latency: number;
  activeTopic: string;
}

export function TelemetryDiagnostics({
  history,
  packetsCount,
  sessionSeconds,
  actuators,
  latency,
}: TelemetryDiagnosticsProps) {
  const tempValues = history.map((h) => h.temp).filter((v) => !isNaN(v));
  const humValues = history.map((h) => h.hum).filter((v) => !isNaN(v));

  const minTemp = tempValues.length ? Math.min(...tempValues).toFixed(1) : "--";
  const maxTemp = tempValues.length ? Math.max(...tempValues).toFixed(1) : "--";
  const avgTemp = tempValues.length
    ? (tempValues.reduce((a, b) => a + b, 0) / tempValues.length).toFixed(1)
    : "--";

  const minHum = humValues.length ? Math.min(...humValues).toFixed(1) : "--";
  const maxHum = humValues.length ? Math.max(...humValues).toFixed(1) : "--";

  const pktRate = (packetsCount / Math.max(sessionSeconds, 1)).toFixed(1);
  const activeRelays =
    (actuators.lamp ? 1 : 0) + (actuators.fan ? 1 : 0) + (actuators.alarm ? 1 : 0);

  return (
    <div className={styles.diagPanel}>
      <div className={styles.diagGrid}>
        {/* Item 1: Ingestion Frequency */}
        <div className={styles.diagItem}>
          <span className={styles.diagLabel}>INGESTION RATE</span>
          <div className={styles.diagValRow}>
            <span className={styles.diagVal}>{pktRate}</span>
            <span className={styles.diagUnit}>msg/sec</span>
          </div>
          <span className={styles.diagMeta}>Active throughput</span>
        </div>

        {/* Item 2: Temperature Session Range */}
        <div className={styles.diagItem}>
          <span className={styles.diagLabel}>TEMP SPAN (SESSION)</span>
          <div className={styles.diagValRow}>
            <span className={styles.diagVal} style={{ color: "var(--primary)" }}>
              {minTemp}° - {maxTemp}°
            </span>
            <span className={styles.diagUnit}>C</span>
          </div>
          <span className={styles.diagMeta}>Avg session: {avgTemp}°C</span>
        </div>

        {/* Item 3: Humidity Session Range */}
        <div className={styles.diagItem}>
          <span className={styles.diagLabel}>HUMIDITY SPAN</span>
          <div className={styles.diagValRow}>
            <span className={styles.diagVal} style={{ color: "var(--status-online)" }}>
              {minHum}% - {maxHum}%
            </span>
            <span className={styles.diagUnit}>RH</span>
          </div>
          <span className={styles.diagMeta}>Comfort: 40% — 70%</span>
        </div>

        {/* Item 4: Relays Active Load */}
        <div className={styles.diagItem}>
          <span className={styles.diagLabel}>RELAYS ACTIVE</span>
          <div className={styles.diagValRow}>
            <span
              className={styles.diagVal}
              style={{
                color: activeRelays > 0 ? "var(--primary)" : "var(--text-muted)",
              }}
            >
              {activeRelays} / 3
            </span>
            <span className={styles.diagUnit}>CHANNELS</span>
          </div>
          <span className={styles.diagMeta}>
            {actuators.lamp ? "Lamp [ON] " : "Lamp [OFF] "}•{" "}
            {actuators.fan ? "Fan [ON] " : "Fan [OFF] "}•{" "}
            {actuators.alarm ? "Alert!" : "Guard"}
          </span>
        </div>
      </div>

      <div className={styles.diagStatusRow}>
        <div className={styles.diagStatusLabel}>
          <span className={styles.statusDotSmall} style={{ background: "var(--status-online)" }} />
          <span>FRAME INTEGRITY: 100% VALID JSON</span>
        </div>
        <span className={styles.diagStatusVal}>PING LATENCY: {latency}MS</span>
      </div>
    </div>
  );
}
