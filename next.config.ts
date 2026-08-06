import type { NextConfig } from "next";
import { loadLocalEnv } from "./config/load-local-env";

loadLocalEnv();

const nextConfig: NextConfig = {
  //output: "standalone",
};

export default nextConfig;

