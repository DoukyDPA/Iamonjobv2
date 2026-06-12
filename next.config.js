/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['i.postimg.cc'],
  },
  // pdfjs-dist a besoin de ces transpilations pour fonctionner côté serveur (build)
  webpack: (config) => {
    config.resolve.alias.canvas = false;
    return config;
  },
  // En-têtes de sécurité appliqués à toutes les réponses.
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // Empêche l'intégration du site dans une iframe (clickjacking).
          { key: 'X-Frame-Options', value: 'DENY' },
          // Bloque le « MIME sniffing » : le navigateur respecte le Content-Type.
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Ne fuit pas l'URL complète en référent vers les sites tiers.
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Force HTTPS pendant 2 ans, sous-domaines inclus.
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          // Coupe l'accès par défaut aux capteurs sensibles du navigateur.
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
