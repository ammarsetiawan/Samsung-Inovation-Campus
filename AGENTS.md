# AGENTS.md — SIC IoT Dashboard: Tactical Monitoring System

> Panduan untuk AI agents yang bekerja pada codebase ini. Baca seluruh file ini sebelum melakukan perubahan apapun.

---

## Gambaran Umum Proyek

**SIC IoT Dashboard** adalah dashboard monitoring IoT real-time berbasis web dengan tampilan taktis/militer. Dashboard ini dikembangkan sebagai bagian dari **Samsung Innovation Campus (SIC)** dan dirancang untuk memvisualisasikan data sensor dari perangkat **ESP32** melalui protokol **MQTT**.

- **Framework**: Next.js 16.4.2 (App Router)
- **Runtime**: React 19
- **Bahasa**: TypeScript
- **Styling**: Tailwind CSS v4 (via `@tailwindcss/turbopack`) + Vanilla CSS (`globals.css`)
- **Build Tool**: Turbopack

---

## Tech Stack & Dependensi Kunci

| Paket | Versi | Kegunaan |
|---|---|---|
| `next` | 16.4.2 | Framework utama (App Router) |
| `react` / `react-dom` | 19.3.0 | UI library |
| `mqtt` | ^5.16.1 | Koneksi MQTT over WebSocket |
| `lucide-react` | ^1.61.0 | Icon library |
| `tailwindcss` | ^4 | Utility CSS (via Turbopack) |
| `typescript` | ^5 | Type safety |

---

---

## Struktur Direktori

```
project_sic/
├── app/
│   ├── layout.tsx                  # Root layout: font config (Rajdhani + JetBrains Mono), metadata
│   ├── page.tsx                    # Controller utama: MQTT ingestion, state management, orchestration
│   └── globals.css                 # Semua CSS custom — class mapping, design tokens, animasi
├── components/
│   ├── common/
│   │   ├── GridBackground.tsx      # Canvas animasi dot-grid
│   │   └── Sparkline.tsx           # Mini SVG sparkline chart
│   ├── layout/
│   │   ├── TopBar.tsx              # Header top bar navigasi & live connection status
│   │   └── Footer.tsx              # Footer taktis platform
│   ├── overview/
│   │   ├── StatsRow.tsx            # Node ESP32, Uptime, Packets, Automation mode
│   │   └── MqttBanner.tsx          # MQTT connection link bar + collapsible drawer
│   ├── sensors/
│   │   └── SensorGrid.tsx          # 4 kartu sensor hardware (Temp, Hum, PIR, Light)
│   ├── actuators/
│   │   └── ActuatorGrid.tsx        # Kontrol aktuator relay (Lamp, Fan, Alarm) + Mode Bar
│   ├── telemetry/
│   │   ├── LiveTelemetryChart.tsx  # SVG multi-metrik timeline chart
│   │   └── TelemetrySection.tsx    # Live chart & Latest Packet Inspector table
│   └── logs/
│       ├── TelemetryDiagnostics.tsx# Panel kalkulasi metrik session hardware
│       └── LogsSection.tsx         # Terminal log real-time & session diagnostics
├── types/
│   └── dashboard.ts                # Definisi TypeScript interface & type alias
├── constants/
│   └── dashboard.ts                # Initial state konstanta (INITIAL_SENSORS, INITIAL_LOGS)
├── lib/
│   └── styles.ts                   # CLASS_MAP dan styles proxy
├── public/                         # Aset statis
├── AGENTS.md                       # File ini
├── CLAUDE.md                       # Instruksi untuk Claude AI agent
├── DESIGN.md                       # Design system spec (color tokens, typography, dll)
├── next.config.ts                  # Konfigurasi Next.js (Turbopack, experimental features)
├── package.json                    # Dependencies
└── tsconfig.json                   # TypeScript config
```

---

## Arsitektur Kode

Aplikasi diorganisir secara modular dengan `app/page.tsx` bertindak sebagai controller utama yang mengorkestrasi koneksi MQTT, parsing data realtime, dan me-render komponen terpisah:

