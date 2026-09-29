/** @type {import('next').NextConfig} */
const nextConfig = {
  // Minimal, self-contained production output (.next/standalone) — the
  // Docker image copies just that + .next/static + public, no node_modules.
  output: "standalone",
};

export default nextConfig;
