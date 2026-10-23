"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import mqtt, { type MqttClient } from "mqtt";
import {
  Thermometer,
  Droplets,
  UserCheck,
  SunMedium,
  Lightbulb,
  Fan,
  BellRing,
  Cpu,
  Clock,
  Layers,
  Globe2,
  Radio,
  Sliders,
  ChevronDown,
  ChevronUp,
  MapPin,
  LineChart,
  FileCode2,
  Terminal,
  Network,
  Activity,
} from "lucide-react";

/* Class mapping proxy that maps camelCase properties to globals.css class names */
const CLASS_MAP: Record<string, string> = {
  dashboardRoot: "dash-root",
  separator: "hdr-sep",
  headerTag: "hdr-tag",
  xpBadge: "xp",
  statusDotSmall: "status-dot-sm",
  actuatorGrid: "actuator-grid",
  actuatorCard: "actuator-card",
  actuatorCardActive: "actuator-card-active",
  actuatorCardFanActive: "actuator-card-fan-active",
  actuatorCardAlarmActive: "actuator-card-alarm-active",
  actuatorTop: "actuator-top",
  actuatorIconWrap: "actuator-icon-wrap",
  actuatorBadge: "actuator-badge",
  actuatorName: "actuator-name",
  actuatorDesc: "actuator-desc",
  actuatorFooter: "actuator-footer",
  telemetryChartPanel: "telemetry-chart-panel",
  telemetryChartHeader: "telemetry-chart-header",
  telemetryLegend: "telemetry-legend",
  telemetryLegendItem: "telemetry-legend-item",
  telemetryLegendDot: "telemetry-legend-dot",
  telemetryChartWrap: "telemetry-chart-wrap",
  telemetryChartSvg: "telemetry-chart-svg",
  inspectorTable: "inspector-table",
  inspectorKey: "inspector-key",
  inspectorVal: "inspector-val",
  inspectorValOnline: "inspector-val-online",
  inspectorValAlarm: "inspector-val-alarm",
};

const styles = new Proxy<Record<string, string>>({} as Record<string, string>, {
  get: (_, prop: string) => {
    if (typeof prop !== "string") return "";
    if (CLASS_MAP[prop]) return CLASS_MAP[prop];
    return prop.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
  },
});

/* ═══════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════ */
interface SensorData {
  id: string;
  label: string;
  value: number;
  unit: string;
  min: number;
  max: number;
  status: "online" | "warning" | "critical" | "offline";
  trend: number[];
  lastUpdated?: string;
  description?: string;
}

interface LogEntry {
  time: string;
  node: string;
  message: string;
  level: "info" | "warn" | "error";
}

interface MqttPacket {
  time: string;
  topic: string;
  payload: string;
}

interface HistoryPoint {
  time: string;
  temp: number;
  hum: number;
  light: number;
}

interface ActuatorState {
  lamp: boolean;
  fan: boolean;
  alarm: boolean;
}

/* ═══════════════════════════════════════════════════
   INITIAL HARDWARE SENSORS STATE
   Mapped 1:1 to user ESP32 hardware telemetry schema
   ═══════════════════════════════════════════════════ */
const INITIAL_SENSORS: SensorData[] = [
  {
    id: "temp-01",
    label: "ROOM TEMPERATURE",
    value: 28.5,
    unit: "°C",
    min: 0,
    max: 100,
    status: "online",
    trend: [26, 27, 27, 28, 28, 27, 28, 29, 28, 28, 29, 28, 28.5],
    description: "Thermal sensor (DHT/DS18B20/SHTC3)",
  },
  {
    id: "hum-01",
    label: "ROOM HUMIDITY",
    value: 65.0,
    unit: "%",
    min: 0,
    max: 100,
    status: "online",
    trend: [60, 62, 63, 64, 63, 62, 65, 66, 64, 65, 65, 64, 65.0],
    description: "Relative moisture hygrometer",
  },
  {
    id: "presence-01",
    label: "ROOM OCCUPANCY (PIR)",
    value: 0,
    unit: "state",
    min: 0,
    max: 1,
    status: "online",
    trend: [0, 0, 1, 1, 1, 0, 0, 0, 1, 1, 0, 0, 0],
    description: "Infrared motion presence sensor",
  },
  {
    id: "light-01",
    label: "AMBIENT LIGHT (LDR)",
    value: 1295,
    unit: "ADC",
    min: 0,
    max: 4095,
    status: "online",
    trend: [1100, 1150, 1200, 1250, 1280, 1310, 1290, 1295, 1300, 1285, 1295],
    description: "Light dependent resistor 12-bit ADC",
  },
];

const INITIAL_LOGS: LogEntry[] = [
  { time: "INIT", node: "MQTT", message: "Connecting to wss://broker.emqx.io:8084/mqtt", level: "info" },
  { time: "INIT", node: "TOPIC", message: "Subscribing to JASUN/smart-office/monitor", level: "info" },
  { time: "INIT", node: "MODE", message: "Read-only consumer initialized : Listening for hardware stream", level: "info" },
];

