import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Default de Next.js es 1MB — muy poco para las fotos/brandbooks reales
    // que se suben desde /m/dashboard y /admin/programs/[id] (bug reportado
    // por Juancho: "Analizar y Guardar" moría en silencio con un 413).
    serverActions: { bodySizeLimit: "10mb" },
  },
};

export default nextConfig;
