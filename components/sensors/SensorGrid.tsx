"use client";

import { Activity, Thermometer, Droplets, UserCheck, SunMedium } from "lucide-react";
import { styles } from "@/lib/styles";
import { Sparkline } from "@/components/common/Sparkline";
import type { SensorData } from "@/types/dashboard";

interface SensorGridProps {
  sensors: SensorData[];
  mounted: boolean;
  /** True jika sudah ada minimal 1 paket telemetri diterima dari ESP32 */
  hasReceivedData?: boolean;
}

export function SensorGrid({ sensors, mounted, hasReceivedData = false }: SensorGridProps) {
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
    <>
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
      <section className={styles.sensorGrid}>
        {/* Card 1: Temperature */}
        <div className={`${styles.sensorCard} ${mounted ? "animate-fade-in-up delay-1" : ""}`}>
          <div className={styles.sensorHeader}>
            <div className={styles.sensorTitleRow}>
              <Thermometer size={15} strokeWidth={2.2} style={{ color: "var(--primary)" }} />
              <span className={styles.sensorLabel}>ROOM TEMPERATURE</span>
            </div>
            <span
              className={styles.sensorStatus}
              style={{
                color:
                  !hasReceivedData || tempSensor?.status === "offline" ? "var(--text-muted)"
                  : currentTemp > 35 ? "var(--status-critical)"
                    : currentTemp > 28 ? "var(--primary)" : "var(--status-online)",
                borderColor:
                  !hasReceivedData || tempSensor?.status === "offline" ? "var(--border)"
                  : currentTemp > 35 ? "var(--status-critical)"
                    : currentTemp > 28 ? "var(--primary)" : "var(--status-online)",
                background:
                  !hasReceivedData || tempSensor?.status === "offline" ? "rgba(255,255,255,0.02)"
                  : currentTemp > 35 ? "rgba(255,82,82,0.1)"
                    : currentTemp > 28 ? "rgba(255,171,0,0.1)" : "rgba(0,230,118,0.1)",
              }}
            >
              <span
                className={styles.statusDotSmall}
                style={{
                  background:
                    !hasReceivedData || tempSensor?.status === "offline" ? "var(--text-muted)"
                    : currentTemp > 35 ? "var(--status-critical)"
                      : currentTemp > 28 ? "var(--primary)" : "var(--status-online)",
                }}
              />
              {!hasReceivedData || tempSensor?.status === "offline"
                ? "AWAITING DATA"
                : currentTemp > 35 ? "CRITICAL HEAT" : currentTemp > 28 ? "WARM" : "OPTIMAL"}
            </span>
          </div>

          <div className={styles.sensorBody}>
            <div className={styles.sensorValueRow}>
              <span className={styles.sensorValue}>{currentTemp.toFixed(1)}</span>
              <span className={styles.sensorUnit}>°C</span>
            </div>
            {tempSensor && <Sparkline data={tempSensor.trend} color="#FFAB00" />}
          </div>

          {/* Thermal Scale Gauge */}
          <div className={styles.sensorScaleWrap}>
            <div className={styles.sensorScaleTrack}>
              <div
                className={styles.sensorScaleFill}
                style={{
                  width: `${Math.min(Math.max((currentTemp / 50) * 100, 0), 100)}%`,
                  background:
                    currentTemp > 35
                      ? "linear-gradient(90deg, #FFAB00, #FF5252)"
                      : "linear-gradient(90deg, #00E676, #FFAB00)",
                }}
              />
            </div>
            <div className={styles.sensorScaleLabels}>
              <span>0°C (COLD)</span>
              <span style={{ color: "var(--status-online)" }}>24°C COMFORT</span>
              <span>50°C (HIGH)</span>
            </div>
          </div>

          <div className={styles.sensorFooter}>
            <span className={styles.sensorRange}>
              {tempSensor?.lastUpdated ? `LAST: ${tempSensor.lastUpdated}` : "RANGE: 0°C — 100°C"}
            </span>
            <span className={styles.sensorId}>DHT/SHTC3 • ACTIVE</span>
          </div>
          <div className={styles.sensorGlow} />
        </div>

        {/* Card 2: Humidity */}
        <div className={`${styles.sensorCard} ${mounted ? "animate-fade-in-up delay-2" : ""}`}>
          <div className={styles.sensorHeader}>
            <div className={styles.sensorTitleRow}>
              <Droplets size={15} strokeWidth={2.2} style={{ color: "#00E676" }} />
              <span className={styles.sensorLabel}>RELATIVE HUMIDITY</span>
            </div>
            <span
              className={styles.sensorStatus}
              style={{
                color:
                  !hasReceivedData || humSensor?.status === "offline" ? "var(--text-muted)"
                  : currentHum > 75 ? "var(--status-warning)"
                    : currentHum < 40 ? "var(--primary)" : "var(--status-online)",
                borderColor:
                  !hasReceivedData || humSensor?.status === "offline" ? "var(--border)"
                  : currentHum > 75 ? "var(--status-warning)"
                    : currentHum < 40 ? "var(--primary)" : "var(--status-online)",
                background:
                  !hasReceivedData || humSensor?.status === "offline" ? "rgba(255,255,255,0.02)"
                  : currentHum > 75 ? "rgba(255,171,0,0.1)" : "rgba(0,230,118,0.1)",
              }}
            >
              <span
                className={styles.statusDotSmall}
                style={{
                  background: !hasReceivedData || humSensor?.status === "offline" ? "var(--text-muted)"
                    : currentHum > 75 ? "var(--status-warning)" : "var(--status-online)",
                }}
              />
              {!hasReceivedData || humSensor?.status === "offline"
                ? "AWAITING DATA"
                : currentHum > 75 ? "HIGH MOISTURE" : currentHum < 40 ? "DRY AIR" : "COMFORTABLE"}
            </span>
          </div>

          <div className={styles.sensorBody}>
            <div className={styles.sensorValueRow}>
              <span className={styles.sensorValue}>{currentHum.toFixed(1)}</span>
              <span className={styles.sensorUnit}>% RH</span>
            </div>
            {humSensor && <Sparkline data={humSensor.trend} color="#00E676" />}
          </div>

          {/* Moisture Scale Gauge */}
          <div className={styles.sensorScaleWrap}>
            <div className={styles.sensorScaleTrack}>
              <div
                className={styles.sensorScaleFill}
                style={{
                  width: `${Math.min(Math.max(currentHum, 0), 100)}%`,
                  background:
                    currentHum < 40
                      ? "linear-gradient(90deg, #FF6D00, #FFAB00)"
                      : currentHum > 75
                        ? "linear-gradient(90deg, #00E676, #FFAB00)"
                        : "linear-gradient(90deg, #00E676, #00B0FF)",
                }}
              />
            </div>
            <div className={styles.sensorScaleLabels}>
              <span>0% (DRY)</span>
              <span style={{ color: "var(--status-online)" }}>40% — 70% TARGET</span>
              <span>100% (SATURATED)</span>
            </div>
          </div>

          <div className={styles.sensorFooter}>
            <span className={styles.sensorRange}>
              {humSensor?.lastUpdated ? `LAST: ${humSensor.lastUpdated}` : "RANGE: 0% — 100%"}
            </span>
            <span className={styles.sensorId}>CAPACITIVE • ACTIVE</span>
          </div>
          <div className={styles.sensorGlow} />
        </div>

        {/* Card 3: Room Presence / PIR Occupancy */}
        <div className={`${styles.sensorCard} ${mounted ? "animate-fade-in-up delay-3" : ""}`}>
          <div className={styles.sensorHeader}>
            <div className={styles.sensorTitleRow}>
              <UserCheck
                size={15}
                strokeWidth={2.2}
                style={{ color: currentPresence > 0 ? "var(--primary)" : "var(--text-muted)" }}
              />
              <span className={styles.sensorLabel}>PIR OCCUPANCY</span>
            </div>
            <span
              className={styles.sensorStatus}
              style={{
                color: currentPresence > 0 ? "var(--status-online)" : "var(--text-muted)",
                borderColor: currentPresence > 0 ? "var(--status-online)" : "var(--border)",
                background: currentPresence > 0 ? "rgba(0,230,118,0.12)" : "rgba(255,255,255,0.02)",
              }}
            >
              <span
                className={styles.statusDotSmall}
                style={{
                  background: currentPresence > 0 ? "var(--status-online)" : "var(--text-muted)",
                }}
              />
              {currentPresence > 0 ? "OCCUPIED" : "VACANT"}
            </span>
          </div>

          <div className={styles.sensorBody}>
            <div className={styles.sensorValueRow}>
              <span
                className={styles.sensorValue}
                style={{
                  color: currentPresence > 0 ? "var(--status-online)" : "var(--text-secondary)",
                  fontSize: "28px",
                }}
              >
                {currentPresence > 0 ? "TERDETEKSI" : "KOSONG"}
              </span>
              <span className={styles.sensorUnit} style={{ fontSize: "11px", letterSpacing: "0.1em" }}>
                {currentPresence > 0 ? "/ ORANG HADIR" : "/ RUANG KOSONG"}
              </span>
            </div>
            {presenceSensor && (
              <Sparkline
                data={presenceSensor.trend}
                color={currentPresence > 0 ? "#FF6D00" : "#4B5563"}
              />
            )}
          </div>

          {/* Visual Radar Presence Beacon */}
          <div className={styles.sensorRadarBox}>
            <div className={styles.sensorRadarBeacon}>
              <span
                className={`${styles.sensorRadarDot} ${currentPresence > 0 ? styles.radarActive : ""}`}
                style={{
                  background: currentPresence > 0 ? "var(--status-online)" : "var(--text-muted)",
                }}
              />
              {currentPresence > 0 && <span className={styles.sensorRadarRing} />}
            </div>
            <span className={styles.sensorRadarText}>
              {currentPresence > 0
                ? "PIR Digital HIGH: Sensor memicu relay lampu & kipas"
                : "PIR Digital LOW: Tidak ada gerakan terdeteksi"}
            </span>
          </div>

          <div className={styles.sensorFooter}>
            <span className={styles.sensorRange}>
              PIN SIGNAL: {currentPresence > 0 ? "HIGH (1)" : "LOW (0)"}
            </span>
            <span className={styles.sensorId}>PIR RADAR • ACTIVE</span>
          </div>
          <div className={styles.sensorGlow} />
        </div>

        {/* Card 4: Light ADC */}
        <div className={`${styles.sensorCard} ${mounted ? "animate-fade-in-up delay-4" : ""}`}>
          <div className={styles.sensorHeader}>
            <div className={styles.sensorTitleRow}>
              <SunMedium size={15} strokeWidth={2.2} style={{ color: "var(--primary)" }} />
              <span className={styles.sensorLabel}>AMBIENT LIGHT (LDR)</span>
            </div>
            <span
              className={styles.sensorStatus}
              style={{
                color: !hasReceivedData || lightSensor?.status === "offline" ? "var(--text-muted)" : currentLight > 2500 ? "var(--primary)" : "var(--text-secondary)",
                borderColor: !hasReceivedData || lightSensor?.status === "offline" ? "var(--border)" : currentLight > 2500 ? "var(--primary)" : "var(--border)",
                background: !hasReceivedData || lightSensor?.status === "offline" ? "rgba(255,255,255,0.02)" : currentLight > 2500 ? "rgba(255,171,0,0.12)" : "rgba(255,255,255,0.02)",
              }}
            >
              <span
                className={styles.statusDotSmall}
                style={{
                  background: !hasReceivedData || lightSensor?.status === "offline" ? "var(--text-muted)" : currentLight > 2500 ? "var(--primary)" : "var(--text-muted)",
                }}
              />
              {!hasReceivedData || lightSensor?.status === "offline" ? "AWAITING DATA" : getLightDescription(currentLight)}
            </span>
          </div>

          <div className={styles.sensorBody}>
            <div className={styles.sensorValueRow}>
              <span className={styles.sensorValue}>{currentLight}</span>
              <span className={styles.sensorUnit}>/ 4095 ADC</span>
            </div>
            {lightSensor && <Sparkline data={lightSensor.trend} color="#FFAB00" />}
          </div>

          {/* Illumination Meter */}
          <div className={styles.sensorScaleWrap}>
            <div className={styles.sensorScaleTrack}>
              <div
                className={styles.sensorScaleFill}
                style={{
                  width: `${Math.min(Math.max((currentLight / 4095) * 100, 0), 100)}%`,
                  background: "linear-gradient(90deg, #FF6D00, #FFAB00)",
                }}
              />
            </div>
            <div className={styles.sensorScaleLabels}>
              <span>0 (GELAP)</span>
              <span>2000 (INDOOR)</span>
              <span>4095 (TERANG)</span>
            </div>
          </div>

          <div className={styles.sensorFooter}>
            <span className={styles.sensorRange}>
              INTENSITY: {Math.round((currentLight / 4095) * 100)}% LUX
            </span>
            <span className={styles.sensorId}>PHOTO-RESISTOR • ACTIVE</span>
          </div>
          <div className={styles.sensorGlow} />
        </div>
      </section>
    </>
  );
}