/* ═══════════════════════════════════════════════════
   MINI SPARKLINE COMPONENT
   ═══════════════════════════════════════════════════ */
function Sparkline({
  data,
  color = "#FFAB00",
  width = 120,
  height = 32,
}: {
  data: number[];
  color?: string;
  width?: number;
  height?: number;
}) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((v - min) / range) * (height - 6) - 3;
      return `${x},${y}`;
    })
    .join(" ");

  const areaPoints = `0,${height} ${points} ${width},${height}`;
  const gradId = `grad-${color.replace("#", "")}-${data.length}`;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className={styles.sparkline}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill={`url(#${gradId})`} />
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ═══════════════════════════════════════════════════
   GRID BACKGROUND CANVAS
   ═══════════════════════════════════════════════════ */
function GridBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    const gridSize = 40;
    let time = 0;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Subtle dot grid
      ctx.fillStyle = "rgba(255, 171, 0, 0.04)";
      for (let x = 0; x < width; x += gridSize) {
        for (let y = 0; y < height; y += gridSize) {
          ctx.fillRect(x - 0.5, y - 0.5, 1, 1);
        }
      }

      // Moving crosshair scanline
      const pulse = Math.sin(time * 0.02) * 0.5 + 0.5;
      ctx.strokeStyle = `rgba(255, 171, 0, ${0.03 + pulse * 0.02})`;
      ctx.lineWidth = 0.5;

      const scanY = (time * 1.5) % height;
      ctx.beginPath();
      ctx.moveTo(0, scanY);
      ctx.lineTo(width, scanY);
      ctx.stroke();

      time++;
      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return <canvas ref={canvasRef} className={styles.gridCanvas} />;
}

/* ═══════════════════════════════════════════════════
   LIVE MULTI-METRIC STREAM TIMELINE CHART (SVG)
   ═══════════════════════════════════════════════════ */
