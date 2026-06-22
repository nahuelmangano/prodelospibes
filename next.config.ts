import type { NextConfig } from "next";

const serverActionAllowedOrigins = (
  process.env.SERVER_ACTIONS_ALLOWED_ORIGINS ?? "portal.app.flow.com.ar"
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: serverActionAllowedOrigins,
    },
  },
};

export default nextConfig;
