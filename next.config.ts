import type { NextConfig } from "next";

const isMobileBuild = process.env.CAPACITOR_BUILD?.trim() === 'true';

console.log("----------------------------------------");
console.log("Build Configuration:");
console.log("Mobile Build:", isMobileBuild);
console.log("Output Mode:", isMobileBuild ? 'export (Static HTML)' : 'default (Server)');
console.log("Raw ENV:", `"${process.env.CAPACITOR_BUILD}"`);
console.log("----------------------------------------");

const nextConfig: NextConfig = {
  output: isMobileBuild ? 'export' : undefined,
  images: {
    unoptimized: true, 
  },
  // Ensure paths work correctly on static export
  trailingSlash: true,
};

export default nextConfig;
