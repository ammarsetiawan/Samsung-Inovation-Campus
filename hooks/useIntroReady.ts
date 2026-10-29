"use client";

import { useEffect, useRef } from "react";

/**
 * Jalankan callback setelah transisi intro selesai.
 * Kalau intro tidak tampil (sudah pernah dilihat dalam sesi ini), callback langsung jalan seketika.
 */
export function useIntroReady(callback: () => void) {
  const cbRef = useRef(callback);
  cbRef.current = callback;

  useEffect(() => {
    if (typeof window === "undefined") return;

    const state = document.documentElement.dataset.intro;
    if (state === "done" || state === "seen") {
      cbRef.current();
      return;
    }
    const handler = () => cbRef.current();
    window.addEventListener("intro:complete", handler, { once: true });
    return () => window.removeEventListener("intro:complete", handler);
  }, []);
}
