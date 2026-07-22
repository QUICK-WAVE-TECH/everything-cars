import type { NextConfig } from "next";
import path from "node:path";

type RemotePattern = NonNullable<
  NonNullable<NextConfig["images"]>["remotePatterns"]
>[number];

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

/**
 * Django serves uploaded photos from /media on the same origin as the API, so
 * the image allowlist is derived from NEXT_PUBLIC_API_URL rather than hardcoded.
 * Point the app at a new machine, LAN address or deploy host and its images are
 * allowed automatically — no config edit, no "hostname is not configured" error.
 *
 * Returns null on an unparseable URL so a bad env var degrades to the static
 * patterns below instead of crashing the whole config at boot.
 */
function apiOriginPattern(): RemotePattern | null {
  try {
    const url = new URL(API_URL);
    const protocol = url.protocol.replace(":", "");
    if (protocol !== "http" && protocol !== "https") return null;
    return {
      protocol,
      hostname: url.hostname,
      // Omitting port matches any port; only pin it when the API declares one.
      ...(url.port ? { port: url.port } : {}),
    };
  } catch {
    return null;
  }
}

const apiPattern = apiOriginPattern();

const nextConfig: NextConfig = {
  output: "standalone",
  // Hosts allowed to load Next dev resources (HMR socket, etc.). Bare hostnames
  // only — no ports. Must include every host you open the app from in the browser.
  allowedDevOrigins: ["localhost", "127.0.0.1", "192.168.1.30", "172.20.10.3"],

  // Pin the workspace root to this directory so Next/Turbopack never infers it
  // from a stray lockfile in a parent directory (which left dev requests hanging).
  turbopack: {
    root: path.join(__dirname),
  },

  images: {
    unoptimized: true,
    remotePatterns: [
      // Whatever host NEXT_PUBLIC_API_URL points at — this is what serves
      // uploaded car photos and ID documents.
      ...(apiPattern ? [apiPattern] : []),
      { protocol: "https", hostname: "flagcdn.com" },
      // Local fallbacks so the default dev setup works with no env file set.
      { protocol: "http", hostname: "localhost" },
      { protocol: "http", hostname: "127.0.0.1" },
      // Object storage / hosting used in deployed environments.
      { protocol: "https", hostname: "**.amazonaws.com" },
      { protocol: "https", hostname: "**.onrender.com" },
    ],
  },

  async headers() {
    // Security headers (esp. HSTS) are for production only. Sending HSTS on
    // localhost can make the browser force HTTPS and refuse to load dev.
    if (process.env.NODE_ENV !== "production") return [];
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(self)",
          },
        ],
      },
    ];
  },

  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"}/:path*`,
      },
    ];
  },
};

export default nextConfig;