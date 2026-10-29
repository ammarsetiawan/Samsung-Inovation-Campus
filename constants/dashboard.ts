import type { SensorData, LogEntry } from "@/types/dashboard";

export const INITIAL_SENSORS: SensorData[] = [
  {
    id: "temp-01",
    label: "ROOM TEMPERATURE",
    value: 0,
    unit: "°C",
    min: 0,
    max: 100,
    status: "offline",
    trend: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    description: "Thermal sensor (DHT/DS18B20/SHTC3)",
  },
  {
    id: "hum-01",
    label: "ROOM HUMIDITY",
    value: 0,
    unit: "%",
    min: 0,
    max: 100,
    status: "offline",
    trend: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
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
    value: 0,
    unit: "ADC",
    min: 0,
    max: 4095,
    status: "offline",
    trend: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    description: "Light dependent resistor 12-bit ADC",
  },
];

export const INITIAL_LOGS: LogEntry[] = [
  {
    time: "INIT",
    node: "MQTT",
    message: "Connecting to wss://broker.hivemq.com:8884/mqtt",
    level: "info",
  },
  {
    time: "INIT",
    node: "TOPIC",
    message: "Subscribing to JASUN/smart-office/monitors",
    level: "info",
  },
  {
    time: "INIT",
    node: "MODE",
    message: "Read-only consumer initialized : Listening for hardware stream",
    level: "info",
  },
];
