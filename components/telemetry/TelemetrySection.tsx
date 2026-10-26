"use client";

import { LineChart, FileCode2 } from "lucide-react";
import { styles } from "@/lib/styles";
import { LiveTelemetryChart } from "@/components/telemetry/LiveTelemetryChart";
import type { HistoryPoint, SensorData, ActuatorState, DecodedPayload } from "@/types/dashboard";

interface TelemetrySectionProps {
  history: HistoryPoint[];
  sensors: SensorData[];
  actuators: ActuatorState;
  lastDecoded: DecodedPayload;
  lastPayloadRaw: string;
  activeTopic: string;
  mounted: boolean;
}

export function TelemetrySection({
  history,
  sensors,
  actuators,
  lastDecoded,
  lastPayloadRaw,
  activeTopic,
  mounted,
}: TelemetrySectionProps) {
  const tempSensor = sensors.find((s) => s.id === "temp-01");
  const humSensor = sensors.find((s) => s.id === "hum-01");
  const presenceSensor = sensors.find((s) => s.id === "presence-01");
  const lightSensor = sensors.find((s) => s.id === "light-01");

  const currentTemp = tempSensor ? tempSensor.value : 28.5;
  const currentHum = humSensor ? humSensor.value : 65.0;
  const currentPresence = presenceSensor ? presenceSensor.value : 0;
  const currentLight = lightSensor ? lightSensor.value : 1295;

  const getLightDescription = (adc: number) => {
    if (adc < 600) return "DARK / NIGHT";
    if (adc < 1500) return "INDOOR / AMBIENT";
    if (adc < 3000) return "WELL-LIT";
    return "BRIGHT / DIRECT";
  };

  return (
    <div className={styles.middleRow}>
      {/* Left: Live Multi-Metric Timeline Chart */}
      <div
        className={`${styles.panel} ${styles.telemetryChartPanel} ${
          mounted ? "animate-fade-in-up delay-3" : ""
        }`}
      >
        <div className={styles.telemetryChartHeader}>
          <h3 className={styles.panelTitle}>
            <LineChart size={14} strokeWidth={2} style={{ color: "var(--primary)" }} />
            REAL-TIME TELEMETRY TIMELINE
          </h3>
          <div className={styles.telemetryLegend}>
            <div className={styles.telemetryLegendItem}>
              <span className={styles.telemetryLegendDot} style={{ background: "#FFAB00" }} />
              <span style={{ color: "#FFAB00" }}>Temperature ({currentTemp.toFixed(1)}°C)</span>
            </div>
            <div className={styles.telemetryLegendItem}>
              <span className={styles.telemetryLegendDot} style={{ background: "#00E676" }} />
              <span style={{ color: "#00E676" }}>Humidity ({currentHum.toFixed(1)}%)</span>
            </div>
          </div>
        </div>

        <LiveTelemetryChart history={history} />

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            paddingTop: "var(--space-xs)",
            borderTop: "1px solid rgba(255, 255, 255, 0.04)",
            fontSize: "10px",
            color: "var(--text-muted)",
            fontFamily: "var(--font-mono-custom)",
          }}
        >
          <span>BUFFER: {history.length} TITIK PENGAMBILAN DATA WAKTU NYATA</span>
          <span>SUMBER: {activeTopic}</span>
        </div>
      </div>

      {/* Right: Telemetry Packet Inspector */}
      <div className={`${styles.panel} ${mounted ? "animate-fade-in-up delay-4" : ""}`}>
        <div className={styles.panelHeader}>
          <h3 className={styles.panelTitle}>
            <FileCode2 size={14} strokeWidth={2} style={{ color: "var(--primary)" }} />
            LATEST PACKET INSPECTOR
          </h3>
          <span className={styles.panelBadge}>
            {lastDecoded.bytes ? `${lastDecoded.bytes} BYTES` : "STREAM ACTIVE"}
          </span>
        </div>

        <div className={styles.inspectorTableWrap}>
          <table className={styles.inspectorTable}>
            <thead>
              <tr>
                <th>FIELD</th>
                <th>VALUE</th>
                <th>INTERPRETATION</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className={styles.inspectorKey}>temperature_c</td>
                <td className={styles.inspectorVal}>{currentTemp.toFixed(1)} °C</td>
                <td style={{ color: "var(--text-secondary)" }}>
                  {currentTemp > 35 ? "Warning (High Heat)" : "Ambient Room Temp"}
                </td>
              </tr>
              <tr>
                <td className={styles.inspectorKey}>humidity_pct</td>
                <td className={styles.inspectorValOnline}>{currentHum.toFixed(1)} %</td>
                <td style={{ color: "var(--text-secondary)" }}>Relative Humidity</td>
              </tr>
              <tr>
                <td className={styles.inspectorKey}>presence</td>
                <td className={styles.inspectorVal}>{currentPresence}</td>
                <td style={{ color: currentPresence ? "var(--primary)" : "var(--text-muted)" }}>
                  {currentPresence ? "Occupancy Detected" : "Room Vacant"}
                </td>
              </tr>
              <tr>
                <td className={styles.inspectorKey}>light_adc</td>
                <td className={styles.inspectorVal}>{currentLight} ADC</td>
                <td style={{ color: "var(--text-secondary)" }}>{getLightDescription(currentLight)}</td>
              </tr>
              <tr>
                <td className={styles.inspectorKey}>lamp</td>
                <td className={actuators.lamp ? styles.inspectorVal : ""}>
                  {String(actuators.lamp).toUpperCase()}
                </td>
                <td style={{ color: "var(--text-muted)" }}>Relay Channel 1</td>
              </tr>
              <tr>
                <td className={styles.inspectorKey}>fan</td>
                <td className={actuators.fan ? styles.inspectorValOnline : ""}>
                  {String(actuators.fan).toUpperCase()}
                </td>
                <td style={{ color: "var(--text-muted)" }}>Relay Channel 2</td>
              </tr>
              <tr>
                <td className={styles.inspectorKey}>alarm</td>
                <td className={actuators.alarm ? styles.inspectorValAlarm : ""}>
                  {String(actuators.alarm).toUpperCase()}
                </td>
                <td style={{ color: "var(--text-muted)" }}>Security Buzzer Relay</td>
              </tr>
            </tbody>
          </table>
        </div>

        {lastPayloadRaw && (
          <div
            style={{
              marginTop: "var(--space-sm)",
              padding: "8px 12px",
              borderRadius: "var(--radius-sm)",
              background: "rgba(10, 14, 20, 0.7)",
              border: "1px solid var(--border)",
              fontSize: "10px",
              fontFamily: "var(--font-mono-custom)",
              color: "var(--text-secondary)",
              wordBreak: "break-all",
            }}
          >
            <span style={{ color: "var(--text-muted)", marginRight: "6px" }}>RAW JSON:</span>
            <span style={{ color: "var(--status-online)" }}>{lastPayloadRaw}</span>
          </div>
        )}
      </div>
    </div>
  );
}
