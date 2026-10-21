// Manifeste d'application web : permet « Ajouter à l'écran d'accueil » sur un
// téléphone. IAMONJOB s'ouvre alors comme une application, sans retaper
// l'adresse. Servi par Next.js à /manifest.webmanifest.
export default function manifest() {
  return {
    name: 'IAMONJOB',
    short_name: 'IAMONJOB',
    description: 'Votre parcours vers l\'emploi, avec votre conseiller.',
    lang: 'fr',
    start_url: '/',
    display: 'standalone',
    background_color: '#FAF6EE',
    theme_color: '#123F39',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
