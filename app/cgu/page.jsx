import LegalShell from '@/components/layout/LegalShell';

export const metadata = {
  title: "Conditions d'utilisation — IAMONJOB",
  description: "Conditions générales d'utilisation du service IAMONJOB.",
};

export default function CguPage() {
  return (
    <LegalShell title="Conditions générales d'utilisation" lastUpdated="mai 2026">
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
          Le service est accessible gratuitement après création d'un compte personnel.
          L'utilisateur s'engage à fournir des informations exactes lors de son inscription.
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
        <h2 className="text-xl font-bold text-teal-800 mb-3">5. Modification</h2>
        <p>
          Les présentes conditions peuvent être modifiées à tout moment. La version
          en vigueur est celle accessible en ligne au moment de l'utilisation du service.
        </p>
      </section>
    </LegalShell>
  );
}
