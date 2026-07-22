import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow access from mobile device during development
  allowedDevOrigins: ["192.168.0.130"],

  // Emit a fully static site (out/) instead of requiring a Node server.
  // Capacitor bundles static files into the WebView — it cannot run
  // `next start` or any Next.js server on-device.
  output: "export",

  // The default Next.js Image loader calls a server-side optimization
  // endpoint (`/_next/image`) that does not exist in a static export.
  // `unoptimized: true` makes next/image render a plain <img> with the
  // original file, which is what SplashScreen.tsx and other next/image
  // usages need to keep working without a server.
  images: {
    unoptimized: true,
  },

  // Emit each route as `<route>/index.html` instead of `<route>.html`.
  // Capacitor's WebView serves the exported files directly from disk, and
  // relative asset/link resolution inside nested routes (e.g.
  // /dashboard/history/[id]) is reliable with the trailing-slash + index.html
  // convention, matching how most static file servers resolve directories.
  trailingSlash: true,
};

export default nextConfig;