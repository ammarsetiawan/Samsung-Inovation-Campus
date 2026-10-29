"use client";

import { useLayoutEffect, useEffect, useRef, useState, useId } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

const STORAGE_KEY = "sic-intro-seen";
const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

export type PreloaderProps = {
  /** Kata-kata atau fase taktis yang bergantian muncul selama boot sequence */
  words?: string[];
  /** Label unit atau identitas sistem */
  brand?: string;
  /** Subtitle atau kode sektor */
  sector?: string;
  /** Durasi counter 0 -> 100 (detik) */
  duration?: number;
  /** Paksa tampilkan intro tanpa mengecek sessionStorage (berguna untuk testing/replay) */
  force?: boolean;
};

export default function Preloader({
  words = [
    "AHMED",
    "TAKY",
    "AMMAR",
    "FURQON",
  ],
  brand = "SMART ROOM MONITORING SYSTEM",
  sector = "IoT LAB ",
  duration = 2.8,
  force = false,
}: PreloaderProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const counterRef = useRef<HTMLSpanElement>(null);
  const hexRef = useRef<HTMLSpanElement>(null);
  const [mounted, setMounted] = useState(true);
  const uniqueId = useId();

  // Pengunjung yang sudah pernah lihat intro (dalam sesi tab ini) -> langsung skip bila tidak dipaksa
  useIsoLayoutEffect(() => {
    if (force) {
      document.documentElement.dataset.intro = "pending";
      return;
    }
    try {
      if (sessionStorage.getItem(STORAGE_KEY)) {
        document.documentElement.dataset.intro = "seen";
        setMounted(false);
      }
    } catch {
      /* storage diblokir: tampilkan intro seperti biasa */
    }
  }, [force]);

  useGSAP(
    () => {
      const html = document.documentElement;
      if (!force && html.dataset.intro === "seen") return;

      const root = rootRef.current;
      if (!root) return;

      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      html.style.overflow = "hidden"; // kunci scroll selama intro

      const finish = () => {
        try {
          sessionStorage.setItem(STORAGE_KEY, "1");
        } catch {}
        html.style.overflow = "";
        html.dataset.intro = "done";
        window.dispatchEvent(new Event("intro:complete"));
        setMounted(false);
      };

      // Pengguna yang mengurangi animasi: cukup fade singkat
      if (reduceMotion) {
        gsap.to(root, { autoAlpha: 0, duration: 0.4, delay: 0.2, onComplete: finish });
        return;
      }

      const wordEls = gsap.utils.toArray<HTMLElement>("[data-word]", root);
      const bar = root.querySelector<HTMLElement>("[data-bar]");
      const counter = { value: 0 };

      // Initial state
      gsap.set(wordEls, { yPercent: 120, opacity: 0 });
      if (bar) gsap.set(bar, { scaleX: 0, transformOrigin: "left center" });

      const tl = gsap.timeline({ onComplete: finish });

      // Efek acak hex register memory di pojok
      const hexInterval = setInterval(() => {
        if (hexRef.current) {
          const randHex = Math.floor(Math.random() * 0xffff)
            .toString(16)
            .toUpperCase()
            .padStart(4, "0");
          hexRef.current.textContent = `0x${randHex}`;
        }
      }, 90);

      // 1) Counter + progress bar
      tl.to(
        counter,
        {
          value: 100,
          duration,
          ease: "power2.inOut",
          onUpdate: () => {
            if (counterRef.current) {
              counterRef.current.textContent = String(Math.round(counter.value)).padStart(3, "0");
            }
          },
        },
        0
      );

      if (bar) {
        tl.to(bar, { scaleX: 1, duration, ease: "power2.inOut" }, 0);
      }

      // 2) Kata bergantian dengan reveal taktis
      const slot = duration / wordEls.length;
      wordEls.forEach((el, i) => {
        const start = i * slot;
        tl.to(
          el,
          {
            yPercent: 0,
            opacity: 1,
            duration: 0.5,
            ease: "expo.out",
          },
          start
        );

        if (i < wordEls.length - 1) {
          tl.to(
            el,
            {
              yPercent: -100,
              opacity: 0,
              duration: 0.4,
              ease: "expo.in",
            },
            start + slot - 0.2
          );
        }
      });

      // 3) Exit: Konten tengah fade out & panel blast door terbelah membuka halaman
      tl.to(
        "[data-content]",
        {
          autoAlpha: 0,
          scale: 0.98,
          duration: 0.45,
          ease: "power2.in",
          onStart: () => clearInterval(hexInterval),
        },
        ">+0.2"
      )
        // Blast door atas meluncur ke atas
        .to(
          "[data-panel='top']",
          {
            yPercent: -100,
            duration: 0.95,
            ease: "power3.inOut",
          },
          ">-0.05"
        )
        // Blast door bawah meluncur ke bawah serentak
        .to(
          "[data-panel='bottom']",
          {
            yPercent: 100,
            duration: 0.95,
            ease: "power3.inOut",
          },
          "<"
        )
        // Glow garis perbatasan menyala terang lalu sirna
        .to(
          "[data-seam-glow]",
          {
            opacity: 0,
            duration: 0.3,
          },
          "<0.4"
        )
        .set(root, { autoAlpha: 0 });
    },
    { scope: rootRef }
  );

  if (!mounted) return null;

  return (
    <div
      ref={rootRef}
      className="preloader fixed inset-0 z-[9999] select-none overflow-hidden font-mono text-[var(--text-primary)]"
      role="status"
      aria-live="polite"
      aria-label="Memuat sistem taktis"
      style={{
        fontFamily: "var(--font-jetbrains-mono), monospace",
      }}
    >
      {/* ═══ BLAST DOORS (DUA PANEL TERBELAH KETIKA SELESAI) ═══ */}
      {/* Panel Atas */}
      <div
        data-panel="top"
        className="absolute inset-x-0 top-0 h-1/2 bg-[#0A0E14] border-b border-[#FFAB00]/30 shadow-[0_4px_24px_rgba(255,171,0,0.15)] flex flex-col justify-end"
      >
        {/* Subtle Scanlines & Tactical Grid */}
        <div
          className="absolute inset-0 opacity-20 pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,171,0,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,171,0,0.08) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />
        {/* Border glow di garis sambungan pintu */}
        <div
          data-seam-glow
          className="w-full h-[2px] bg-gradient-to-r from-transparent via-[#FFAB00] to-transparent shadow-[0_0_12px_#FFAB00]"
        />
      </div>

      {/* Panel Bawah */}
      <div
        data-panel="bottom"
        className="absolute inset-x-0 bottom-0 h-1/2 bg-[#0A0E14] border-t border-[#FFAB00]/30 shadow-[0_-4px_24px_rgba(255,171,0,0.15)] flex flex-col justify-start"
      >
        {/* Border glow di garis sambungan pintu */}
        <div
          data-seam-glow
          className="w-full h-[2px] bg-gradient-to-r from-transparent via-[#FFAB00] to-transparent shadow-[0_0_12px_#FFAB00]"
        />
        {/* Subtle Scanlines & Tactical Grid */}
        <div
          className="absolute inset-0 opacity-20 pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,171,0,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,171,0,0.08) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />
      </div>

      {/* ═══ KONTEN HUD FOREGROUND ═══ */}
      <div
        data-content
        className="relative z-10 flex h-full flex-col justify-between p-6 md:p-10 lg:p-14"
      >
        {/* TOP BAR HUD */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#FFAB00]/15 pb-4">
          <div className="flex items-center gap-3">
            {/* Status Beacon */}
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00E676] opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-[#00E676]" />
            </span>
            <div className="flex flex-col">
              <span
                className="text-xs tracking-wider text-[#FFAB00] font-bold uppercase"
                style={{ fontFamily: "var(--font-rajdhani), sans-serif" }}
              >
                {brand}
              </span>
              <span className="text-[10px] tracking-widest text-[#7A8BA0]">
                {sector}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4 text-[11px] text-[#7A8BA0]">
            <div className="hidden sm:flex items-center gap-2">
              <span className="text-[#4A5568]">MEM_REG:</span>
              <span ref={hexRef} className="text-[#FFAB00] font-mono">
                0x7A1F
              </span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#0F1A24] border border-[#FFAB00]/20 text-[#FFAB00]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#FFAB00] animate-pulse" />
              <span className="tracking-widest font-semibold uppercase text-[10px]">
                BOOT SEQUENCE
              </span>
            </div>
          </div>
        </div>

        {/* CENTER STAGE: TACTICAL PHRASES + TARGET RETICLE */}
        <div className="relative my-auto flex flex-col items-center justify-center text-center py-12">
          {/* Tactical Crosshair / Corner Reticles */}
          <div className="pointer-events-none absolute -top-8 -left-4 text-[#FFAB00]/40 text-xs font-mono">
            ┌ SYS_ALIGN // 01
          </div>
          <div className="pointer-events-none absolute -top-8 -right-4 text-[#FFAB00]/40 text-xs font-mono">
            00.42.68 ┐
          </div>
          <div className="pointer-events-none absolute -bottom-8 -left-4 text-[#FFAB00]/40 text-xs font-mono">
            └ LATENCY / 25MS
          </div>
          <div className="pointer-events-none absolute -bottom-8 -right-4 text-[#FFAB00]/40 text-xs font-mono">
            HEX / 08 L8-MX ┘
          </div>

          {/* Micro HUD status label */}
          <div className="mb-3 inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-[#FFAB00]/10 border border-[#FFAB00]/30 text-[#FFAB00] text-[11px] tracking-widest uppercase">
            <span>[ + ]</span>
            <span>SYSTEM CALIBRATION IN PROGRESS</span>
            <span>[ + ]</span>
          </div>

          {/* Kata bergantian (Masked Reveal) */}
          <div
            className="grid w-full overflow-hidden pb-2 text-center"
            style={{
              fontFamily: "var(--font-rajdhani), sans-serif",
            }}
          >
            {words.map((word) => (
              <span
                key={word}
                data-word
                className="col-start-1 row-start-1 block text-[clamp(2.4rem,7vw,6.5rem)] font-bold tracking-tight text-[#E8ECF1] uppercase drop-shadow-[0_0_20px_rgba(255,171,0,0.25)] will-change-transform"
              >
                {word}
              </span>
            ))}
          </div>

          {/* Sub-telemetry readout */}
          <div className="mt-4 flex items-center justify-center gap-3 text-xs tracking-wider text-[#7A8BA0]">
            <span>NODE-OX / ACTIVE</span>
            <span className="text-[#FFAB00]">●</span>
            <span>RESOURCE ALLOCATION: MULTI-PROC ON GUEST</span>
          </div>
        </div>

        {/* BOTTOM HUD: COUNTER & TACTICAL PROGRESS BAR */}
        <div className="border-t border-[#FFAB00]/15 pt-5">
          <div className="mb-3 flex items-end justify-between">
            <div className="flex flex-col">
              <span className="text-[10px] tracking-widest text-[#7A8BA0] uppercase">
                TELEMETRY SYNCHRONIZATION
              </span>
              <span className="text-xs text-[#E8ECF1] font-mono">
                PACKET INGESTION BUFFER
              </span>
            </div>

            {/* Giant Monospace Tactical Counter */}
            <div
              className="flex items-baseline gap-1"
              style={{ fontFamily: "var(--font-rajdhani), sans-serif" }}
            >
              <span
                ref={counterRef}
                className="text-[clamp(3.5rem,8vw,6.5rem)] font-bold leading-none tabular-nums text-[#FFAB00] drop-shadow-[0_0_25px_rgba(255,171,0,0.4)]"
              >
                000
              </span>
              <span className="text-xl md:text-2xl font-bold text-[#FF6D00]">%</span>
            </div>
          </div>

          {/* Dual Layer Tactical Progress Bar */}
          <div className="relative h-2 w-full overflow-hidden rounded bg-[#0F1A24] border border-[#FFAB00]/25 p-[1px]">
            <div
              data-bar
              className="h-full w-full bg-gradient-to-r from-[#FF6D00] via-[#FFAB00] to-[#FFE082] shadow-[0_0_15px_#FFAB00]"
            />
          </div>

          {/* Bottom Telemetry Ticker */}
          <div className="mt-3 flex flex-wrap items-center justify-between text-[11px] text-[#7A8BA0]">
            <div className="flex items-center gap-4">
              <span>SECTOR: 08 CLUSTER // EU-W1 -- 990XP</span>
              <span className="hidden md:inline text-[#4A5568]">|</span>
              <span className="hidden md:inline">ESP32 240MHZ DUAL CORE</span>
            </div>
            <div className="flex items-center gap-2 text-[#00E676]">
              <span className="inline-block w-2 h-2 rounded-full bg-[#00E676] animate-pulse" />
              <span>SUBSYSTEMS OPTIMAL</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
