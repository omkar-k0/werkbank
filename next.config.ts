import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PGlite ships a WASM build of Postgres; keep it out of the bundler.
  serverExternalPackages: ["@electric-sql/pglite"],
  outputFileTracingIncludes: { "/**": ["./node_modules/@electric-sql/pglite/dist/**"] },
};

export default nextConfig;
