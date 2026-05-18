import LegalShell from '@/components/layout/LegalShell';

export const metadata = {
  title: 'Accessibilité — IAMONJOB',
  description: "Déclaration d'accessibilité du service IAMONJOB.",
};

export default function AccessibilitePage() {
  return (
    <LegalShell title="Déclaration d'accessibilité" lastUpdated="mai 2026">
      <section>
        <p>
          IAMONJOB s'engage à rendre son service accessible au plus grand nombre,
          y compris aux personnes en situation de handicap, conformément à
          l'article 47 de la loi n° 2005-102 du 11 février 2005.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-teal-800 mb-3">Fonctionnalités disponibles</h2>
        <ul className="list-disc ml-6 space-y-1 text-sm">
          <li><strong>Taille de texte ajustable</strong> via les boutons A− / A+ (4 niveaux) ;</li>
          <li><strong>Mode contraste élevé</strong> activable depuis l'en-tête ;</li>
          <li><strong>Lecture vocale</strong> des contenus (synthèse vocale du navigateur) ;</li>
          <li>Navigation entièrement utilisable au clavier ;</li>
          <li>Tooltips explicatifs « ? » sur les termes techniques.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-bold text-teal-800 mb-3">État de conformité</h2>
        <p>
          IAMONJOB est <strong>partiellement conforme</strong> avec le Référentiel
          général d'amélioration de l'accessibilité (RGAA 4.1) en raison des
          non-conformités énumérées ci-dessous. Un audit complet est planifié.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-teal-800 mb-3">Retour d'expérience</h2>
        <p>
          Si vous rencontrez un défaut d'accessibilité vous empêchant d'accéder à un
          contenu, vous pouvez nous contacter à
          <a href="mailto:contact@iamonjob.fr" className="text-teal-700 hover:underline"> contact@iamonjob.fr</a>.
          Nous nous engageons à vous répondre dans un délai de 15 jours.
        </p>
      </section>
    </LegalShell>
  );
}
