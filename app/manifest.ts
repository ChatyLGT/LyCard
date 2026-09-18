import type { MetadataRoute } from "next";

// PWA real: manifest nativo de Next (App Router lo sirve solo en
// /manifest.webmanifest, sin next-pwa — ese paquete quedó muerto en 2024 y
// solo funciona con webpack, no con Turbopack que es el bundler por
// defecto de este proyecto desde Next 16). Íconos en public/icons/,
// generados a partir de la misma marca del favicon (triángulo sobre
// fondo oscuro) en la paleta real de la casa.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "LyCard — Legacy",
    short_name: "LyCard",
    description: "Tarjeta de presentación digital del Programa Legacy",
    start_url: "/",
    display: "standalone",
    background_color: "#09090b",
    theme_color: "#09090b",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
