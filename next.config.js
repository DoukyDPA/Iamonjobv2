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
    // Bloc commun, sauf l'anti-framing qui varie selon la page.
    const common = [
      // Bloque le « MIME sniffing » : le navigateur respecte le Content-Type.
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      // Ne fuit pas l'URL complète en référent vers les sites tiers.
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      // Force HTTPS pendant 2 ans, sous-domaines inclus.
      {
        key: 'Strict-Transport-Security',
        value: 'max-age=63072000; includeSubDomains; preload',
      },
      // Micro autorisé en same-origin uniquement : IAMONCV propose la dictée
      // vocale. Caméra et géolocalisation restent coupées.
      {
        key: 'Permissions-Policy',
        value: 'camera=(), microphone=(self), geolocation=()',
      },
    ];

    return [
      // IAMONCV est affiché dans un cadre same-origin par la page /cv. On
      // autorise donc le framing par le site lui-même (SAMEORIGIN), et pas au
      // reste du site qui garde DENY.
      {
        source: '/iamoncv.html',
        headers: [{ key: 'X-Frame-Options', value: 'SAMEORIGIN' }, ...common],
      },
      // Tout le reste : anti-framing strict (clickjacking).
      {
        source: '/((?!iamoncv\\.html).*)',
        headers: [{ key: 'X-Frame-Options', value: 'DENY' }, ...common],
      },
    ];
  },
};

module.exports = nextConfig;
