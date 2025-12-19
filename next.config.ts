import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export', // Obligatoire pour Capacitor
  images: {
    unoptimized: true, // Obligatoire car Next/Image ne marche pas sans serveur
  },
};

export default nextConfig;
