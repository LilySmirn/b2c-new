import type { NextConfig } from "next";

const isB2cStaticExport = process.env.B2C_STATIC_EXPORT === "true";

const nextConfig: NextConfig = isB2cStaticExport
  ? {
      output: "export",
      basePath: "/b2c",
      assetPrefix: "/b2c",
      images: {
        unoptimized: true,
      },
    }
  : {
      output: "standalone",
    };

export default nextConfig;
