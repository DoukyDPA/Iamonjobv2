import LegalShell from '@/components/layout/LegalShell';

export const metadata = {
  title: 'Mentions légales — IAMONJOB',
  description: 'Mentions légales du service IAMONJOB.',
};

export default function MentionsLegalesPage() {
  return (
    <LegalShell title="Mentions légales" lastUpdated="juillet 2026">
      <section>
        <h2 className="text-xl font-bold text-teal-800 mb-3">Éditeur du site</h2>
        <p>
          Le site IAMONJOB est édité par le <strong>CBE Sud 94</strong>. Silveria est la marque
          publique du CBE Sud 94 pour ses actions de formation et ses outils numériques.
        </p>
        <ul className="mt-2 space-y-1 text-sm">
          <li>Adresse : 1 rue de la Corderie, Centra 328, 94586 Rungis Cedex</li>
          <li>SIRET : 413 705 112 00022</li>
          <li>Email : contact@cbe-sud94.org</li>
          <li>Directeur de la publication : le président du CBE Sud 94</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-bold text-teal-800 mb-3">Hébergement et stockage des données</h2>
        <p>
          L'application (partie logicielle) est hébergée par <strong>Railway Corp.</strong>,
          251 Little Falls Drive, Wilmington, DE 19808, États-Unis
          (<a href="https://railway.app" target="_blank" rel="noopener noreferrer" className="text-teal-700 hover:underline">railway.app</a>).
          Cet hébergement assure l'exécution du service ; il ne conserve pas votre CV.
        </p>
        <p className="mt-3">
          Les données personnelles (CV, préférences) sont stockées sur <strong>Google Cloud
          Firestore</strong>, dans une région <strong>européenne</strong> (Belgique et Pays-Bas),
          avec chiffrement au repos. Le détail des traitements et des sous-traitants figure dans
          notre{' '}
          <a href="/confidentialite" className="text-teal-700 hover:underline">politique de confidentialité</a>.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-teal-800 mb-3">Propriété intellectuelle</h2>
        <p>
          L'ensemble des contenus présents sur ce site (textes, images, logos, code)
          est protégé par le droit de la propriété intellectuelle. Toute reproduction,
          représentation ou diffusion, en tout ou partie, est interdite sans autorisation
          écrite préalable.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-teal-800 mb-3">Crédits</h2>
        <p>
          Conception et développement : CBE Sud 94, marque{' '}
          <a href="https://silveria.fr" target="_blank" rel="noopener noreferrer" className="text-teal-700 hover:underline">Silveria</a>.
        </p>
      </section>
    </LegalShell>
  );
}
