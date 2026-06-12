import './globals.css';

export const metadata = {
  title: 'Iamonjob — Reconversion & Recherche d\'emploi',
  description:
    'Analysez votre CV, explorez des pistes de reconversion, simulez des enquêtes métier, et trouvez des offres adaptées.',
  // Favicon : le logo chat à cravate, déjà hébergé sur postimg (domaine
  // autorisé dans next.config.js). Pour une icône plus nette, on pourra
  // déposer plus tard un favicon.ico carré dans app/.
  icons: {
    icon: 'https://i.postimg.cc/cHR6mh41/Chat-cravate.png',
    shortcut: 'https://i.postimg.cc/cHR6mh41/Chat-cravate.png',
    apple: 'https://i.postimg.cc/cHR6mh41/Chat-cravate.png',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
