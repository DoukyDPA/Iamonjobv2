import LegalShell from '@/components/layout/LegalShell';

export const metadata = {
  title: 'Aide — IAMONJOB',
  description: "Mode d'emploi simple d'IAMONJOB, étape par étape.",
};

// Mode d'emploi en mots simples. Chaque étape a son ancre (#etape-1 à
// #etape-5) : le bouton « Aide » de l'application ouvre directement la bonne.
const H2 = ({ id, children }) => (
  <h2 id={id} className="scroll-mt-6 text-xl font-bold text-teal-800 mb-3">{children}</h2>
);

export default function AidePage() {
  return (
    <LegalShell title="Aide : comment utiliser IAMONJOB">
      <section>
        <p>
          IAMONJOB vous aide à trouver un métier qui vous correspond, puis à
          répondre à des offres. Il y a 5 étapes. Vous pouvez vous arrêter quand
          vous voulez : votre travail est gardé sur votre compte. Si vous êtes
          perdu, parlez-en à votre conseiller avec le bouton « Mon conseiller ».
        </p>
      </section>

      <section>
        <H2 id="etape-1">Étape 1 : Mon CV</H2>
        <ul className="list-disc ml-6 space-y-1">
          <li>Cliquez sur « Ajouter votre CV » et choisissez le fichier (PDF ou Word), ou collez le texte de votre CV.</li>
          <li>Avant de continuer, enlevez votre nom, votre adresse et votre téléphone. L'outil n'en a pas besoin.</li>
          <li>Cliquez sur « Lancer le diagnostic ». Attendez quelques secondes.</li>
          <li>Vous n'avez pas de CV ? Cliquez sur « Je réalise mon CV avec IAMONCV » : on le fait ensemble, en répondant à des questions.</li>
        </ul>
      </section>

      <section>
        <H2 id="etape-2">Étape 2 : Mes pistes</H2>
        <ul className="list-disc ml-6 space-y-1">
          <li>L'outil vous montre ce que vous savez faire, et des métiers proches de votre expérience.</li>
          <li>« Passage facile » veut dire que le métier ressemble beaucoup à ce que vous faites déjà. « Demande un vrai effort » veut dire qu'il faudra sans doute une formation.</li>
          <li>Cliquez sur l'étoile pour mettre un métier de côté. Vous le retrouvez ensuite dans « Mes métiers ».</li>
          <li>Cliquez sur un métier pour lancer l'enquête.</li>
        </ul>
      </section>

      <section>
        <H2 id="etape-3">Étape 3 : Enquête métier</H2>
        <ul className="list-disc ml-6 space-y-1">
          <li>Vous lisez une fiche sur le métier : ce qu'on y fait, les salaires, les débouchés.</li>
          <li>En bas, vous pouvez poser vos questions, comme à un professionnel du métier.</li>
          <li>Quand le métier vous plaît, cliquez sur « Voir les offres ».</li>
        </ul>
      </section>

      <section>
        <H2 id="etape-4">Étape 4 : Offres d'emploi</H2>
        <ul className="list-disc ml-6 space-y-1">
          <li>L'outil cherche des offres près de chez vous. Vous pouvez changer la ville.</li>
          <li>Vous pouvez écarter les stages et l'alternance.</li>
          <li>Sur une offre qui vous intéresse, cliquez sur « Vérifier ma compatibilité » pour savoir si votre CV y répond.</li>
        </ul>
      </section>

      <section>
        <H2 id="etape-5">Étape 5 : Compatibilité</H2>
        <ul className="list-disc ml-6 space-y-1">
          <li>Le pourcentage indique la correspondance entre votre CV et l'offre. Ce n'est pas une note sur vous.</li>
          <li>Vous voyez vos points forts et ce qui manque.</li>
          <li>L'outil peut écrire une lettre de motivation et vous préparer à l'entretien.</li>
          <li>Relisez toujours la lettre avant de l'envoyer. Vous pouvez aussi l'envoyer à votre conseiller pour avoir son avis.</li>
        </ul>
      </section>

      <section>
        <H2 id="candidatures">Mes candidatures</H2>
        <p>
          Le bouton « Mes candidatures », en haut, regroupe les offres analysées
          et les entreprises à qui écrire spontanément (sans offre).
        </p>
      </section>

      <section>
        <H2 id="cv">Créer mon CV avec IAMONCV</H2>
        <p>
          IAMONCV vous aide à écrire un CV propre, que les logiciels de
          tri des candidatures savent lire. Votre travail est enregistré sur
          votre compte : vous le retrouvez sur n'importe quel ordinateur ou
          téléphone, en vous connectant avec votre code.
        </p>
        <p className="mt-2">
          Pour postuler, cliquez sur <strong>« Télécharger mon CV en PDF »</strong> : le fichier
          arrive tout seul dans vos téléchargements, prêt à joindre. Il est simple, sans photo,
          pour que les logiciels de tri le lisent bien. « Imprimer la mise en page » garde les
          couleurs et la photo, pour un CV papier.
        </p>
      </section>

      <section>
        <H2 id="connexion">Se connecter, mot de passe oublié</H2>
        <ul className="list-disc ml-6 space-y-1">
          <li>Sur la page d'accueil, cliquez sur « J'ai un code ». Tapez votre code (les tirets et les majuscules ne sont pas obligatoires), puis votre mot de passe.</li>
          <li>Mot de passe oublié ? Demandez à votre conseiller de réinitialiser votre accès. Vous choisirez un nouveau mot de passe, comme la première fois. Votre travail n'est pas perdu.</li>
          <li><strong>Connectez-vous au moins une fois par mois.</strong> Sans aucune connexion pendant 30 jours, votre compte, votre CV et vos candidatures sont supprimés automatiquement, sans prévenir (nous n'avons pas votre e-mail).</li>
          <li>Sur téléphone, vous pouvez ajouter IAMONJOB à votre écran d'accueil : dans le menu du navigateur, choisissez « Ajouter à l'écran d'accueil ».</li>
        </ul>
      </section>
    </LegalShell>
  );
}
