import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Single-threaded FFmpeg.wasm (via toBlobURL) does not require COOP/COEP.
  serverExternalPackages: ["unpdf"],
};

export default nextConfig;
