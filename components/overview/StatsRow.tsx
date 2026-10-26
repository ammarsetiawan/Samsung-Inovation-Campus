"use client";

import { Cpu, Clock, Layers, Bot } from "lucide-react";
import { styles } from "@/lib/styles";
import type { ControlMode } from "@/types/dashboard";

interface StatsRowProps {
  mounted: boolean;
  sessionSeconds: number;
  packetsCount: number;
  controlMode: ControlMode;
  formatSessionTime: (sec: number) => string;
}

export function StatsRow({
  mounted,
  sessionSeconds,
  packetsCount,
  controlMode,
  formatSessionTime,
}: StatsRowProps) {
  return (
    <section className={`${styles.statsRow} ${mounted ? "animate-fade-in-up" : ""}`}>
      {/* Node Info */}
      <div className={styles.statCard}>
        <div className={styles.statHeader}>
          <span className={styles.statLabel}>TARGET NODE</span>
          <Cpu size={15} strokeWidth={2} style={{ color: "var(--primary)" }} />
        </div>
        <div className={styles.statValue}>
          <span className={styles.statNumber}>ESP32</span>
          <span className={styles.statTotal}>/ WROOM</span>
        </div>
        <div className={styles.statBar}>
          <div
            className={styles.statBarFill}
            style={{ width: "100%", background: "var(--status-online)" }}
          />
        </div>
        <div className={styles.statMeta} style={{ marginTop: "6px" }}>
          Node: Smart Office Cluster
        </div>
      </div>

      {/* Session Uptime */}
      <div className={`${styles.statCard} ${mounted ? "delay-1" : ""}`}>
        <div className={styles.statHeader}>
          <span className={styles.statLabel}>SESSION UPTIME</span>
          <Clock size={15} strokeWidth={2} style={{ color: "var(--primary)" }} />
        </div>
        <div className={styles.statValue}>
          <span className={styles.statNumber}>{formatSessionTime(sessionSeconds)}</span>
        </div>
        <div className={styles.statBar}>
          <div
            className={styles.statBarFill}
            style={{ width: "100%", background: "var(--primary)" }}
          />
        </div>
        <div className={styles.statMeta} style={{ marginTop: "6px" }}>
          Active Ingestion Timer
        </div>
      </div>

      {/* Ingested Packets */}
      <div className={`${styles.statCard} ${mounted ? "delay-2" : ""}`}>
        <div className={styles.statHeader}>
          <span className={styles.statLabel}>INGESTED PACKETS</span>
          <Layers size={15} strokeWidth={2} style={{ color: "var(--accent)" }} />
        </div>
        <div className={styles.statValue}>
          <span className={styles.statNumber}>{packetsCount.toLocaleString()}</span>
          <span className={styles.statTotal}>pkts</span>
        </div>
        <div className={styles.statBar}>
          <div
            className={styles.statBarFill}
            style={{
              width: `${Math.min(packetsCount * 5, 100)}%`,
              background: "var(--accent)",
            }}
          />
        </div>
        <div className={styles.statMeta} style={{ marginTop: "6px" }}>
          {packetsCount > 0 ? "Streaming Hardware Frames" : "Waiting for First Packet"}
        </div>
      </div>

      {/* Automation Engine */}
      <div className={`${styles.statCard} ${mounted ? "delay-3" : ""}`}>
        <div className={styles.statHeader}>
          <span className={styles.statLabel}>AUTOMATION ENGINE</span>
          <Bot
            size={15}
            strokeWidth={2}
            style={{
              color: controlMode === "auto" ? "var(--status-online)" : "var(--primary)",
            }}
          />
        </div>
        <div className={styles.statValue}>
          <span
            className={styles.statNumber}
            style={{
              color: controlMode === "auto" ? "var(--status-online)" : "var(--primary)",
            }}
          >
            {controlMode === "auto" ? "AUTO-PILOT" : "MANUAL"}
          </span>
        </div>
        <div className={styles.statBar}>
          <div
            className={styles.statBarFill}
            style={{
              width: "100%",
              background: controlMode === "auto" ? "var(--status-online)" : "var(--primary)",
            }}
          />
        </div>
        <div className={styles.statMeta} style={{ marginTop: "6px" }}>
          {controlMode === "auto"
            ? "PIR Sensor Active Sync"
            : "Manual Override Engaged"}
        </div>
      </div>
    </section>
  );
}
