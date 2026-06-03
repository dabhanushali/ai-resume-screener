import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client", "@prisma/adapter-pg", "pg", "pdf-parse", "@napi-rs/canvas"],
};

export default nextConfig;
