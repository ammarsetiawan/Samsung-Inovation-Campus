"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import mqtt, { type MqttClient } from "mqtt";

// Types & Constants
import type {
  SensorData,
  LogEntry,
  MqttPacket,
  HistoryPoint,
  ActuatorState,
  ControlMode,
  MqttStatus,
  DecodedPayload,
} from "@/types/dashboard";
import { INITIAL_SENSORS, INITIAL_LOGS } from "@/constants/dashboard";
import { styles } from "@/lib/styles";

// Modular Components
import { GridBackground } from "@/components/common/GridBackground";
import { TopBar } from "@/components/layout/TopBar";
import { Footer } from "@/components/layout/Footer";
import { StatsRow } from "@/components/overview/StatsRow";
import { MqttBanner } from "@/components/overview/MqttBanner";
import { SensorGrid } from "@/components/sensors/SensorGrid";
import { ActuatorGrid } from "@/components/actuators/ActuatorGrid";
import { TelemetrySection } from "@/components/telemetry/TelemetrySection";
import { LogsSection } from "@/components/logs/LogsSection";

/* ═══════════════════════════════════════════════════
   MAIN DASHBOARD COMPONENT
   Telemetry Consumer & Actuator Controller
   ═══════════════════════════════════════════════════ */
export default function Dashboard() {
  const [sensors, setSensors] = useState<SensorData[]>(INITIAL_SENSORS);
  const [logs, setLogs] = useState<LogEntry[]>(INITIAL_LOGS);
  const [currentTime, setCurrentTime] = useState("--:--:--");
  const [latency] = useState(24);
  const [mounted, setMounted] = useState(false);

  // MQTT States
  const [brokerUrl, setBrokerUrl] = useState("wss://broker.emqx.io:8084/mqtt");
  const [topicControl, setTopicControl] = useState("JASUN/smart-office/control");
  const [activeTopic, setActiveTopic] = useState("JASUN/smart-office/monitors");
  const [mqttStatus, setMqttStatus] = useState<MqttStatus>("connecting");
  const [showConfig, setShowConfig] = useState(false);
  const [mqttPackets, setMqttPackets] = useState<MqttPacket[]>([]);
  const [packetsCount, setPacketsCount] = useState(0);
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [topicInput, setTopicInput] = useState("JASUN/smart-office/monitors");
  const [publishFeedback, setPublishFeedback] = useState<string | null>(null);

  // Real-time Actuators / Relays from ESP32 payload
  const [actuators, setActuators] = useState<ActuatorState>({ lamp: false, fan: false, alarm: false });
  // Control mode: "auto" (sensor PIR automation active) vs "manual" (user manual override)
  const [controlMode, setControlMode] = useState<ControlMode>("auto");
  const controlModeRef = useRef<ControlMode>("auto");
  const lastPresenceRef = useRef<number>(0);
  // Timestamp of last manual control publish — used to debounce incoming MQTT overrides
  const lastControlledRef = useRef<number>(0);

  useEffect(() => {
    controlModeRef.current = controlMode;
  }, [controlMode]);

  // Real-time parsed payload state
  const [lastPayloadRaw, setLastPayloadRaw] = useState<string>("");
  const [lastDecoded, setLastDecoded] = useState<DecodedPayload>({});

  // Telemetry stream history for the live chart
  const [history, setHistory] = useState<HistoryPoint[]>([
    { time: "00:00", temp: 28.0, hum: 65.0, light: 1295 },
  ]);

  const clientRef = useRef<MqttClient | null>(null);

  // Helpers
  const logLevelColor = useCallback((level: string) => {
    switch (level) {
      case "warn":
        return "var(--status-warning)";
      case "error":
        return "var(--status-critical)";
      default:
        return "var(--text-muted)";
    }
  }, []);

  const formatSessionTime = useCallback((totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    const hrs = Math.floor(mins / 60);
    return `${hrs.toString().padStart(2, "0")}:${(mins % 60).toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }, []);

  // Hydration-safe clock & session timer
  useEffect(() => {
    setMounted(true);
    setCurrentTime(new Date().toLocaleTimeString("en-GB"));

    const clockInterval = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString("en-GB"));
      setSessionSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(clockInterval);
  }, []);

  // ═══════════════════════════════════════════════════
  // MQTT CONNECTION & TELEMETRY INGESTION (READ-ONLY)
  // ═══════════════════════════════════════════════════
  useEffect(() => {
    if (!mounted) return;

    let client: MqttClient | null = null;
    const clientId = `sic_listener_${Math.random().toString(16).substring(2, 9)}`;
    setMqttStatus("connecting");

    try {
      client = mqtt.connect(brokerUrl, {
        clientId,
        clean: true,
        connectTimeout: 8000,
        reconnectPeriod: 4000,
      });
      clientRef.current = client;

      client.on("connect", () => {
        setMqttStatus("connected");

        // Normalize topics and subscribe to both monitor and control topics (plus wildcards)
        const cleanTopic = activeTopic.trim().replace(/\/+$/, "");
        const cleanCtrl = topicControl.trim().replace(/\/+$/, "");
        const topicList = Array.from(
          new Set([
            activeTopic,
            cleanTopic,
            `${cleanTopic}/#`,
            `${cleanTopic}/+`,
            topicControl,
            cleanCtrl,
            `${cleanCtrl}/#`,
            `${cleanCtrl}/+`,
          ])
        );

        client?.subscribe(topicList, (err) => {
          if (!err) {
            setLogs((prev) => [
              {
                time: new Date().toLocaleTimeString("en-GB"),
                node: "MQTT",
                message: `Tersambung ke broker! Subscribed: ${cleanTopic} & ${cleanCtrl} (# wildcard aktif)`,
                level: "info",
              },
              ...prev.slice(0, 7),
            ]);
          } else {
            console.error("Subscription error:", err);
          }
        });
      });

      client.on("message", (rxTopic, messageBuffer) => {
        const messageStr = messageBuffer.toString().trim();
        const now = new Date().toLocaleTimeString("en-GB");

        // Record incoming packet
        setMqttPackets((prev) => [
          { time: now, topic: rxTopic, payload: messageStr },
          ...prev.slice(0, 19),
        ]);
        setPacketsCount((prev) => prev + 1);
        setLastPayloadRaw(messageStr);

        // ─── UNIVERSAL IOT PARSER (Fuzzy, case-insensitive, text & JSON) ───
        const topicLower = rxTopic.toLowerCase();
        let extractedTemp: number | undefined;
        let extractedPresence: number | undefined;
        let extractedHum: number | undefined;
        let extractedLight: number | undefined;

        let parsedLamp: boolean | undefined;
        let parsedFan: boolean | undefined;
        let parsedAlarm: boolean | undefined;

        // Try JSON parsing
        try {
          const json = JSON.parse(messageStr);
          const flat: Record<string, number> = {};

          const traverse = (obj: unknown, prefix = "") => {
            if (!obj || typeof obj !== "object") return;
            for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
              const fullKey = (prefix ? `${prefix}_${k}` : k)
                .toLowerCase()
                .replace(/[^a-z0-9]/g, "");
              if (typeof v === "number" && !isNaN(v)) {
                flat[fullKey] = v;
              } else if (typeof v === "string") {
                const n = parseFloat(v);
                if (!isNaN(n)) flat[fullKey] = n;
              } else if (typeof v === "object" && v !== null) {
                traverse(v, fullKey);
              }
            }
          };
          traverse(json);

          // Actuators / Smart Office Status & Mode
          if (json && typeof json === "object") {
            const rawObj = json as Record<string, unknown>;
            if ("lamp" in rawObj) parsedLamp = Boolean(rawObj.lamp);
            if ("fan" in rawObj) parsedFan = Boolean(rawObj.fan);
            if ("alarm" in rawObj) parsedAlarm = Boolean(rawObj.alarm);
            if ("mode" in rawObj) {
              const m = String(rawObj.mode).toLowerCase();
              if (m === "auto") setControlMode("auto");
              else if (m === "manual") setControlMode("manual");
            }
            if ("mode_auto" in rawObj && Boolean(rawObj.mode_auto)) {
              setControlMode("auto");
            }
          }

          // Search flattened keys for telemetry values
          for (const [k, v] of Object.entries(flat)) {
            if (
              extractedTemp === undefined &&
              (k.includes("temp") || k.includes("suhu") || k.includes("celsius") || k === "t")
            ) {
              extractedTemp = v;
            }
            if (
              extractedPresence === undefined &&
              (k.includes("presence") ||
                k.includes("pir") ||
                k.includes("people") ||
                k.includes("orang") ||
                k.includes("occupancy") ||
                k.includes("count"))
            ) {
              extractedPresence = Math.round(v);
            }
            if (
              extractedHum === undefined &&
              (k.includes("hum") || k.includes("lembab") || k.includes("rh") || k === "h")
            ) {
              extractedHum = v;
            }
            if (
              extractedLight === undefined &&
              (k.includes("light") || k.includes("adc") || k.includes("lux") || k.includes("ldr") || k.includes("cahaya"))
            ) {
              extractedLight = Math.round(v);
            }
          }
        } catch {
          // If not standard JSON, check if it's a plain number or formatted string
          const num = parseFloat(messageStr);
          if (!isNaN(num) && /^-?\d+(\.\d+)?$/.test(messageStr)) {
            if (topicLower.includes("temp") || topicLower.includes("suhu")) {
              extractedTemp = num;
            } else if (topicLower.includes("presence") || topicLower.includes("pir") || topicLower.includes("orang")) {
              extractedPresence = Math.round(num);
            } else if (topicLower.includes("hum") || topicLower.includes("lembab")) {
              extractedHum = num;
            } else if (topicLower.includes("light") || topicLower.includes("adc") || topicLower.includes("lux")) {
              extractedLight = Math.round(num);
            }
          } else {
            // Regex match
            const tempMatch = messageStr.match(/(?:temp|suhu|temperature_c)\s*[:=]\s*([\d.]+)/i);
            if (tempMatch) extractedTemp = parseFloat(tempMatch[1]);

            const presMatch = messageStr.match(/(?:presence|pir|people|occupancy)\s*[:=]\s*([\d.]+)/i);
            if (presMatch) extractedPresence = Math.round(parseFloat(presMatch[1]));

            const humMatch = messageStr.match(/(?:hum|kelembaban|humidity_pct)\s*[:=]\s*([\d.]+)/i);
            if (humMatch) extractedHum = parseFloat(humMatch[1]);

            const lightMatch = messageStr.match(/(?:light_adc|light|adc|lux)\s*[:=]\s*([\d.]+)/i);
            if (lightMatch) extractedLight = Math.round(parseFloat(lightMatch[1]));

            const lampMatch = messageStr.match(/(?:lamp|lampu)\s*[:=]\s*([a-z\d]+)/i);
            if (lampMatch) {
              const v = lampMatch[1].toLowerCase();
              parsedLamp = v === "1" || v === "true" || v === "on";
            }

            const fanMatch = messageStr.match(/(?:fan|kipas)\s*[:=]\s*([a-z\d]+)/i);
            if (fanMatch) {
              const v = fanMatch[1].toLowerCase();
              parsedFan = v === "1" || v === "true" || v === "on";
            }
          }

          // Also check if topic specifically targets actuator subtopics (e.g. .../control/lamp)
          if (topicLower.endsWith("/lamp") || topicLower.endsWith("/lampu")) {
            const v = messageStr.toLowerCase();
            parsedLamp = v === "1" || v === "true" || v === "on";
          } else if (topicLower.endsWith("/fan") || topicLower.endsWith("/kipas")) {
            const v = messageStr.toLowerCase();
            parsedFan = v === "1" || v === "true" || v === "on";
          }
        }

        // Check if raw message contains mode_auto or auto command
        if (messageStr.toLowerCase().includes("mode_auto") || messageStr.toLowerCase() === "auto") {
          setControlMode("auto");
          lastControlledRef.current = 0;
        }

        // PRIORITAS MODE AUTO SAAT MENDETEKSI ORANG:
        if (extractedPresence !== undefined) {
          if (extractedPresence > 0) {
            lastControlledRef.current = 0;

            if (controlModeRef.current === "manual") {
              controlModeRef.current = "auto";
              setControlMode("auto");

              const cleanCtrl = topicControl.trim().replace(/\/+$/, "");
              const autoPayloadObj = {
                mode: "auto",
                mode_auto: true,
                auto: true,
              };
              client?.publish(cleanCtrl, JSON.stringify(autoPayloadObj), { qos: 0, retain: false });
              client?.publish(cleanCtrl, "mode_auto", { qos: 0, retain: false });

              setPublishFeedback("👤 ORANG TERDETEKSI: Mode Otomatis Diprioritaskan (PIR Takeover)");
              setTimeout(() => setPublishFeedback(null), 3500);

              setLogs((prev) => [
                {
                  time: now,
                  node: "AUTO",
                  message: `[PIR PRIORITY] Terdeteksi orang → Otomatis alihkan ke mode AUTO`,
                  level: "info",
                },
                ...prev.slice(0, 7),
              ]);
            }
          }
          lastPresenceRef.current = extractedPresence;
        }

        // Update actuators if present
        const sinceLastControl = Date.now() - lastControlledRef.current;
        const allowActuatorUpdate =
          sinceLastControl > 15000 ||
          controlMode === "auto" ||
          (extractedPresence !== undefined && extractedPresence > 0);

        if (
          (parsedLamp !== undefined || parsedFan !== undefined || parsedAlarm !== undefined) &&
          allowActuatorUpdate
        ) {
          setActuators((prev) => {
            const nextLamp = parsedLamp !== undefined ? parsedLamp : prev.lamp;
            const nextFan = parsedFan !== undefined ? parsedFan : prev.fan;
            const nextAlarm = parsedAlarm !== undefined ? parsedAlarm : prev.alarm;

            if (!nextLamp && !nextFan && controlMode === "manual" && sinceLastControl > 15000) {
              setControlMode("auto");
            }

            return {
              lamp: nextLamp,
              fan: nextFan,
              alarm: nextAlarm,
            };
          });
        }

        // Save last decoded payload summary
        setLastDecoded({
          temperature_c: extractedTemp,
          humidity_pct: extractedHum,
          presence: extractedPresence,
          light_adc: extractedLight,
          lamp: parsedLamp !== undefined ? parsedLamp : undefined,
          fan: parsedFan !== undefined ? parsedFan : undefined,
          alarm: parsedAlarm !== undefined ? parsedAlarm : undefined,
          topic: rxTopic,
          time: now,
          bytes: messageBuffer.length,
        });

        // Update sensor cards
        const hasUpdate =
          extractedTemp !== undefined ||
          extractedPresence !== undefined ||
          extractedHum !== undefined ||
          extractedLight !== undefined;

        if (hasUpdate) {
          setSensors((prev) =>
            prev.map((s) => {
              let updatedVal = s.value;
              let found = false;

              if (s.id === "temp-01" && extractedTemp !== undefined) {
                updatedVal = extractedTemp;
                found = true;
              }
              if (s.id === "hum-01" && extractedHum !== undefined) {
                updatedVal = extractedHum;
                found = true;
              }
              if (s.id === "presence-01" && extractedPresence !== undefined) {
                updatedVal = extractedPresence;
                found = true;
              }
              if (s.id === "light-01" && extractedLight !== undefined) {
                updatedVal = extractedLight;
                found = true;
              }

              if (found) {
                return {
                  ...s,
                  value: updatedVal,
                  trend: [...s.trend.slice(1), updatedVal],
                  status: "online",
                  lastUpdated: now,
                };
              }
              return s;
            })
          );

          // Append to chart history (keep up to 24 data points)
          setHistory((prev) => {
            const last = prev[prev.length - 1];
            const newPoint: HistoryPoint = {
              time: now,
              temp: extractedTemp !== undefined ? extractedTemp : (last ? last.temp : 28.0),
              hum: extractedHum !== undefined ? extractedHum : (last ? last.hum : 65.0),
              light: extractedLight !== undefined ? extractedLight : (last ? last.light : 1295),
            };
            return [...prev.slice(prev.length >= 24 ? 1 : 0), newPoint];
          });

          setLogs((prev) => [
            {
              time: now,
              node: "TELEMETRY",
              message: `[${rxTopic}] Ingested: ${messageStr.slice(0, 48)}...`,
              level: "info",
            },
            ...prev.slice(0, 7),
          ]);
        } else {
          setLogs((prev) => [
            {
              time: now,
              node: "PACKET",
              message: `[${rxTopic}]: ${messageStr.slice(0, 48)}`,
              level: "warn",
            },
            ...prev.slice(0, 7),
          ]);
        }
      });

      client.on("reconnect", () => setMqttStatus("connecting"));
      client.on("offline", () => setMqttStatus("offline"));
      client.on("error", (err) => {
        console.error("MQTT Error:", err);
        setMqttStatus("error");
      });
    } catch (err) {
      console.error("MQTT connect error:", err);
      setMqttStatus("error");
    }

    return () => {
      if (client) {
        client.end(true);
      }
    };
  }, [brokerUrl, activeTopic, topicControl, mounted]);

  // Dynamically subscribe to topicControl when connected or changed
  useEffect(() => {
    if (!mounted || !clientRef.current || mqttStatus !== "connected") return;
    const cleanCtrl = topicControl.trim().replace(/\/+$/, "");
    if (!cleanCtrl) return;
    const list = [cleanCtrl, `${cleanCtrl}/#`, `${cleanCtrl}/+`];
    clientRef.current.subscribe(list, (err) => {
      if (err) console.error("Control topic subscription error:", err);
    });
  }, [topicControl, mqttStatus, mounted]);

  // ═══════════════════════════════════════════════════
  // ACTUATOR CONTROL — PUBLISH to topicControl
  // ═══════════════════════════════════════════════════
  const publishControl = useCallback(
    (device: "lamp" | "fan", newState: boolean) => {
      const client = clientRef.current;
      if (!client || !client.connected) {
        setPublishFeedback("⚠ MQTT tidak terhubung ke broker! Cek koneksi.");
        setTimeout(() => setPublishFeedback(null), 3500);
        return;
      }

      const updatedActuators: ActuatorState = {
        ...actuators,
        [device]: newState,
      };
      setActuators(updatedActuators);

      const cleanCtrl = topicControl.trim().replace(/\/+$/, "");
      const allOff = !updatedActuators.lamp && !updatedActuators.fan;

      if (allOff) {
        lastControlledRef.current = 0;
        setControlMode("auto");

        const autoPayloadObj = {
          lamp: false,
          fan: false,
          mode: "auto",
          mode_auto: true,
          auto: true,
        };
        const autoJsonStr = JSON.stringify(autoPayloadObj);

        client.publish(cleanCtrl, autoJsonStr, { qos: 0, retain: false });

        client.publish(cleanCtrl, "mode_auto", { qos: 0, retain: false }, (err) => {
          if (err) {
            console.error("Publish error to", cleanCtrl, err);
            setPublishFeedback(`✕ Gagal kirim ke ${cleanCtrl}: ${err.message}`);
          } else {
            const now = new Date().toLocaleTimeString("en-GB");
            setPublishFeedback(
              `✓ SEMUA MATI → Otomatis Reset ke MODE AUTO (Sensor PIR & Otomasi Aktif)`
            );
            setLogs((prev) => [
              {
                time: now,
                node: "AUTO",
                message: `[AUTO-RESET] Semua perangkat padam → Kirim "mode_auto" ke ${cleanCtrl}`,
                level: "info",
              },
              ...prev.slice(0, 7),
            ]);
          }
          setTimeout(() => setPublishFeedback(null), 4000);
        });
      } else {
        lastControlledRef.current = Date.now();
        setControlMode("manual");

        const payloadObj = {
          lamp: updatedActuators.lamp,
          fan: updatedActuators.fan,
        };
        const jsonPayload = JSON.stringify(payloadObj);

        client.publish(cleanCtrl, jsonPayload, { qos: 0, retain: false }, (err) => {
          if (err) {
            console.error("Publish error to", cleanCtrl, err);
            setPublishFeedback(`✕ Gagal kirim ke ${cleanCtrl}: ${err.message}`);
          } else {
            const now = new Date().toLocaleTimeString("en-GB");
            setPublishFeedback(
              `✓ MANUAL: ${device.toUpperCase()} = ${newState ? "ON" : "OFF"}`
            );
            setLogs((prev) => [
              {
                time: now,
                node: "CTRL",
                message: `[PUBLISH] ${cleanCtrl} → ${jsonPayload}`,
                level: "info",
              },
              ...prev.slice(0, 7),
            ]);
          }
          setTimeout(() => setPublishFeedback(null), 3500);
        });
      }
    },
    [topicControl, actuators]
  );

  // ═══════════════════════════════════════════════════
  // RESUME AUTO MODE — Kirim "mode_auto" ke ESP32
  // ═══════════════════════════════════════════════════
  const resumeAutoMode = useCallback(() => {
    const client = clientRef.current;
    if (!client || !client.connected) {
      setPublishFeedback("⚠ MQTT tidak terhubung ke broker! Cek koneksi.");
      setTimeout(() => setPublishFeedback(null), 3500);
      return;
    }

    lastControlledRef.current = 0;
    setControlMode("auto");

    const cleanCtrl = topicControl.trim().replace(/\/+$/, "");

    const jsonPayload = JSON.stringify({
      mode: "auto",
      mode_auto: true,
      auto: true,
    });
    client.publish(cleanCtrl, jsonPayload, { qos: 0, retain: false });

    client.publish(cleanCtrl, "mode_auto", { qos: 0, retain: false }, (err) => {
      if (err) {
        console.error("Gagal publish mode_auto:", err);
        setPublishFeedback(`✕ Gagal kirim mode_auto ke ${cleanCtrl}: ${err.message}`);
      } else {
        const now = new Date().toLocaleTimeString("en-GB");
        setPublishFeedback(
          `✓ MODE AUTO AKTIF → ${cleanCtrl} : "mode_auto" (Sensor PIR & Otomasi Lampu/Kipas Kembali Aktif)`
        );
        setLogs((prev) => [
          {
            time: now,
            node: "AUTO",
            message: `[PUBLISH] ${cleanCtrl} → "mode_auto" & ${jsonPayload}`,
            level: "info",
          },
          ...prev.slice(0, 7),
        ]);
      }
      setTimeout(() => setPublishFeedback(null), 4000);
    });
  }, [topicControl]);

  return (
    <div className={styles.dashboardRoot}>
      <GridBackground />

      {/* ═══ TOP BAR ═══ */}
      <TopBar
        currentTime={currentTime}
        latency={latency}
        mqttStatus={mqttStatus}
        activeTopic={activeTopic}
      />

      {/* ═══ MAIN CONTENT ═══ */}
      <main className={styles.mainContent}>
        {/* ─── STATS ROW (VERIFIABLE SESSION METRICS) ─── */}
        <StatsRow
          mounted={mounted}
          sessionSeconds={sessionSeconds}
          packetsCount={packetsCount}
          controlMode={controlMode}
          formatSessionTime={formatSessionTime}
        />

        {/* ─── MQTT TELEMETRY CONSUMER LINK BAR & DRAWER ─── */}
        <MqttBanner
          mounted={mounted}
          mqttStatus={mqttStatus}
          brokerUrl={brokerUrl}
          setBrokerUrl={setBrokerUrl}
          activeTopic={activeTopic}
          setActiveTopic={setActiveTopic}
          topicControl={topicControl}
          setTopicControl={setTopicControl}
          topicInput={topicInput}
          setTopicInput={setTopicInput}
          showConfig={showConfig}
          setShowConfig={setShowConfig}
          mqttPackets={mqttPackets}
        />

        {/* ─── 4 CORE SENSORS (FROM HARDWARE PAYLOAD) ─── */}
        <SensorGrid sensors={sensors} mounted={mounted} />

        {/* ─── SMART OFFICE ACTUATORS / RELAYS TELEMETRY ─── */}
        <ActuatorGrid
          actuators={actuators}
          controlMode={controlMode}
          publishFeedback={publishFeedback}
          mqttStatus={mqttStatus}
          publishControl={publishControl}
          resumeAutoMode={resumeAutoMode}
          mounted={mounted}
        />

        {/* ─── LIVE STREAM TIMELINE & INGESTION INSPECTOR ─── */}
        <TelemetrySection
          history={history}
          sensors={sensors}
          actuators={actuators}
          lastDecoded={lastDecoded}
          lastPayloadRaw={lastPayloadRaw}
          activeTopic={activeTopic}
          mounted={mounted}
        />

        {/* ─── BOTTOM ROW: SYSTEM LOG & TOPOLOGY ─── */}
        <LogsSection
          logs={logs}
          history={history}
          packetsCount={packetsCount}
          sessionSeconds={sessionSeconds}
          actuators={actuators}
          latency={latency}
          activeTopic={activeTopic}
          mounted={mounted}
          logLevelColor={logLevelColor}
        />

        {/* ─── FOOTER ─── */}
        <Footer activeTopic={activeTopic} />
      </main>
    </div>
  );
}
