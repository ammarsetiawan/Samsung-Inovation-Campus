"use client";

import { Radio, Activity, RotateCcw } from "lucide-react";
import { styles } from "@/lib/styles";
import type { MqttStatus } from "@/types/dashboard";

interface TopBarProps {
  currentTime: string;
  latency: number;
  mqttStatus: MqttStatus;
  activeTopic: string;
  onReplayIntro?: () => void;
  /** True jika sudah ada minimal 1 paket telemetri diterima dari ESP32 */
  hasReceivedData?: boolean;
}

export function TopBar({
  currentTime,
  latency,
  mqttStatus,
  hasReceivedData = false,
  activeTopic,
  onReplayIntro,
}: TopBarProps) {
  return (
    <header className={styles.topBar}>
      <div className={styles.topBarLeft}>
        <div className={styles.logo}>
          <div className={styles.logoIcon}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 2L2 7L12 12L22 7L12 2Z"
                stroke="#FFAB00"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
              <path
                d="M2 17L12 22L22 17"
                stroke="#FFAB00"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
              <path
                d="M2 12L12 17L22 12"
                stroke="#FF6D00"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div className={styles.logoText}>
            <span className={styles.logoTitle}>SMART ROOM</span>
            <span className={styles.logoSub}>SMART ROOM MONITORING</span>
          </div>
        </div>
        <div className={styles.separator} />
        <span className={styles.headerTag}>ESP32 LIVE STREAM</span>
        <span className={styles.headerTag}>CONSUMER MODE</span>
      </div>

      <div className={styles.topBarCenter}>
        <span className={styles.clusterBadge}>
          TOPIC // <span className={styles.xpBadge}>{activeTopic}</span>
        </span>
      </div>

      <div className={styles.topBarRight}>
        <div
          className={`${styles.statusPill} ${
            mqttStatus === "connected"
              ? styles.mqttStatusConnected
              : mqttStatus === "connecting"
                ? styles.mqttStatusConnecting
                : styles.mqttStatusOffline
          }`}
        >
          <span
            className={styles.statusDot}
            style={{
              background:
                mqttStatus === "connected"
                  ? "var(--status-online)"
                  : mqttStatus === "connecting"
                    ? "var(--status-warning)"
                    : "var(--status-critical)",
            }}
          />
          <Radio size={11} strokeWidth={2.2} style={{ marginRight: 2 }} />
          MQTT /{` `}
          {mqttStatus === "connected"
            ? hasReceivedData ? "LIVE" : "STANDBY"
            : mqttStatus.toUpperCase()}
        </div>

        <div className={styles.statusPill}>
          <span className={styles.statusDot} style={{ background: "var(--status-online)" }} />
          <Activity size={11} strokeWidth={2.2} style={{ marginRight: 2 }} />
          LATENCY / {latency}MS
        </div>

        <div className={styles.timeBadge}>{currentTime}</div>

        {onReplayIntro && (
          <button
            onClick={onReplayIntro}
            title="Ulangi animasi transisi boot sequence"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#0F1A24] border border-[#FFAB00]/30 hover:border-[#FFAB00] text-[#FFAB00] text-[10px] font-mono tracking-wider transition-all hover:bg-[#FFAB00]/10 hover:shadow-[0_0_10px_rgba(255,171,0,0.2)] active:scale-95 cursor-pointer"
          >
            <RotateCcw size={11} />
            <span className="hidden sm:inline">TRANSISI</span>
          </button>
        )}
      </div>
    </header>
  );
}
