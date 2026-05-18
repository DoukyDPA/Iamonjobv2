import './globals.css';

export const metadata = {
  title: 'Iamonjob — Reconversion & Recherche d\'emploi',
  description:
    'Analysez votre CV, explorez des pistes de reconversion, simulez des enquêtes métier, et trouvez des offres adaptées.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
