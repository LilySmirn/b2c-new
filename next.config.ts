import type { NextConfig } from "next";
import { loadEnv } from "./config/load-env";

loadEnv();

const nextConfig: NextConfig = {
  //output: "standalone",
};

export default nextConfig;