### 1. Class Map & Styles Proxy (`lib/styles.ts`)
```ts
export const CLASS_MAP: Record<string, string> = { ... }
export const styles = new Proxy(...)
```
- **Wajib dipahami**: Semua class CSS dipetakan lewat `styles.namaProperty` bukan string literal.
- `styles.actuatorCard` → `"actuator-card"` (dari `CLASS_MAP`)
- `styles.someCamelCase` → `"some-camel-case"` (auto-konversi jika tidak ada di `CLASS_MAP`)
- **Jangan pernah** menggunakan class string hardcoded langsung di JSX, gunakan selalu `styles.xxx`.

### 2. Type Definitions (`types/dashboard.ts`)
```ts
interface SensorData { id, label, value, unit, min, max, status, trend, lastUpdated, description }
interface LogEntry { time, node, message, level }
interface MqttPacket { time, topic, payload }
interface HistoryPoint { time, temp, hum, light }
interface ActuatorState { lamp, fan, alarm }
type ControlMode = "auto" | "manual"
type MqttStatus = "connected" | "connecting" | "offline" | "error"
```

### 3. Komponen Berdasarkan Domain (`components/`)
| Folder | Komponen | Fungsi |
|---|---|---|
| `components/common/` | `GridBackground`, `Sparkline` | Presentational canvas & mini visualizer |
| `components/layout/` | `TopBar`, `Footer` | Header taktis & footer aplikasi |
| `components/overview/` | `StatsRow`, `MqttBanner` | Metrik sesi & konfigurasi broker MQTT |
| `components/sensors/` | `SensorGrid` | 4 kartu telemetri sensor ESP32 |
| `components/actuators/`| `ActuatorGrid` | Kartu kontrol relay lampu, kipas, buzzer alarm |
| `components/telemetry/`| `LiveTelemetryChart`, `TelemetrySection` | Chart timeline real-time & packet inspector |
| `components/logs/` | `TelemetryDiagnostics`, `LogsSection` | Terminal log & diagnostik frame |

---

## Koneksi MQTT

Dashboard ini adalah **read-only consumer** — hanya menerima data, tidak pernah publish ke broker.

### Konfigurasi Default
```
Broker  : wss://broker.emqx.io:8084/mqtt   (public broker, WebSocket Secure)
Topic   : JASUN/smart-office/monitor
Wildcard: JASUN/smart-office/monitor/#
          JASUN/smart-office/monitor/+
```

### Format Payload ESP32
Dashboard mendukung beberapa format payload secara otomatis (fuzzy parser):

**Format JSON (direkomendasikan):**
```json
{
  "temperature_c": 28.5,
  "humidity_pct": 65.0,
  "presence": 0,
  "light_adc": 1295,
  "lamp": false,
  "fan": false,
  "alarm": false
}
```

**Format plain number (topic-aware):**
```
topic: JASUN/smart-office/monitor/temp → payload: 28.5
```

**Format key=value string:**
```
temp=28.5 hum=65.0 light_adc=1295
```

Parser (di baris ~602–750) mendukung alias bahasa Indonesia: `suhu`, `lembab`, `cahaya`, `orang`, dll.

---

## Design System

