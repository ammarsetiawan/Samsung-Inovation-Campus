"use client";

import { Sliders, ChevronUp, MapPin } from "lucide-react";
import { styles } from "@/lib/styles";
import type { MqttStatus, MqttPacket } from "@/types/dashboard";

interface MqttBannerProps {
  mounted: boolean;
  mqttStatus: MqttStatus;
  brokerUrl: string;
  setBrokerUrl: (v: string) => void;
  activeTopic: string;
  setActiveTopic: (v: string) => void;
  topicControl: string;
  setTopicControl: (v: string) => void;
  topicInput: string;
  setTopicInput: (v: string) => void;
  showConfig: boolean;
  setShowConfig: (v: boolean) => void;
  mqttPackets: MqttPacket[];
}

export function MqttBanner({
  mounted,
  mqttStatus,
  brokerUrl,
  setBrokerUrl,
  activeTopic,
  setActiveTopic,
  topicControl,
  setTopicControl,
  topicInput,
  setTopicInput,
  showConfig,
  setShowConfig,
  mqttPackets,
}: MqttBannerProps) {
  return (
    <section className={`${styles.mqttBanner} ${mounted ? "animate-fade-in-up" : ""}`}>
      <div className={styles.mqttBannerHeader}>
        <div className={styles.mqttTitleGroup}>
          <div
            className={`${styles.mqttStatusBadge} ${
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
            {mqttStatus === "connected"
              ? "INGESTING TELEMETRY (WSS)"
              : mqttStatus.toUpperCase()}
          </div>

          <div className={styles.mqttMetaRow}>
            <div>
              <span className={styles.mqttTag}>BROKER: </span>
              <span className={styles.mqttVal}>{brokerUrl.replace(/^wss?:\/\//, "")}</span>
            </div>
            <div>
              <span className={styles.mqttTag}>FEED: </span>
              <span className={styles.mqttVal}>{activeTopic}</span>
            </div>
          </div>
        </div>

        <div className={styles.mqttActions}>
          <button
            type="button"
            className={styles.mqttBtn}
            onClick={() => setShowConfig(!showConfig)}
          >
            {showConfig ? (
              <>
                <ChevronUp size={12} strokeWidth={2} /> CLOSE CONFIG & LOGS
              </>
            ) : (
              <>
                <Sliders size={12} strokeWidth={2} /> MQTT CONFIG & FEED DRAWER
              </>
            )}
          </button>
        </div>
      </div>

      {showConfig && (
        <div className={styles.mqttDrawer}>
          <div className={styles.mqttConfigBox}>
            <div className={styles.mqttInputGroup}>
              <label className={styles.mqttInputLabel}>HIVEMQ BROKER WSS URL</label>
              <input
                type="text"
                value={brokerUrl}
                onChange={(e) => setBrokerUrl(e.target.value)}
                className={styles.mqttInput}
                placeholder="wss://broker.hivemq.com:8884/mqtt"
              />
            </div>

            {/* Monitor Topic */}
            <div className={styles.mqttInputGroup}>
              <label className={styles.mqttInputLabel}>
                📡 MONITOR TOPIC (SUBSCRIBE — baca data sensor)
              </label>
              <div style={{ display: "flex", gap: "8px" }}>
                <input
                  type="text"
                  value={topicInput}
                  onChange={(e) => setTopicInput(e.target.value)}
                  className={styles.mqttInput}
                  placeholder="JASUN/smart-office/monitors"
                />
                <button
                  type="button"
                  className={styles.mqttBtn}
                  onClick={() => setActiveTopic(topicInput)}
                >
                  APPLY
                </button>
              </div>
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "4px" }}>
                <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>Presets:</span>
                <button
                  type="button"
                  className={styles.mqttBtn}
                  style={{
                    padding: "3px 8px",
                    fontSize: "10px",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                  onClick={() => {
                    setTopicInput("JASUN/smart-office/monitors");
                    setActiveTopic("JASUN/smart-office/monitors");
                  }}
                >
                  <MapPin size={11} strokeWidth={2} /> JASUN/smart-office/monitors
                </button>
                <button
                  type="button"
                  className={styles.mqttBtn}
                  style={{
                    padding: "3px 8px",
                    fontSize: "10px",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                  onClick={() => {
                    setTopicInput("JASUN/smart-office/#");
                    setActiveTopic("JASUN/smart-office/#");
                  }}
                >
                  <MapPin size={11} strokeWidth={2} /> JASUN/smart-office/#
                </button>
              </div>
            </div>

            {/* Control Topic */}
            <div className={styles.mqttInputGroup}>
              <label className={styles.mqttInputLabel}>
                🎮 CONTROL TOPIC (PUBLISH — kirim perintah ke ESP32)
              </label>
              <input
                type="text"
                value={topicControl}
                onChange={(e) => setTopicControl(e.target.value)}
                className={styles.mqttInput}
                placeholder="JASUN/smart-office/control"
              />
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "4px" }}>
                <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>Presets:</span>
                <button
                  type="button"
                  className={styles.mqttBtn}
                  style={{
                    padding: "3px 8px",
                    fontSize: "10px",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                  onClick={() => setTopicControl("JASUN/smart-office/control")}
                >
                  <MapPin size={11} strokeWidth={2} /> JASUN/smart-office/control
                </button>
              </div>
            </div>
          </div>

          <div>
            <div
              style={{
                fontSize: "10px",
                fontWeight: 600,
                color: "var(--text-muted)",
                marginBottom: "6px",
                letterSpacing: "0.1em",
              }}
            >
              LIVE RAW INCOMING STREAM ({mqttPackets.length} PACKETS)
            </div>
            <div className={styles.mqttLiveStream}>
              {mqttPackets.length === 0 ? (
                <div style={{ color: "var(--text-muted)", fontSize: "10px", padding: "8px 0" }}>
                  Menunggu pesan masuk dari hardware pada topic{" "}
                  <span style={{ color: "var(--primary)" }}>{activeTopic}</span>...
                </div>
              ) : (
                mqttPackets.map((pkt, idx) => (
                  <div key={idx} className={styles.mqttPacketItem}>
                    <span className={styles.mqttPacketTime}>{pkt.time}</span>
                    <span className={styles.mqttPacketTopic}>[{pkt.topic}]</span>
                    <span className={styles.mqttPacketPayload}>{pkt.payload}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
