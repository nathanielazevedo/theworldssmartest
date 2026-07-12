import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Resolve the "@/*" import alias for the webpack build. (tsconfig `paths`
  // covers the type-checker and Turbopack, but Next's webpack build needs the
  // alias set explicitly here — otherwise "@/..." imports fail to resolve.)
  webpack: (config) => {
    config.resolve.alias["@"] = projectRoot;
    return config;
  },
};

export default nextConfig;