Lihat [`DESIGN.md`](file:///d:/AMMAR/project_sic/DESIGN.md) untuk detail lengkap. Ringkasan:

### Color Tokens (CSS Variables di `globals.css`)
| Token | Nilai | Peran |
|---|---|---|
| `--primary` | `#FFAB00` | Kuning amber — aksen utama |
| `--accent` | `#FF6D00` | Oranye — aksen sekunder |
| `--surface` | `#0F1A24` | Background kartu/panel |
| `--bg` | `#0A0E14` | Background halaman |
| `--text-muted` | `#4B5563` | Teks sekunder |
| `--status-online` | `#00E676` | Hijau — status aktif |
| `--status-warning` | `#FFB300` | Kuning — peringatan |
| `--status-critical` | `#FF1744` | Merah — kritis |

### Typography
- **Display/Heading**: `Rajdhani` (Google Font, `var(--font-rajdhani)`)
- **Body/Code/Data**: `JetBrains Mono` (Google Font, `var(--font-jetbrains-mono)`)

### Estetika Utama
- Dark mode taktis/militer
- Warna amber `#FFAB00` sebagai aksen dominan
- Animasi canvas background (dot grid + scanline)
- Glassmorphism ringan pada kartu
- Semua teks data menggunakan font monospace

---

## Aturan Pengembangan

### ✅ DO — Lakukan ini

1. **Selalu gunakan `styles.xxx`** untuk class CSS, bukan string literal.
2. **Tambahkan ke `CLASS_MAP`** jika membuat class baru dengan nama non-standard.
3. **Pertahankan estetika taktis** — dark mode, amber accent, monospace data.
4. **Gunakan `useCallback`** untuk handler yang di-pass ke child atau digunakan di `useEffect`.
5. **Pastikan hydration-safe** — state yang bergantung pada browser (waktu, dll) harus di dalam `useEffect` dan dilindungi flag `mounted`.
6. **Ikuti design tokens** — gunakan CSS variables (`var(--primary)`, dll) bukan hardcoded hex.
7. **Update `INITIAL_SENSORS`** jika menambah sensor baru ke hardware.
8. **Gunakan `lucide-react`** untuk semua ikon baru (sudah terpasang).

### ❌ DON'T — Hindari ini

1. **Jangan hardcode class CSS** sebagai string di JSX.
2. **Jangan ubah estetika** ke light mode atau warna generik.
3. **Jangan publish ke MQTT** — dashboard ini read-only consumer.
4. **Jangan pisahkan ke banyak file** tanpa diskusi — arsitektur satu file adalah keputusan desain yang disengaja.
5. **Jangan hapus blok komentar seksi** (garis `═══`) — itu adalah navigasi struktur file.
6. **Jangan gunakan `Math.random()`** di luar MQTT clientId atau konten yang tidak memengaruhi SSR.

---

## Commands

```bash
# Development server
npm run dev

# Build production
npm run build

# Start production server
npm start

# Lint
npm run lint
```

Server dev berjalan di: `http://localhost:3000`

---

## Konfigurasi Next.js Penting

```ts
// next.config.ts
experimental: {
  agentFeedback: true,   // Aktif — feedback dari AI agent
}
cacheComponents: true    // Component-level caching
partialPrefetching: true // Partial prefetch aktif
```

Turbopack menggunakan `@tailwindcss/turbopack` untuk memproses Tailwind CSS v4.

---

## Sensor Hardware (ESP32)

| ID Sensor | Label | Unit | Range | Tipe Fisik |
|---|---|---|---|---|
| `temp-01` | ROOM TEMPERATURE | °C | 0–100 | DHT/DS18B20/SHTC3 |
| `hum-01` | ROOM HUMIDITY | % | 0–100 | Hygrometer relatif |
| `presence-01` | ROOM OCCUPANCY | state (0/1) | 0–1 | PIR motion sensor |
| `light-01` | AMBIENT LIGHT | ADC | 0–4095 | LDR 12-bit ADC |

Aktuator yang dikontrol (dibaca dari payload):
- `lamp` (boolean) — Lampu
- `fan` (boolean) — Kipas
- `alarm` (boolean) — Alarm

---

## Catatan untuk AI Agent

- File utama `page.tsx` sangat panjang (~1800 baris). Gunakan pencarian/grep untuk menavigasi bagian spesifik sebelum mengedit.
- Saat menambah fitur UI baru, tambahkan class ke `CLASS_MAP` dan tambahkan styling di `globals.css` — **jangan** gunakan inline style kecuali benar-benar diperlukan untuk nilai dinamis.
- Konten teks dalam UI menggunakan campuran Bahasa Indonesia dan Inggris — pertahankan konsistensi bahasa sesuai konteks.
- Proyek ini untuk **Samsung Innovation Campus** — jaga profesionalitas dan kualitas kode.
