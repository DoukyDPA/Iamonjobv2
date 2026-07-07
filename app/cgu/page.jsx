import LegalShell from '@/components/layout/LegalShell';

export const metadata = {
  title: "Conditions d'utilisation — IAMONJOB",
  description: "Conditions générales d'utilisation du service IAMONJOB.",
};

export default function CguPage() {
  return (
    <LegalShell title="Conditions générales d'utilisation" lastUpdated="juillet 2026">
      <section>
        <h2 className="text-xl font-bold text-teal-800 mb-3">1. Objet</h2>
        <p>
          Les présentes conditions définissent les modalités d'utilisation du service
          IAMONJOB, plateforme d'accompagnement à la reconversion professionnelle
          fondée sur l'intelligence artificielle.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-teal-800 mb-3">2. Accès au service</h2>
        <p>
          Le service est accessible gratuitement, soit après création d'un compte personnel,
          soit, pour les personnes accompagnées, au moyen d'un code remis par leur conseiller.
          L'utilisateur s'engage à fournir des informations exactes.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-teal-800 mb-3">3. Nature de l'accompagnement</h2>
        <p>
          IAMONJOB fournit une aide à la décision : les analyses et suggestions générées
          par l'IA sont <strong>indicatives</strong> et ne sauraient se substituer à
          l'avis d'un conseiller en évolution professionnelle. L'utilisateur reste seul
          décideur de ses choix de carrière.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-teal-800 mb-3">4. Responsabilité</h2>
        <p>
          IAMONJOB s'efforce d'assurer la disponibilité et la fiabilité du service mais
          ne peut garantir une absence totale d'erreurs ou d'interruptions. L'utilisation
          du service se fait sous la propre responsabilité de l'utilisateur.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-teal-800 mb-3">5. Protection des données</h2>
        <p>
          Le traitement des données personnelles est décrit dans la{' '}
          <a href="/confidentialite" className="text-teal-700 hover:underline">politique de confidentialité</a>.
          Pour les personnes accompagnées, l'utilisation du CV repose sur un consentement libre,
          tracé et révocable à tout moment.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-teal-800 mb-3">6. Modification</h2>
        <p>
          Les présentes conditions peuvent être modifiées à tout moment. La version
          en vigueur est celle accessible en ligne au moment de l'utilisation du service.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-teal-800 mb-3">7. Droit applicable et juridiction</h2>
        <p>
          Les présentes conditions sont soumises au <strong>droit français</strong>. En cas de litige,
          et à défaut de résolution amiable, les tribunaux français sont seuls compétents. La personne
          concernée peut aussi saisir la CNIL pour toute question relative à ses données personnelles.
        </p>
      </section>
    </LegalShell>
  );
}
