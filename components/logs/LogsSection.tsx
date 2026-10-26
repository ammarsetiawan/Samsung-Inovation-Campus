"use client";

import { Terminal, Cpu } from "lucide-react";
import { styles } from "@/lib/styles";
import { TelemetryDiagnostics } from "@/components/logs/TelemetryDiagnostics";
import type { LogEntry, HistoryPoint, ActuatorState } from "@/types/dashboard";

interface LogsSectionProps {
  logs: LogEntry[];
  history: HistoryPoint[];
  packetsCount: number;
  sessionSeconds: number;
  actuators: ActuatorState;
  latency: number;
  activeTopic: string;
  mounted: boolean;
  logLevelColor: (level: string) => string;
}

export function LogsSection({
  logs,
  history,
  packetsCount,
  sessionSeconds,
  actuators,
  latency,
  activeTopic,
  mounted,
  logLevelColor,
}: LogsSectionProps) {
  return (
    <div className={styles.bottomRow}>
      {/* System Log */}
      <div
        className={`${styles.panel} ${styles.logPanel} ${
          mounted ? "animate-fade-in-up delay-5" : ""
        }`}
      >
        <div className={styles.panelHeader}>
          <h3 className={styles.panelTitle}>
            <Terminal size={14} strokeWidth={2} style={{ color: "var(--primary)" }} />
            SYSTEM & TELEMETRY LOG
          </h3>
          <span className={styles.panelBadge}>REAL-TIME INGESTION</span>
        </div>
        <div className={styles.logList}>
          {logs.map((log, i) => (
            <div key={i} className={styles.logEntry}>
              <span className={styles.logTime}>{log.time}</span>
              <span className={styles.logLevel} style={{ color: logLevelColor(log.level) }}>
                [{log.level.toUpperCase()}]
              </span>
              <span className={styles.logNode}>{log.node}</span>
              <span className={styles.logMessage}>{log.message}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Network Diagnostics Panel */}
      <div className={`${styles.panel} ${mounted ? "animate-fade-in-up delay-5" : ""}`}>
        <div className={styles.panelHeader}>
          <h3 className={styles.panelTitle}>
            <Cpu size={14} strokeWidth={2} style={{ color: "var(--primary)" }} />
            SESSION TELEMETRY DIAGNOSTICS
          </h3>
          <span className={styles.panelBadge}>{packetsCount} PACKETS ANALYZED</span>
        </div>
        <TelemetryDiagnostics
          history={history}
          packetsCount={packetsCount}
          sessionSeconds={sessionSeconds}
          actuators={actuators}
          latency={latency}
          activeTopic={activeTopic}
        />
      </div>
    </div>
  );
}