function LiveTelemetryChart({ history }: { history: HistoryPoint[] }) {
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
        {history.filter((_, idx) => idx % Math.ceil(history.length / 5) === 0 || idx === history.length - 1).map((h, i) => {
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

/* ═══════════════════════════════════════════════════
   MAIN DASHBOARD COMPONENT
   Pure Telemetry Consumer & Visualizer with Lucide Icons
   ═══════════════════════════════════════════════════ */
export default function Dashboard() {
  const [sensors, setSensors] = useState<SensorData[]>(INITIAL_SENSORS);
  const [logs, setLogs] = useState<LogEntry[]>(INITIAL_LOGS);
  const [currentTime, setCurrentTime] = useState("--:--:--");
  const [latency] = useState(24);
  const [mounted, setMounted] = useState(false);

  // MQTT States (Read-only consumer)
  const [brokerUrl, setBrokerUrl] = useState("wss://broker.emqx.io:8084/mqtt");
  const [topicInput, setTopicInput] = useState("JASUN/smart-office/monitor");
  const [activeTopic, setActiveTopic] = useState("JASUN/smart-office/monitor");
  const [mqttStatus, setMqttStatus] = useState<"connected" | "connecting" | "offline" | "error">("connecting");
  const [showConfig, setShowConfig] = useState(false);
  const [mqttPackets, setMqttPackets] = useState<MqttPacket[]>([]);
  const [packetsCount, setPacketsCount] = useState(0);
  const [sessionSeconds, setSessionSeconds] = useState(0);

  // Real-time Actuators / Relays from ESP32 payload
  const [actuators, setActuators] = useState<ActuatorState>({ lamp: false, fan: false, alarm: false });

  // Real-time parsed payload state
  const [lastPayloadRaw, setLastPayloadRaw] = useState<string>("");
  const [lastDecoded, setLastDecoded] = useState<{
    temperature_c?: number;
    humidity_pct?: number;
    presence?: number;
    light_adc?: number;
    lamp?: boolean;
    fan?: boolean;
    alarm?: boolean;
    topic?: string;
    time?: string;
    bytes?: number;
  }>({});

  // Telemetry stream history for the live chart
  const [history, setHistory] = useState<HistoryPoint[]>([
    { time: "00:00", temp: 28.0, hum: 65.0, light: 1295 },
  ]);

  const clientRef = useRef<MqttClient | null>(null);

  // Helpers
  const logLevelColor = useCallback((level: string) => {
    switch (level) {
      case "warn": return "var(--status-warning)";
      case "error": return "var(--status-critical)";
      default: return "var(--text-muted)";
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

        // Normalize topic and subscribe to activeTopic and wildcards
        const cleanTopic = activeTopic.trim().replace(/\/+$/, "");
        const topicList = Array.from(
          new Set([
            activeTopic,
            cleanTopic,
            `${cleanTopic}/#`,
            `${cleanTopic}/+`,
          ])
        );

        client?.subscribe(topicList, (err) => {
          if (!err) {
            setLogs((prev) => [
              {
                time: new Date().toLocaleTimeString("en-GB"),
                node: "MQTT",
                message: `Tersambung ke broker! Subscribed: ${cleanTopic} (# wildcard aktif)`,
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

          // Actuators / Smart Office Status
          if (json && typeof json === "object") {
            const rawObj = json as Record<string, unknown>;
            if ("lamp" in rawObj) parsedLamp = Boolean(rawObj.lamp);
            if ("fan" in rawObj) parsedFan = Boolean(rawObj.fan);
            if ("alarm" in rawObj) parsedAlarm = Boolean(rawObj.alarm);
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
          }
        }

        // Update actuators if present
        if (parsedLamp !== undefined || parsedFan !== undefined || parsedAlarm !== undefined) {
          setActuators((prev) => ({
            lamp: parsedLamp !== undefined ? parsedLamp : prev.lamp,
            fan: parsedFan !== undefined ? parsedFan : prev.fan,
            alarm: parsedAlarm !== undefined ? parsedAlarm : prev.alarm,
          }));
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
  }, [brokerUrl, activeTopic, mounted]);

  // Derived sensor values for quick visual interpretations
  const tempSensor = sensors.find((s) => s.id === "temp-01");
  const humSensor = sensors.find((s) => s.id === "hum-01");
  const presenceSensor = sensors.find((s) => s.id === "presence-01");
  const lightSensor = sensors.find((s) => s.id === "light-01");

  const currentTemp = tempSensor ? tempSensor.value : 0;
  const currentHum = humSensor ? humSensor.value : 0;
  const currentPresence = presenceSensor ? presenceSensor.value : 0;
  const currentLight = lightSensor ? lightSensor.value : 0;

  // Illumination label based on ADC (0 - 4095)
  const getLightDescription = (adc: number) => {
    if (adc < 600) return "DARK / NIGHT";
    if (adc < 1500) return "INDOOR / AMBIENT";
    if (adc < 3000) return "WELL-LIT";
    return "BRIGHT / DIRECT";
  };

  return (
    <div className={styles.dashboardRoot}>
      <GridBackground />

      {/* ═══ TOP BAR ═══ */}
      <header className={styles.topBar}>
        <div className={styles.topBarLeft}>
          <div className={styles.logo}>
            <div className={styles.logoIcon}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="#FFAB00" strokeWidth="1.5" strokeLinejoin="round" />
                <path d="M2 17L12 22L22 17" stroke="#FFAB00" strokeWidth="1.5" strokeLinejoin="round" />
                <path d="M2 12L12 17L22 12" stroke="#FF6D00" strokeWidth="1.5" strokeLinejoin="round" />
              </svg>
            </div>
            <div className={styles.logoText}>
              <span className={styles.logoTitle}>SIC IOT TELEMETRY</span>
              <span className={styles.logoSub}>SMART OFFICE VISUALIZER</span>
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
            MQTT / {mqttStatus.toUpperCase()}
          </div>

          <div className={styles.statusPill}>
            <span className={styles.statusDot} style={{ background: "var(--status-online)" }} />
            <Activity size={11} strokeWidth={2.2} style={{ marginRight: 2 }} />
            LATENCY / {latency}MS
          </div>

          <div className={styles.timeBadge}>{currentTime}</div>
        </div>
      </header>

      {/* ═══ MAIN CONTENT ═══ */}
      <main className={styles.mainContent}>

        {/* ─── STATS ROW (VERIFIABLE SESSION METRICS) ─── */}
        <section className={`${styles.statsRow} ${mounted ? "animate-fade-in-up" : ""}`}>
          <div className={styles.statCard}>
            <div className={styles.statHeader}>
              <span className={styles.statLabel}>TARGET NODE</span>
              <Cpu size={16} strokeWidth={2} style={{ color: "var(--primary)", opacity: 0.8 }} />
            </div>
            <div className={styles.statValue}>
              <span className={styles.statNumber} style={{ fontSize: "24px" }}>ESP32</span>
              <span className={styles.statTotal}>/ SMART OFFICE</span>
            </div>
            <div className={styles.statBar}>
              <div className={styles.statBarFill} style={{ width: "100%", background: "var(--status-online)" }} />
            </div>
            <div className={styles.statMeta} style={{ marginTop: "6px" }}>TOPIC: {activeTopic}</div>
          </div>

          <div className={`${styles.statCard} ${mounted ? "delay-1" : ""}`}>
            <div className={styles.statHeader}>
              <span className={styles.statLabel}>SESSION UPTIME</span>
              <Clock size={16} strokeWidth={2} style={{ color: "var(--primary)", opacity: 0.8 }} />
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
            <div className={styles.statMeta} style={{ marginTop: "6px" }}>ACTIVE INGESTION SESSION</div>
          </div>

          <div className={`${styles.statCard} ${mounted ? "delay-2" : ""}`}>
            <div className={styles.statHeader}>
              <span className={styles.statLabel}>INGESTED PACKETS</span>
              <Layers size={16} strokeWidth={2} style={{ color: "var(--accent)", opacity: 0.8 }} />
            </div>
            <div className={styles.statValue}>
              <span className={styles.statNumber}>{packetsCount.toLocaleString()}</span>
              <span className={styles.statTotal}>pkts</span>
            </div>
            <div className={styles.statBar}>
              <div
                className={styles.statBarFill}
                style={{ width: `${Math.min(packetsCount * 5, 100)}%`, background: "var(--accent)" }}
              />
            </div>
            <div className={styles.statMeta} style={{ marginTop: "6px" }}>
              {packetsCount > 0 ? "STREAMING HARDWARE TELEMETRY" : "WAITING FOR FIRST PACKET"}
            </div>
          </div>

          <div className={`${styles.statCard} ${mounted ? "delay-3" : ""}`}>
            <div className={styles.statHeader}>
              <span className={styles.statLabel}>BROKER GATEWAY</span>
              <Globe2 size={16} strokeWidth={2} style={{ color: "var(--status-online)", opacity: 0.8 }} />
            </div>
            <div className={styles.statValue}>
              <span className={styles.statNumber}>EMQX</span>
              <span className={styles.statTotal}>:8084 WSS</span>
            </div>
            <div className={styles.statBar}>
              <div
                className={styles.statBarFill}
                style={{ width: "100%", background: "var(--status-online)" }}
              />
            </div>
            <div className={styles.statMeta} style={{ marginTop: "6px" }}>WEBSOCKET ENCRYPTED LINK</div>
          </div>
        </section>

        {/* ─── MQTT TELEMETRY CONSUMER LINK BAR (PURE INGESTION) ─── */}
        <section className={`${styles.mqttBanner} ${mounted ? "animate-fade-in-up" : ""}`}>
          <div className={styles.mqttBannerHeader}>
            <div className={styles.mqttTitleGroup}>
              <h3 className={styles.mqttTitle}>
                <Radio size={16} strokeWidth={2} style={{ color: "var(--primary)" }} />
                MQTT TELEMETRY RECEIVER
              </h3>
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
                {mqttStatus === "connected" ? "INGESTING LIVE DATA" : mqttStatus.toUpperCase()}
              </div>
            </div>

            <div className={styles.mqttMetaRow}>
              <div>
                <span className={styles.mqttTag}>BROKER: </span>
                <span className={styles.mqttVal}>{brokerUrl}</span>
              </div>
              <div>
                <span className={styles.mqttTag}>TOPIC: </span>
                <span className={styles.mqttVal}>{activeTopic}</span>
              </div>
              <div>
                <span className={styles.mqttTag}>RX PKTS: </span>
                <span className={styles.mqttVal}>{packetsCount}</span>
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
                    <ChevronUp size={13} strokeWidth={2} /> HIDE CONFIG & FEED
                  </>
                ) : (
                  <>
                    <Sliders size={13} strokeWidth={2} /> MQTT SETTINGS & FEED
                  </>
                )}
              </button>
            </div>
          </div>

          {showConfig && (
            <div className={styles.mqttDrawer}>
              <div className={styles.mqttConfigBox}>
                <div className={styles.mqttInputGroup}>
                  <label className={styles.mqttInputLabel}>EMQX BROKER WSS URL</label>
                  <input
                    type="text"
                    value={brokerUrl}
                    onChange={(e) => setBrokerUrl(e.target.value)}
                    className={styles.mqttInput}
                    placeholder="wss://broker.emqx.io:8084/mqtt"
                  />
                </div>
                <div className={styles.mqttInputGroup}>
                  <label className={styles.mqttInputLabel}>SUBSCRIBED TOPIC</label>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <input
                      type="text"
                      value={topicInput}
                      onChange={(e) => setTopicInput(e.target.value)}
                      className={styles.mqttInput}
                      placeholder="JASUN/smart-office/monitor"
                    />
                    <button
                      type="button"
                      className={styles.mqttBtn}
                      onClick={() => setActiveTopic(topicInput)}
                    >
                      SUBSCRIBE
                    </button>
                  </div>
                </div>
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "4px" }}>
                  <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>Presets:</span>
                  <button
                    type="button"
                    className={styles.mqttBtn}
                    style={{ padding: "3px 8px", fontSize: "10px", display: "inline-flex", alignItems: "center", gap: "4px" }}
                    onClick={() => {
                      setTopicInput("JASUN/smart-office/monitor");
                      setActiveTopic("JASUN/smart-office/monitor");
                    }}
                  >
                    <MapPin size={11} strokeWidth={2} /> JASUN/smart-office/monitor
                  </button>
                  <button
                    type="button"
                    className={styles.mqttBtn}
                    style={{ padding: "3px 8px", fontSize: "10px", display: "inline-flex", alignItems: "center", gap: "4px" }}
                    onClick={() => {
                      setTopicInput("JASUN/smart-office/#");
                      setActiveTopic("JASUN/smart-office/#");
                    }}
                  >
                    <MapPin size={11} strokeWidth={2} /> JASUN/smart-office/#
                  </button>
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
                      Menunggu pesan masuk dari hardware pada topic <span style={{ color: "var(--primary)" }}>{activeTopic}</span>...
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

        {/* ─── SENSOR GRID HEADER ─── */}
        <section className={styles.sectionHeader}>
          <div className={styles.sectionLine} />
          <h2 className={styles.sectionTitle}>
            <Activity size={13} strokeWidth={2.5} style={{ color: "var(--primary)" }} />
            HARDWARE SENSORS TELEMETRY
            <span className={styles.sectionBadge}>ESP32 STREAM</span>
          </h2>
          <div className={styles.sectionLine} />
        </section>

        {/* ─── 4 CORE SENSORS (FROM HARDWARE PAYLOAD) ─── */}
        <section className={styles.sensorGrid} style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}>
          {/* Card 1: Temperature */}
          <div className={`${styles.sensorCard} ${mounted ? "animate-fade-in-up delay-1" : ""}`}>
            <div className={styles.sensorHeader}>
              <div className={styles.sensorTitleRow}>
                <Thermometer size={16} strokeWidth={2} style={{ color: "var(--primary)" }} />
                <span className={styles.sensorLabel}>ROOM TEMPERATURE</span>
              </div>
              <span
                className={styles.sensorStatus}
                style={{
                  color: currentTemp > 35 ? "var(--status-critical)" : currentTemp > 28 ? "var(--primary)" : "var(--status-online)",
                  borderColor: currentTemp > 35 ? "var(--status-critical)" : currentTemp > 28 ? "var(--primary)" : "var(--status-online)",
                }}
              >
                <span
                  className={styles.statusDotSmall}
                  style={{
                    background: currentTemp > 35 ? "var(--status-critical)" : currentTemp > 28 ? "var(--primary)" : "var(--status-online)",
                  }}
                />
                {currentTemp > 35 ? "HIGH HEAT" : currentTemp > 28 ? "WARM" : "OPTIMAL"}
              </span>
            </div>

            <div className={styles.sensorBody}>
              <div className={styles.sensorValueRow}>
                <span className={styles.sensorValue}>{currentTemp.toFixed(1)}</span>
                <span className={styles.sensorUnit}>°C</span>
              </div>
              {tempSensor && <Sparkline data={tempSensor.trend} color="#FFAB00" />}
            </div>

            <div className={styles.sensorFooter}>
              <span className={styles.sensorRange}>
                {tempSensor?.lastUpdated ? `LAST UPDATE: ${tempSensor.lastUpdated}` : "MIN 0°C / MAX 100°C"}
              </span>
              <span
                className={styles.sensorId}
                style={{ color: "var(--status-online)", fontWeight: 600 }}
              >
                ● MQTT LIVE
              </span>
            </div>
            <div className={styles.sensorGlow} />
          </div>

          {/* Card 2: Humidity */}
          <div className={`${styles.sensorCard} ${mounted ? "animate-fade-in-up delay-2" : ""}`}>
            <div className={styles.sensorHeader}>
              <div className={styles.sensorTitleRow}>
                <Droplets size={16} strokeWidth={2} style={{ color: "#00E676" }} />
                <span className={styles.sensorLabel}>ROOM HUMIDITY</span>
              </div>
              <span
                className={styles.sensorStatus}
                style={{
                  color: currentHum > 75 ? "var(--status-warning)" : "var(--status-online)",
                  borderColor: currentHum > 75 ? "var(--status-warning)" : "var(--status-online)",
                }}
              >
                <span
                  className={styles.statusDotSmall}
                  style={{ background: currentHum > 75 ? "var(--status-warning)" : "var(--status-online)" }}
                />
                {currentHum > 75 ? "HIGH MOISTURE" : currentHum < 40 ? "DRY" : "COMFORTABLE"}
              </span>
            </div>

            <div className={styles.sensorBody}>
              <div className={styles.sensorValueRow}>
                <span className={styles.sensorValue}>{currentHum.toFixed(1)}</span>
                <span className={styles.sensorUnit}>%</span>
              </div>
              {humSensor && <Sparkline data={humSensor.trend} color="#00E676" />}
            </div>

            <div className={styles.sensorFooter}>
              <span className={styles.sensorRange}>
                {humSensor?.lastUpdated ? `LAST UPDATE: ${humSensor.lastUpdated}` : "MIN 0% / MAX 100%"}
              </span>
              <span
                className={styles.sensorId}
                style={{ color: "var(--status-online)", fontWeight: 600 }}
              >
                ● MQTT LIVE
              </span>
            </div>
            <div className={styles.sensorGlow} />
          </div>

          {/* Card 3: Room Presence / PIR Occupancy */}
          <div className={`${styles.sensorCard} ${mounted ? "animate-fade-in-up delay-3" : ""}`}>
            <div className={styles.sensorHeader}>
              <div className={styles.sensorTitleRow}>
                <UserCheck size={16} strokeWidth={2} style={{ color: currentPresence > 0 ? "var(--primary)" : "var(--text-muted)" }} />
                <span className={styles.sensorLabel}>PIR OCCUPANCY</span>
              </div>
              <span
                className={styles.sensorStatus}
                style={{
                  color: currentPresence > 0 ? "var(--primary)" : "var(--text-muted)",
                  borderColor: currentPresence > 0 ? "var(--primary)" : "var(--border)",
                }}
              >
                <span
                  className={styles.statusDotSmall}
                  style={{ background: currentPresence > 0 ? "var(--primary)" : "var(--text-muted)" }}
                />
                {currentPresence > 0 ? "OCCUPIED" : "VACANT"}
              </span>
            </div>

            <div className={styles.sensorBody}>
              <div className={styles.sensorValueRow}>
                <span
                  className={styles.sensorValue}
                  style={{
                    color: currentPresence > 0 ? "var(--primary)" : "var(--text-secondary)",
                    fontSize: "26px",
                  }}
                >
                  {currentPresence > 0 ? "DETECTED" : "EMPTY"}
                </span>
                <span className={styles.sensorUnit}>
                  {currentPresence > 0 ? "ROOM ACTIVE" : "STANDBY"}
                </span>
              </div>
              {presenceSensor && <Sparkline data={presenceSensor.trend} color="#FF6D00" />}
            </div>

            <div className={styles.sensorFooter}>
              <span className={styles.sensorRange}>
                RAW VALUE: {currentPresence} (PIR DIGITAL/ANALOG)
              </span>
              <span
                className={styles.sensorId}
                style={{ color: "var(--status-online)", fontWeight: 600 }}
              >
                ● MQTT LIVE
              </span>
            </div>
            <div className={styles.sensorGlow} />
          </div>

          {/* Card 4: Light ADC */}
          <div className={`${styles.sensorCard} ${mounted ? "animate-fade-in-up delay-4" : ""}`}>
            <div className={styles.sensorHeader}>
              <div className={styles.sensorTitleRow}>
                <SunMedium size={16} strokeWidth={2} style={{ color: "var(--primary)" }} />
                <span className={styles.sensorLabel}>AMBIENT LIGHT (LDR)</span>
              </div>
              <span
                className={styles.sensorStatus}
                style={{ color: "var(--primary)", borderColor: "var(--primary)" }}
              >
                <span className={styles.statusDotSmall} style={{ background: "var(--primary)" }} />
                {getLightDescription(currentLight)}
              </span>
            </div>

            <div className={styles.sensorBody}>
              <div className={styles.sensorValueRow}>
                <span className={styles.sensorValue}>{currentLight}</span>
                <span className={styles.sensorUnit}>/ 4095 ADC</span>
              </div>
              {lightSensor && <Sparkline data={lightSensor.trend} color="#FFAB00" />}
            </div>

            <div className={styles.sensorFooter}>
              <span className={styles.sensorRange}>
                INTENSITY: {Math.round((currentLight / 4095) * 100)}% ILLUMINATION
              </span>
              <span
                className={styles.sensorId}
                style={{ color: "var(--status-online)", fontWeight: 600 }}
              >
                ● MQTT LIVE
              </span>
            </div>
            <div className={styles.sensorGlow} />
          </div>
        </section>

        {/* ─── SMART OFFICE ACTUATORS / RELAYS TELEMETRY ─── */}
        <section className={styles.sectionHeader} style={{ marginTop: "var(--space-lg)" }}>
          <div className={styles.sectionLine} />
          <h2 className={styles.sectionTitle}>
            <Sliders size={13} strokeWidth={2.5} style={{ color: "var(--primary)" }} />
            HARDWARE ACTUATORS & RELAYS
            <span className={styles.sectionBadge}>STATUS MONITOR</span>
          </h2>
          <div className={styles.sectionLine} />
        </section>

        <section className={`${styles.actuatorGrid} ${mounted ? "animate-fade-in-up" : ""}`}>
          {/* Actuator 1: Lamp */}
          <div
            className={`${styles.actuatorCard} ${
              actuators.lamp ? styles.actuatorCardActive : ""
            }`}
          >
            <div className={styles.actuatorTop}>
              <div
                className={styles.actuatorIconWrap}
                style={{
                  background: actuators.lamp ? "rgba(255, 171, 0, 0.15)" : "rgba(255, 255, 255, 0.03)",
                  borderColor: actuators.lamp ? "var(--primary)" : "var(--border)",
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
                  background: actuators.lamp ? "rgba(255, 171, 0, 0.2)" : "rgba(255, 255, 255, 0.05)",
                  color: actuators.lamp ? "var(--primary)" : "var(--text-muted)",
                  border: `1px solid ${actuators.lamp ? "var(--primary)" : "var(--border)"}`,
                }}
              >
                {actuators.lamp ? "RELAY ON" : "RELAY OFF"}
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
          </div>

          {/* Actuator 2: Fan */}
          <div
            className={`${styles.actuatorCard} ${
              actuators.fan ? styles.actuatorCardFanActive : ""
            }`}
          >
            <div className={styles.actuatorTop}>
              <div
                className={styles.actuatorIconWrap}
                style={{
                  background: actuators.fan ? "rgba(0, 230, 118, 0.15)" : "rgba(255, 255, 255, 0.03)",
                  borderColor: actuators.fan ? "var(--status-online)" : "var(--border)",
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
                  background: actuators.fan ? "rgba(0, 230, 118, 0.2)" : "rgba(255, 255, 255, 0.05)",
                  color: actuators.fan ? "var(--status-online)" : "var(--text-muted)",
                  border: `1px solid ${actuators.fan ? "var(--status-online)" : "var(--border)"}`,
                }}
              >
                {actuators.fan ? "VENTILATION ACTIVE" : "VENTILATION IDLE"}
              </span>
            </div>
            <div className={styles.actuatorName}>EXHAUST & COOLING FAN</div>
            <div className={styles.actuatorDesc}>
              {actuators.fan
                ? "Kipas ventilasi udara aktif berputar (Sirkulasi & Pendinginan Ruangan)."
                : "Kipas ventilasi udara berhenti / idle."}
            </div>
            <div className={styles.actuatorFooter}>
              <span>PAYLOAD: &quot;fan&quot;: {String(actuators.fan)}</span>
              <span style={{ color: actuators.fan ? "var(--status-online)" : "var(--text-muted)" }}>
                {actuators.fan ? "● RUNNING" : "○ STOPPED"}
              </span>
            </div>
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
                  background: actuators.alarm ? "rgba(255, 82, 82, 0.25)" : "rgba(255, 255, 255, 0.03)",
                  borderColor: actuators.alarm ? "var(--status-critical)" : "var(--border)",
                }}
              >
                <BellRing
                  size={22}
                  strokeWidth={1.8}
                  className={actuators.alarm ? "alarm-pulse" : ""}
                  style={{ color: actuators.alarm ? "var(--status-critical)" : "var(--text-muted)" }}
                />
              </div>
              <span
                className={styles.actuatorBadge}
                style={{
                  background: actuators.alarm ? "rgba(255, 82, 82, 0.3)" : "rgba(255, 255, 255, 0.05)",
                  color: actuators.alarm ? "var(--status-critical)" : "var(--text-muted)",
                  border: `1px solid ${actuators.alarm ? "var(--status-critical)" : "var(--border)"}`,
                }}
              >
                {actuators.alarm ? "ALARM TRIGGERED" : "ALARM SECURE"}
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
              <span style={{ color: actuators.alarm ? "var(--status-critical)" : "var(--text-muted)" }}>
                {actuators.alarm ? "● ALERT!" : "○ SECURE"}
              </span>
            </div>
          </div>
        </section>

        {/* ─── LIVE STREAM TIMELINE & INGESTION INSPECTOR ─── */}
        <div className={styles.middleRow} style={{ marginTop: "var(--space-lg)" }}>
          {/* Left: Live Multi-Metric Timeline Chart */}
          <div className={`${styles.panel} ${styles.telemetryChartPanel} ${mounted ? "animate-fade-in-up delay-3" : ""}`}>
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

        {/* ─── BOTTOM ROW: SYSTEM LOG & TOPOLOGY ─── */}
        <div className={styles.bottomRow} style={{ marginTop: "var(--space-lg)" }}>
          {/* System Log */}
          <div className={`${styles.panel} ${styles.logPanel} ${mounted ? "animate-fade-in-up delay-5" : ""}`}>
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

          {/* Network Topology */}
          <div className={`${styles.panel} ${mounted ? "animate-fade-in-up delay-5" : ""}`}>
            <div className={styles.panelHeader}>
              <h3 className={styles.panelTitle}>
                <Network size={14} strokeWidth={2} style={{ color: "var(--primary)" }} />
                NETWORK & DATA FLOW TOPOLOGY
              </h3>
              <span className={styles.panelBadge}>BROKER WSS ACTIVE</span>
            </div>
            <div className={styles.topologyMap}>
              <TopologyVisualization />
            </div>
          </div>
        </div>

        {/* ─── FOOTER ─── */}
        <footer className={styles.dashFooter}>
          <div className={styles.footerGroup}>
            <span className={styles.footerTag}>SIC IOT PLATFORM v2.4.2</span>
            <span className={styles.footerSep}>|</span>
            <span className={styles.footerTag}>TACTICAL MONITORING</span>
          </div>
          <div className={styles.footerGroup}>
            <span className={styles.footerTag}>PURE CONSUMER MODE</span>
            <span className={styles.footerSep}>|</span>
            <span className={styles.footerTag}>TOPIC: {activeTopic}</span>
          </div>
          <div className={styles.footerGroup}>
            <span className={styles.footerTag}>EMQX WSS</span>
            <span className={styles.footerSep}>|</span>
            <span className={styles.footerTag}>SESSION ACTIVE</span>
          </div>
        </footer>
      </main>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   TOPOLOGY SVG VISUALIZATION
   ═══════════════════════════════════════════════════ */
function TopologyVisualization() {
  const nodes = [
    { id: "GW", x: 150, y: 55, label: "EMQX WSS", type: "gateway" as const },
    { id: "N1", x: 60, y: 125, label: "ESP32-NODE", type: "node" as const },
    { id: "N2", x: 150, y: 145, label: "JASUN-OFFICE", type: "node" as const },
    { id: "N3", x: 240, y: 125, label: "ACTUATORS", type: "node" as const },
    { id: "S1", x: 30, y: 195, label: "TEMP-C", type: "sensor" as const },
    { id: "S2", x: 100, y: 205, label: "HUM-PCT", type: "sensor" as const },
    { id: "S3", x: 150, y: 215, label: "PIR-PRES", type: "sensor" as const },
    { id: "S4", x: 200, y: 205, label: "LIGHT-ADC", type: "sensor" as const },
    { id: "S5", x: 270, y: 195, label: "RELAYS", type: "sensor" as const },
  ];

  const edges: [string, string][] = [
    ["GW", "N1"], ["GW", "N2"], ["GW", "N3"],
    ["N1", "S1"], ["N1", "S2"],
    ["N2", "S3"],
    ["N3", "S4"], ["N3", "S5"],
    ["N1", "N2"], ["N2", "N3"],
  ];

  const nodeMap = Object.fromEntries(nodes.map((n) => [n.id, n]));

  return (
    <svg width="100%" height="240" viewBox="0 0 300 240" className={styles.topologySvg}>
      <defs>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Edges */}
      {edges.map(([from, to], i) => {
        const a = nodeMap[from];
        const b = nodeMap[to];
        return (
          <line
            key={`edge-${i}`}
            x1={a.x}
            y1={a.y}
            x2={b.x}
            y2={b.y}
            stroke="rgba(255, 171, 0, 0.2)"
            strokeWidth="1"
            strokeDasharray="4 4"
          >
            <animate
              attributeName="stroke-dashoffset"
              from="0"
              to="-8"
              dur="1s"
              repeatCount="indefinite"
            />
          </line>
        );
      })}

      {/* Nodes */}
      {nodes.map((node) => {
        const r = node.type === "gateway" ? 14 : node.type === "node" ? 10 : 6;
        const rOuter = node.type === "gateway" ? 18 : node.type === "node" ? 14 : 9;
        const rAnimate = node.type === "gateway" ? "18;22;18" : node.type === "node" ? "14;17;14" : "9;12;9";
        const color =
          node.type === "gateway"
            ? "#FFAB00"
            : node.type === "node"
            ? "#FF6D00"
            : "#00E676";
        const outerStroke =
          node.type === "gateway"
            ? "rgba(255,171,0,0.3)"
            : node.type === "node"
            ? "rgba(255,109,0,0.2)"
            : "rgba(0,230,118,0.15)";
        const textY = node.type === "gateway" ? node.y - 22 : node.type === "node" ? node.y - 16 : node.y + 18;

        return (
          <g key={node.id}>
            {/* Pulsing outer ring */}
            <circle
              cx={node.x}
              cy={node.y}
              r={rOuter}
              fill="none"
              stroke={outerStroke}
              strokeWidth="1"
            >
              <animate
                attributeName="r"
                values={rAnimate}
                dur="2s"
                repeatCount="indefinite"
              />
              <animate
                attributeName="opacity"
                values="0.6;0.1;0.6"
                dur="2s"
                repeatCount="indefinite"
              />
            </circle>

            {/* Core circle */}
            <circle
              cx={node.x}
              cy={node.y}
              r={r}
              fill={color}
              filter="url(#glow)"
              opacity={node.type === "sensor" ? 0.9 : 1}
            />

            {/* Inner dot for gateway */}
            {node.type === "gateway" && (
              <circle cx={node.x} cy={node.y} r={4} fill="#0A0E14" />
            )}

            {/* Label */}
            <text
              x={node.x}
              y={textY}
              textAnchor="middle"
              fill={node.type === "sensor" ? "var(--text-muted)" : "var(--text-secondary)"}
              fontSize={node.type === "gateway" ? "9" : "8"}
              fontFamily="var(--font-mono-custom)"
              letterSpacing="0.08em"
            >
              {node.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
