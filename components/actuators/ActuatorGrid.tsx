"use client";

import { Sliders, Bot, RotateCcw, Lightbulb, Fan, BellRing } from "lucide-react";
import { styles } from "@/lib/styles";
import type { ActuatorState, ControlMode, MqttStatus } from "@/types/dashboard";

interface ActuatorGridProps {
  actuators: ActuatorState;
  controlMode: ControlMode;
  publishFeedback: string | null;
  mqttStatus: MqttStatus;
  publishControl: (actuator: "lamp" | "fan", state: boolean) => void;
  resumeAutoMode: () => void;
  mounted: boolean;
}

export function ActuatorGrid({
  actuators,
  controlMode,
  publishFeedback,
  mqttStatus,
  publishControl,
  resumeAutoMode,
  mounted,
}: ActuatorGridProps) {
  return (
    <>
      {/* ─── SMART OFFICE ACTUATORS / RELAYS TELEMETRY ─── */}
      <section className={styles.sectionHeader}>
        <div className={styles.sectionLine} />
        <h2 className={styles.sectionTitle}>
          <Sliders size={13} strokeWidth={2.5} style={{ color: "var(--primary)" }} />
          HARDWARE ACTUATORS & RELAYS
          <span className={styles.sectionBadge}>CONTROL PANEL</span>
        </h2>
        <div className={styles.sectionLine} />
      </section>

      {/* Publish feedback toast */}
      {publishFeedback && <div className={styles.publishToast}>{publishFeedback}</div>}

      {/* Actuator Mode Bar: Status AUTO vs MANUAL dan Tombol RESUME AUTO MODE */}
      <div className={`${styles.actuatorModeBar} ${mounted ? "animate-fade-in-up" : ""}`}>
        <div className={styles.actuatorModeLeft}>
          <span
            className={styles.actuatorModeBadge}
            style={{
              background:
                controlMode === "auto"
                  ? "rgba(0, 230, 118, 0.12)"
                  : "rgba(255, 171, 0, 0.12)",
              color: controlMode === "auto" ? "var(--status-online)" : "var(--primary)",
              border: `1px solid ${
                controlMode === "auto"
                  ? "rgba(0, 230, 118, 0.4)"
                  : "rgba(255, 171, 0, 0.4)"
              }`,
            }}
          >
            {controlMode === "auto" ? (
              <>
                <Bot size={13} strokeWidth={2.2} /> PIR AUTO-PILOT ON
              </>
            ) : (
              <>
                <Sliders size={13} strokeWidth={2.2} /> MANUAL OVERRIDE ENGAGED
              </>
            )}
          </span>
          <span className={styles.actuatorModeDesc}>
            {controlMode === "auto"
              ? "ESP32 mengontrol relay lampu & kipas otomatis saat sensor PIR mendeteksi orang."
              : "Logika otomatis PIR dijeda karena relay diklik manual. Klik tombol untuk mengembalikan ke AUTO."}
          </span>
        </div>

        {controlMode === "manual" && (
          <button
            id="btn-resume-auto"
            type="button"
            className={styles.resumeAutoBtn}
            onClick={resumeAutoMode}
            disabled={mqttStatus !== "connected"}
            title="Kirim 'mode_auto' ke ESP32 agar sensor gerak PIR kembali menyalakan lampu & kipas otomatis saat ada orang"
          >
            <RotateCcw size={13} strokeWidth={2.5} />
            KEMBALIKAN KE MODE AUTO (PIR ON)
          </button>
        )}
      </div>

      <section className={`${styles.actuatorGrid} ${mounted ? "animate-fade-in-up" : ""}`}>
        {/* Actuator 1: Lamp — INTERACTIVE CONTROL */}
        <div
          className={`${styles.actuatorCard} ${
            actuators.lamp ? styles.actuatorCardActive : ""
          }`}
        >
          <div className={styles.actuatorTop}>
            <div
              className={styles.actuatorIconWrap}
              style={{
                background: actuators.lamp
                  ? "rgba(255, 171, 0, 0.15)"
                  : "rgba(255, 255, 255, 0.03)",
                borderColor: actuators.lamp
                  ? "rgba(255, 171, 0, 0.5)"
                  : "rgba(255, 255, 255, 0.08)",
              }}
            >
              <Lightbulb
                size={22}
                strokeWidth={1.8}
                style={{ color: actuators.lamp ? "var(--primary)" : "var(--text-muted)" }}
              />
            </div>
            <span
              className={styles.actuatorBadge}
              style={{
                background: actuators.lamp
                  ? "rgba(255, 171, 0, 0.15)"
                  : "rgba(255, 255, 255, 0.04)",
                color: actuators.lamp ? "var(--primary)" : "var(--text-muted)",
                border: `1px solid ${
                  actuators.lamp ? "rgba(255, 171, 0, 0.4)" : "var(--border)"
                }`,
              }}
            >
              {actuators.lamp ? "CH-01: ENERGIZED" : "CH-01: STANDBY"}
            </span>
          </div>
          <div className={styles.actuatorName}>ROOM LIGHTING RELAY</div>
          <div className={styles.actuatorDesc}>
            {actuators.lamp
              ? "Lampu ruangan dalam kondisi AKTIF (Relay Tertutup / ON)."
              : "Lampu ruangan dalam kondisi PADAM (Relay Terbuka / STANDBY)."}
          </div>
          <div className={styles.actuatorFooter}>
            <span>PAYLOAD: &quot;lamp&quot;: {String(actuators.lamp)}</span>
            <span style={{ color: actuators.lamp ? "var(--primary)" : "var(--text-muted)" }}>
              {actuators.lamp ? "● ILLUMINATED" : "○ DARK"}
            </span>
          </div>

          {/* Tactile Hardware Switch Toggle Button */}
          <button
            id="ctrl-lamp-toggle"
            type="button"
            className={styles.actuatorCtrlBtn}
            style={{
              background: actuators.lamp
                ? "rgba(255, 171, 0, 0.1)"
                : "rgba(255, 255, 255, 0.03)",
              borderColor: actuators.lamp ? "rgba(255, 171, 0, 0.6)" : "var(--border)",
              color: actuators.lamp ? "var(--primary)" : "var(--text-secondary)",
            }}
            disabled={mqttStatus !== "connected"}
            onClick={() => publishControl("lamp", !actuators.lamp)}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Lightbulb size={13} strokeWidth={2} />
              <span>RELAY 1 SWITCH</span>
            </div>
            <span
              className={styles.actuatorSwitchPill}
              style={{
                background: actuators.lamp ? "var(--primary)" : "rgba(255, 255, 255, 0.08)",
                color: actuators.lamp ? "#0A0E14" : "var(--text-muted)",
              }}
            >
              {actuators.lamp ? "ON" : "OFF"}
            </span>
          </button>
        </div>

        {/* Actuator 2: Fan — INTERACTIVE CONTROL */}
        <div
          className={`${styles.actuatorCard} ${
            actuators.fan ? styles.actuatorCardFanActive : ""
          }`}
        >
          <div className={styles.actuatorTop}>
            <div
              className={styles.actuatorIconWrap}
              style={{
                background: actuators.fan
                  ? "rgba(0, 230, 118, 0.15)"
                  : "rgba(255, 255, 255, 0.03)",
                borderColor: actuators.fan
                  ? "rgba(0, 230, 118, 0.5)"
                  : "rgba(255, 255, 255, 0.08)",
              }}
            >
              <Fan
                size={22}
                strokeWidth={1.8}
                className={actuators.fan ? "turbine-spin" : ""}
                style={{ color: actuators.fan ? "var(--status-online)" : "var(--text-muted)" }}
              />
            </div>
            <span
              className={styles.actuatorBadge}
              style={{
                background: actuators.fan
                  ? "rgba(0, 230, 118, 0.15)"
                  : "rgba(255, 255, 255, 0.04)",
                color: actuators.fan ? "var(--status-online)" : "var(--text-muted)",
                border: `1px solid ${
                  actuators.fan ? "rgba(0, 230, 118, 0.4)" : "var(--border)"
                }`,
              }}
            >
              {actuators.fan ? "CH-02: RUNNING" : "CH-02: IDLE"}
            </span>
          </div>
          <div className={styles.actuatorName}>EXHAUST & COOLING FAN</div>
          <div className={styles.actuatorDesc}>
            {actuators.fan
              ? "Kipas ventilasi udara aktif berputar (Sirkulasi & Pendinginan Ruangan)."
              : "Kipas ventilasi udara berhenti / standby idle."}
          </div>
          <div className={styles.actuatorFooter}>
            <span>PAYLOAD: &quot;fan&quot;: {String(actuators.fan)}</span>
            <span style={{ color: actuators.fan ? "var(--status-online)" : "var(--text-muted)" }}>
              {actuators.fan ? "● RUNNING" : "○ STOPPED"}
            </span>
          </div>

          {/* Tactile Hardware Switch Toggle Button */}
          <button
            id="ctrl-fan-toggle"
            type="button"
            className={styles.actuatorCtrlBtn}
            style={{
              background: actuators.fan
                ? "rgba(0, 230, 118, 0.1)"
                : "rgba(255, 255, 255, 0.03)",
              borderColor: actuators.fan ? "rgba(0, 230, 118, 0.6)" : "var(--border)",
              color: actuators.fan ? "var(--status-online)" : "var(--text-secondary)",
            }}
            disabled={mqttStatus !== "connected"}
            onClick={() => publishControl("fan", !actuators.fan)}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Fan size={13} strokeWidth={2} className={actuators.fan ? "turbine-spin" : ""} />
              <span>RELAY 2 SWITCH</span>
            </div>
            <span
              className={styles.actuatorSwitchPill}
              style={{
                background: actuators.fan
                  ? "var(--status-online)"
                  : "rgba(255, 255, 255, 0.08)",
                color: actuators.fan ? "#0A0E14" : "var(--text-muted)",
              }}
            >
              {actuators.fan ? "ON" : "OFF"}
            </span>
          </button>
        </div>

        {/* Actuator 3: Alarm */}
        <div
          className={`${styles.actuatorCard} ${
            actuators.alarm ? `${styles.actuatorCardAlarmActive} alarm-pulse` : ""
          }`}
        >
          <div className={styles.actuatorTop}>
            <div
              className={styles.actuatorIconWrap}
              style={{
                background: actuators.alarm
                  ? "rgba(255, 82, 82, 0.25)"
                  : "rgba(255, 255, 255, 0.03)",
                borderColor: actuators.alarm
                  ? "var(--status-critical)"
                  : "rgba(255, 255, 255, 0.08)",
              }}
            >
              <BellRing
                size={22}
                strokeWidth={1.8}
                className={actuators.alarm ? "alarm-pulse" : ""}
                style={{
                  color: actuators.alarm ? "var(--status-critical)" : "var(--text-muted)",
                }}
              />
            </div>
            <span
              className={styles.actuatorBadge}
              style={{
                background: actuators.alarm
                  ? "rgba(255, 82, 82, 0.2)"
                  : "rgba(255, 255, 255, 0.04)",
                color: actuators.alarm ? "var(--status-critical)" : "var(--text-muted)",
                border: `1px solid ${
                  actuators.alarm ? "var(--status-critical)" : "var(--border)"
                }`,
              }}
            >
              {actuators.alarm ? "CH-03: ALERT!" : "CH-03: SECURE"}
            </span>
          </div>
          <div className={styles.actuatorName}>SECURITY & BUZZER ALARM</div>
          <div className={styles.actuatorDesc}>
            {actuators.alarm
              ? "Peringatan bahaya aktif! Buzzer berbunyi atau batas ambang terlampaui."
              : "Sistem alarm keamanan siaga dalam kondisi aman (Perimeter Nominal)."}
          </div>
          <div className={styles.actuatorFooter}>
            <span>PAYLOAD: &quot;alarm&quot;: {String(actuators.alarm)}</span>
            <span
              style={{
                color: actuators.alarm ? "var(--status-critical)" : "var(--text-muted)",
              }}
            >
              {actuators.alarm ? "● ALERT!" : "○ SECURE"}
            </span>
          </div>

          {/* Read-only status indicator */}
          <div
            className={styles.actuatorCtrlBtn}
            style={{
              background: actuators.alarm
                ? "rgba(255, 82, 82, 0.08)"
                : "rgba(255, 255, 255, 0.02)",
              borderColor: actuators.alarm
                ? "var(--status-critical)"
                : "rgba(255,255,255,0.06)",
              color: actuators.alarm ? "var(--status-critical)" : "var(--text-muted)",
              cursor: "default",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <BellRing size={13} strokeWidth={2} />
              <span>PERIMETER SYSTEM</span>
            </div>
            <span
              className={styles.actuatorSwitchPill}
              style={{
                background: actuators.alarm
                  ? "var(--status-critical)"
                  : "rgba(0, 230, 118, 0.12)",
                color: actuators.alarm ? "#FFFFFF" : "var(--status-online)",
              }}
            >
              {actuators.alarm ? "TRIGGERED" : "PASSIVE"}
            </span>
          </div>
        </div>
      </section>
    </>
  );
}
