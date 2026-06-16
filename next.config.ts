import type { NextConfig } from "next";

const isB2cStaticExport = process.env.B2C_STATIC_EXPORT === "true";

const nextConfig: NextConfig = isB2cStaticExport
  ? {
      output: "export",
      pageExtensions: ["b2c.tsx", "b2c.ts", "b2c.jsx", "b2c.js"],
      basePath: "/b2c",
      assetPrefix: "/b2c",
      trailingSlash: true,
      images: {
        unoptimized: true,
      },
    }
  : {
      output: "standalone",
    };

export default nextConfig;
