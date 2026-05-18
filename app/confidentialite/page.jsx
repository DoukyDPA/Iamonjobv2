import LegalShell from '@/components/layout/LegalShell';

export const metadata = {
  title: 'Politique de confidentialité — IAMONJOB',
  description: 'Politique de confidentialité et de protection des données personnelles.',
};

export default function ConfidentialitePage() {
  return (
    <LegalShell title="Politique de confidentialité" lastUpdated="mai 2026">
      <section>
        <h2 className="text-xl font-bold text-teal-800 mb-3">Données collectées</h2>
        <p>
          Lorsque vous utilisez IAMONJOB, nous collectons uniquement les informations
          nécessaires au fonctionnement du service :
        </p>
        <ul className="list-disc ml-6 mt-2 space-y-1 text-sm">
          <li>Adresse email et mot de passe (chiffré) pour la création de votre compte ;</li>
          <li>Le texte de votre CV, pour générer des analyses personnalisées ;</li>
          <li>Vos préférences d'utilisation (taille de texte, mode contraste).</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-bold text-teal-800 mb-3">Comment vos données sont traitées</h2>
        <p>
          Votre CV est <strong>lu localement</strong> dans votre navigateur. Son texte
          n'est transmis aux modèles d'IA (Google Gemini) qu'au moment où vous lancez
          le diagnostic. Il est ensuite sauvegardé de façon chiffrée sur votre compte
          pour vos prochaines sessions.
        </p>
        <p className="mt-3">
          Nous ne revendons jamais vos données à des tiers et ne les utilisons pas
          à des fins publicitaires.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-teal-800 mb-3">Vos droits (RGPD)</h2>
        <p>
          Conformément au Règlement général sur la protection des données, vous disposez
          d'un droit d'accès, de rectification, d'effacement, de limitation et de portabilité
          de vos données. Pour exercer ces droits, contactez-nous à
          <a href="mailto:contact@iamonjob.fr" className="text-teal-700 hover:underline"> contact@iamonjob.fr</a>.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-teal-800 mb-3">Cookies</h2>
        <p>
          IAMONJOB utilise uniquement des cookies techniques nécessaires au maintien
          de votre session (authentification). Aucun cookie publicitaire ou de mesure
          d'audience n'est déposé.
        </p>
      </section>
    </LegalShell>
  );
}
