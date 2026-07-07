import LegalShell from '@/components/layout/LegalShell';

export const metadata = {
  title: 'Politique de confidentialité — IAMONJOB',
  description: 'Politique de confidentialité et de protection des données personnelles.',
};

export default function ConfidentialitePage() {
  return (
    <LegalShell title="Politique de confidentialité" lastUpdated="juillet 2026">
      <section>
        <h2 className="text-xl font-bold text-teal-800 mb-3">Responsable du traitement</h2>
        <p>
          IAMONJOB est édité par le <strong>CBE Sud 94</strong>, 1 rue de la Corderie, Centra 328,
          94586 Rungis Cedex (SIRET 413 705 112 00022). Pour toute question sur vos données ou pour
          exercer vos droits, écrivez à{' '}
          <a href="mailto:contact@cbe-sud94.org" className="text-teal-700 hover:underline">contact@cbe-sud94.org</a>.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-teal-800 mb-3">Deux façons d'accéder au service</h2>
        <p>
          Vous pouvez créer un compte classique avec une adresse email et un mot de passe. Si vous
          êtes accompagné par un conseiller, vous accédez autrement : votre conseiller vous remet
          un code, et vous choisissez votre mot de passe. Dans ce cas, <strong>aucune adresse email
          n'est demandée</strong> et vous êtes identifié par ce code, jamais par votre nom.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-teal-800 mb-3">Données collectées</h2>
        <p>Nous collectons seulement ce qui est nécessaire au service :</p>
        <ul className="list-disc ml-6 mt-2 space-y-1 text-sm">
          <li>Pour un compte classique : adresse email et mot de passe (chiffré) ;</li>
          <li>Pour un accès accompagné : un code pseudonyme et un mot de passe (chiffré), sans email ;</li>
          <li>Le texte de votre CV, pour générer des analyses personnalisées ;</li>
          <li>Vos préférences d'affichage (taille de texte, contraste).</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-bold text-teal-800 mb-3">Comment votre CV est traité</h2>
        <p>
          À la première étape, votre CV <strong>n'est pas envoyé à l'intelligence artificielle</strong>.
          Il est d'abord transformé en texte, que vous pouvez relire et corriger. Un outil
          d'anonymisation vous permet de retirer votre nom, votre e-mail et votre téléphone en un
          clic. L'analyse est un peu moins fine sur un CV anonymisé, mais nous faisons le choix de
          protéger vos données d'abord.
        </p>
        <p className="mt-3">
          Ce n'est qu'ensuite, quand vous lancez l'analyse, que ce texte est envoyé à un modèle
          d'intelligence artificielle. Le modèle par défaut est <strong>Mistral, une entreprise
          française</strong>, donc un traitement en Europe. Pour les personnes accompagnées par un
          conseiller, ce traitement européen est <strong>garanti</strong> : aucun recours à un
          service hors Union européenne. Pour les comptes classiques, le modèle Google Gemini peut
          servir de secours en cas d'indisponibilité, auquel cas le traitement peut avoir lieu hors
          Union européenne.
        </p>
        <p className="mt-3">
          Votre CV est ensuite enregistré de façon chiffrée sur votre compte, pour vos prochaines
          sessions. Il reste accessible par vous seul. Votre conseiller n'y accède qu'avec votre
          accord.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-teal-800 mb-3">Sécurité, hébergement et localisation</h2>
        <p>
          Les échanges avec le service sont chiffrés en transit (protocole TLS). Vos données sont
          chiffrées au repos par notre hébergeur de base de données. Aucune mesure de sécurité n'est
          absolue, mais nous appliquons des protections raisonnables et à jour.
        </p>
        <p className="mt-3">
          Vos données personnelles (CV, préférences) sont stockées sur Google Cloud Firestore, dans
          une <strong>région européenne</strong> (Belgique et Pays-Bas), avec chiffrement au repos.
          L'analyse par IA des personnes accompagnées est réalisée en <strong>Europe</strong>
          (Mistral, France), sans recours à un service hors Union européenne. La partie logicielle de
          l'application est exécutée par Railway (États-Unis) ; ce serveur traite les requêtes le
          temps d'un échange, mais ne conserve pas votre CV.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-teal-800 mb-3">Sous-traitants</h2>
        <p>Pour fournir le service, nous faisons appel aux prestataires suivants :</p>
        <ul className="list-disc ml-6 mt-2 space-y-1 text-sm">
          <li><strong>Mistral</strong> (France) : analyse du CV par intelligence artificielle ;</li>
          <li><strong>Google Gemini</strong> (Google) : secours d'analyse pour les comptes classiques uniquement ;</li>
          <li><strong>Google Cloud / Firebase</strong> : authentification et stockage des données ;</li>
          <li><strong>Railway</strong> (États-Unis) : hébergement de l'application, sans conservation du CV.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-bold text-teal-800 mb-3">Consentement des personnes accompagnées</h2>
        <p>
          Si vous êtes accompagné, l'utilisation de votre CV repose sur votre consentement, recueilli
          à l'activation de votre accès. Ce consentement est libre, tracé, et vous pouvez le retirer
          à tout moment en nous écrivant. Son retrait arrête tout nouveau traitement de vos données.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-teal-800 mb-3">Conservation et effacement</h2>
        <p>
          Votre CV et vos données restent tant que votre compte existe. La suppression de votre
          compte efface votre CV et votre compte d'authentification, de façon définitive. L'effacement
          est immédiat, et au plus tard sous 30 jours. Vous pouvez le déclencher vous-même depuis
          l'application, ou nous le demander par email.
        </p>
        <p className="mt-3">
          Nous ne revendons jamais vos données et ne les utilisons pas à des fins publicitaires.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-teal-800 mb-3">Vos droits (RGPD)</h2>
        <p>
          Conformément au Règlement général sur la protection des données, vous disposez d'un droit
          d'accès, de rectification, d'effacement, de limitation et de portabilité de vos données.
          Pour les exercer, contactez-nous à{' '}
          <a href="mailto:contact@cbe-sud94.org" className="text-teal-700 hover:underline">contact@cbe-sud94.org</a>.
          Nous répondons dans un délai maximum de 30 jours.
        </p>
        <p className="mt-3">
          Si vous estimez que vos droits ne sont pas respectés, vous pouvez saisir la Commission
          nationale de l'informatique et des libertés (CNIL),{' '}
          <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer" className="text-teal-700 hover:underline">www.cnil.fr</a>.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-teal-800 mb-3">Cookies</h2>
        <p>
          IAMONJOB utilise uniquement des cookies techniques nécessaires au maintien de votre session
          (authentification). Aucun cookie publicitaire ou de mesure d'audience n'est déposé.
        </p>
      </section>
    </LegalShell>
  );
}
