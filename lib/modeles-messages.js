// Modèles de messages du conseiller, à compléter avant envoi. Les crochets
// signalent ce qu'il faut remplacer ; le conseiller relit toujours avant
// d'envoyer. Aucun nom de personne : le code suffit, le message est déjà
// adressé à la bonne personne.

export const MODELES_MESSAGES = [
  {
    id: 'rdv',
    label: 'Rappel de rendez-vous',
    texte: "Bonjour,\n\nPetit rappel : nous avons rendez-vous le [jour] à [heure], [lieu].\nPensez à apporter [document ou CV].\n\nÀ bientôt,\n[votre prénom]",
  },
  {
    id: 'questionnaire',
    label: 'Relance de questionnaire',
    texte: "Bonjour,\n\nLa fiche de la semaine vous attend dans « Mes questionnaires ». Elle prend cinq minutes et m'aide à préparer notre prochain échange.\n\nMerci et à bientôt,\n[votre prénom]",
  },
  {
    id: 'bravo',
    label: 'Félicitations',
    texte: "Bonjour,\n\nBravo pour [l'entretien obtenu / la candidature envoyée / votre nouveau poste] ! C'est le fruit de votre travail.\n\n[Prochaine étape éventuelle]\n\n[votre prénom]",
  },
  {
    id: 'nouvelles',
    label: 'Prendre des nouvelles',
    texte: "Bonjour,\n\nCela fait quelque temps que je n'ai pas eu de vos nouvelles. Où en êtes-vous ? Si quelque chose vous bloque, dites-le-moi : on peut en parler en rendez-vous.\n\n[votre prénom]",
  },
  {
    id: 'relance-candidature',
    label: 'Penser à relancer une candidature',
    texte: "Bonjour,\n\nVotre candidature chez [entreprise] date d'une dizaine de jours. C'est le bon moment pour relancer, par un court message ou un appel. Voulez-vous qu'on le prépare ensemble ?\n\n[votre prénom]",
  },
];
