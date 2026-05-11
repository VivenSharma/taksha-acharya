import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    'localhost',
    '127.0.0.1',
    '192.168.1.5',
    '2a20-223-181-57-33.ngrok-free.app',
    '192.168.137.1',
  ],
};

export default nextConfig;
