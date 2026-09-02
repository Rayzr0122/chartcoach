import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Hides the small "N" dev-mode indicator badge Next.js shows in the corner.
  // It only ever appears during `next dev` anyway (never in production),
  // but this turns it off for local development too.
  devIndicators: false,
};

export default nextConfig;
