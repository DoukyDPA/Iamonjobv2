import LegalShell from '@/components/layout/LegalShell';

export const metadata = {
  title: 'Mentions légales — IAMONJOB',
  description: 'Mentions légales du service IAMONJOB.',
};

export default function MentionsLegalesPage() {
  return (
    <LegalShell title="Mentions légales" lastUpdated="mai 2026">
      <section>
        <h2 className="text-xl font-bold text-teal-800 mb-3">Éditeur du site</h2>
        <p>
          Le site IAMONJOB est édité par <strong>CBE Silveria</strong>.
        </p>
        <ul className="mt-2 space-y-1 text-sm">
          <li>Adresse : à compléter</li>
          <li>Téléphone : à compléter</li>
          <li>Email : contact@iamonjob.fr</li>
          <li>SIRET : à compléter</li>
          <li>Directeur de la publication : à compléter</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-bold text-teal-800 mb-3">Hébergement</h2>
        <p>
          Le site est hébergé par <strong>Railway Corp.</strong>, 251 Little Falls Drive,
          Wilmington, DE 19808, États-Unis. <a href="https://railway.app" target="_blank" rel="noopener noreferrer" className="text-teal-700 hover:underline">railway.app</a>
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
          Conception et développement : <a href="https://silveria.fr" target="_blank" rel="noopener noreferrer" className="text-teal-700 hover:underline">CBE Silveria</a>.
        </p>
      </section>
    </LegalShell>
  );
}
