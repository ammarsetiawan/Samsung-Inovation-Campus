export interface SensorData {
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

export interface LogEntry {
  time: string;
  node: string;
  message: string;
  level: "info" | "warn" | "error";
}

export interface MqttPacket {
  time: string;
  topic: string;
  payload: string;
}

export interface HistoryPoint {
  time: string;
  temp: number;
  hum: number;
  light: number;
}

export interface ActuatorState {
  lamp: boolean;
  fan: boolean;
  alarm: boolean;
}

export type ControlMode = "auto" | "manual";

export type MqttStatus = "connected" | "connecting" | "offline" | "error";

export interface DecodedPayload {
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
}
