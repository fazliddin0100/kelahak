import type { NextConfig } from 'next';

/**
 * Middleware o‘tmaydigan javoblar (statik fayllar) uchun ham amal qiladi.
 * CSP va qolgan headerlar middleware'da (lib/securityHeaders.ts) qo‘yiladi.
 */
const securityHeaders = [
  { key: 'X-DNS-Prefetch-Control', value: 'off' },
  { key: 'X-Permitted-Cross-Domain-Policies', value: 'none' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
];

const nextConfig: NextConfig = {
  output: 'standalone',
  poweredByHeader: false,
  // Rasm optimizatori (/_next/image) ishlatilmaydi — hujum yuzasi yopiladi;
  // middleware bu yo‘lga 404 qaytaradi.
  images: {
    unoptimized: true,
  },
  turbopack: {
    root: process.cwd(),
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
