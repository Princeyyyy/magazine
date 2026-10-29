import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  serverExternalPackages: ["googleapis", "@electric-sql/pglite", "archiver"],
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
  images: {
    remotePatterns: [],
  },
  async redirects() {
    return [
      {
        source: "/order",
        destination: "/",
        permanent: true,
      },
      {
        source: "/orders",
        destination: "/admin",
        permanent: false,
      },
      {
        source: "/start",
        destination: "/",
        permanent: true,
      },
      {
        source: "/brief",
        destination: "/",
        permanent: true,
      },
      {
        source: "/questionnaire",
        destination: "/",
        permanent: true,
      },
      {
        source: "/resume",
        destination: "/",
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },
};

export default nextConfig;

