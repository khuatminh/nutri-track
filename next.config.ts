import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  // VPS release builds set NEXT_OUTPUT=standalone (docker/app/Dockerfile) so the runtime
  // image only ships traced files. Local dev, CI and the Docker staging stack stay default.
  output: process.env.NEXT_OUTPUT === "standalone" ? "standalone" : undefined,
  serverExternalPackages: ["@node-rs/argon2"],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
        ],
      },
    ];
  },
};

export default config;
