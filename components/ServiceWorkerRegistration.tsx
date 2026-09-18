"use client";

import { useEffect } from "react";

// Solo en producción: en dev el SW cachearía chunks que Turbopack
// reemplaza en cada guardado y rompería el hot-reload.
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Sin service worker la app sigue funcionando igual, solo sin caché offline.
    });
  }, []);

  return null;
}
