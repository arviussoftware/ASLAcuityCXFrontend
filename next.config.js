/** @type {import('next').NextConfig} */
const backendApiBaseUrl =
  process.env.BACKEND_API_BASE_URL || "http://localhost:3000";

const isProd = process.env.NODE_ENV === "production";
const backendOrigin = (() => {
  try {
    return new URL(backendApiBaseUrl).origin;
  } catch (_) {
    return "http://localhost:3000";
  }
})();

const cspHeader = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isProd ? "" : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' blob: data: https://images.pexels.com https://commondatastorage.googleapis.com https://storage.googleapis.com https://*.s3.amazonaws.com https://*.amazonaws.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "media-src 'self' blob: data: https://*.s3.amazonaws.com https://*.amazonaws.com https://storage.googleapis.com",
  `connect-src 'self' ws: wss: ${backendOrigin}`,
  "worker-src 'self' blob:",
  "frame-ancestors 'self'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const nextConfig = {
  output: "standalone",
  productionBrowserSourceMaps: true,
  poweredByHeader: false,
  experimental: {
    serverActions: { bodySizeLimit: "100mb" },
  },

  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.pexels.com" },
      { protocol: "https", hostname: "commondatastorage.googleapis.com" },
    ],
  },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains; preload",
          },
          { key: "Content-Security-Policy", value: cspHeader },
          { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
          { key: "X-DNS-Prefetch-Control", value: "on" },
        ],
      },
    ];
  },

  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${backendApiBaseUrl}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
