import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ServiceWorkerRegistration } from "@/components/ServiceWorkerRegistration";
import { prisma } from "@/lib/prisma";

const DEFAULT_TITLE = "LyCard";
const DEFAULT_ICONS: Metadata["icons"] = {
  icon: [
    { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
  ],
  apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
};

// Favicon/nombre por defecto de TODO el sistema (2026-09-19, pedido de
// Gunnar) — no solo de las Cards de un Programa puntual (eso ya lo hace
// lib/cardMetadata.ts): en cualquier pantalla sin un override propio
// (admin, login, una Card sin Programa) se usa el logo real de la Card
// marcada `isOrigin` — que es, por definición, Legacy — en vez del
// triángulo genérico. Sin una Origin Card configurada, cae a los
// íconos de siempre.
export async function generateMetadata(): Promise<Metadata> {
  const origin = await prisma.card.findFirst({
    where: { isOrigin: true },
    select: { program: { select: { logoUrl: true, cardAppName: true } } },
  });
  const title = origin?.program?.cardAppName?.trim() || DEFAULT_TITLE;
  const logoUrl = origin?.program?.logoUrl;

  return {
    title,
    description: "Tarjeta de presentación digital del Programa Legacy",
    manifest: "/manifest.webmanifest",
    appleWebApp: {
      capable: true,
      statusBarStyle: "black-translucent",
      title,
    },
    icons: logoUrl ? { icon: [{ url: logoUrl }], apple: [{ url: logoUrl }] } : DEFAULT_ICONS,
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#09090b",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es">
      <head>
        <link href="https://fonts.googleapis.com" rel="preconnect" />
        <link
          href="https://fonts.gstatic.com"
          rel="preconnect"
          crossOrigin=""
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,500;0,600;0,700;1,400;1,600&family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {children}
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
