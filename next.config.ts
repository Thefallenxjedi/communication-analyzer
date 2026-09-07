import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Single-threaded FFmpeg.wasm (via toBlobURL) does not require COOP/COEP.
  serverExternalPackages: ["unpdf"],
  async redirects() {
    return [
      {
        source: "/admin/prompts",
        destination: "/admin/prompt",
        permanent: false,
      },
      {
        source: "/admin/ai-prompts",
        destination: "/admin/tools",
        permanent: false,
      },
      {
        source: "/admin/ai-tools",
        destination: "/admin/tools",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
