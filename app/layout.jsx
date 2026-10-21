import './globals.css';

export const metadata = {
  title: 'Iamonjob — Reconversion & Recherche d\'emploi',
  description:
    'Analysez votre CV, explorez des pistes de reconversion, simulez des enquêtes métier, et trouvez des offres adaptées.',
  // Icônes locales (chat à cravate sur fond crème), aussi utilisées pour
  // l'écran d'accueil du téléphone. Voir app/manifest.js.
  icons: {
    icon: '/icon-192.png',
    shortcut: '/icon-192.png',
    apple: '/apple-touch-icon.png',
  },
  appleWebApp: { capable: true, title: 'IAMONJOB', statusBarStyle: 'default' },
};

export const viewport = {
  themeColor: '#123F39',
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
