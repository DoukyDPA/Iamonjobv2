// ════════════════════════════════════════════════════════════════════════════
// Catalogue des questionnaires de suivi d'accompagnement.
//
// Module pur, partagé client et serveur : aucune dépendance Firebase.
//
// Trois notions :
//   QUESTIONNAIRES  les fiches elles-mêmes, versionnées. Toute modification du
//                   contenu d'une fiche déjà diffusée passe par un nouveau
//                   numéro de version : les réponses gardent la version remplie.
//   PARCOURS        un type d'accompagnement = une suite d'étapes, chacune
//                   pointant vers un questionnaire (ou null si pas encore écrit).
//   SOCLE           les indicateurs communs à toutes les fiches (notes sur 10,
//                   engagement, frein…). Une question les alimente via sa clé
//                   `socle`, ce qui permet de suivre une trajectoire même quand
//                   le module thématique change chaque semaine.
//
// Types de questions :
//   scales    plusieurs notes 0-10        items: [{ id, label, socle? }]
//   choice    un seul choix                options, other?
//   multi     plusieurs choix              options, min?, max?, other?
//   grid      une ligne = un choix         rows: [{ id, label }], options
//   text      réponse courte
//   textarea  réponse longue
//   list      n réponses courtes           count
// `other: true` ajoute « Autre (préciser) » avec un champ libre.
// ════════════════════════════════════════════════════════════════════════════

export const SOCLE_SCORES = [
  { key: 'confiance',  label: 'Confiance' },
  { key: 'moral',      label: 'Moral' },
  { key: 'motivation', label: 'Motivation' },
  { key: 'energie',    label: 'Énergie' },
];

// Briques réutilisées d'une fiche à l'autre.
const OUI_PRESQUE_NON = ['Oui', 'Presque', 'Non'];
const OUI_PARTIE_NON = ['Oui', 'En partie', 'Non'];

const notes = (avecEnergie = false) => ({
  id: 'notes',
  type: 'scales',
  label: 'Si je devais évaluer à ce jour (sur 10) :',
  required: true,
  items: [
    { id: 'confiance', label: 'Mon niveau de confiance en moi', socle: 'confiance' },
    { id: 'moral', label: 'Mon niveau de moral', socle: 'moral' },
    { id: 'motivation', label: 'Mon niveau de motivation', socle: 'motivation' },
    ...(avecEnergie ? [{ id: 'energie', label: "Mon niveau d'énergie", socle: 'energie' }] : []),
  ],
});

const engagementTenu = [
  {
    id: 'engagementTenu',
    type: 'choice',
    label: "J'ai tenu mon engagement de la semaine passée :",
    options: ['Oui', 'Non'],
    socle: 'engagementTenu',
  },
  {
    id: 'obstacle',
    type: 'textarea',
    label: "Sinon, quel obstacle n'aviez-vous pas anticipé ?",
    socle: 'obstacle',
  },
];

const engagementSuivant = {
  id: 'engagement',
  type: 'textarea',
  label: "Cette prochaine semaine, je m'engage à :",
  required: true,
  socle: 'engagement',
};

// ─── Questionnaires PROMO 45+ ────────────────────────────────────────────────
// Reconstruits à partir des fiches remplies par la promo d'octobre 2026.
// Les listes d'options marquées « à vérifier » ont été déduites des réponses :
// à confronter au formulaire d'origine.

const PROMO45_S1 = {
  id: 'promo45-s1',
  version: 1,
  titre: "D'où je pars",
  intro: "Un point de départ honnête. Il n'y a pas de bonne réponse : ce questionnaire sert à mesurer le chemin parcouru dans six semaines.",
  sections: [
    {
      titre: "D'où est-ce que je pars ?",
      questions: [
        {
          id: 'situation',
          type: 'choice',
          label: "Aujourd'hui, je me reconnais plutôt dans cette situation :",
          options: [
            "J'ai un projet professionnel clair",
            "J'ai plusieurs idées mais j'hésite",
            'Mon projet ne me convainc plus',
            "Je n'ai aucune idée de ce que je veux faire",
          ],
          other: true,
          required: true,
        },
        notes(),
      ],
    },
    {
      titre: 'Ce que je ne veux plus',
      questions: [
        { id: 'neVeuxPlus', type: 'list', count: 3, label: 'Citez 3 choses que vous ne souhaitez plus retrouver dans votre futur emploi :' },
      ],
    },
    {
      titre: 'Ce qui compte vraiment pour moi',
      questions: [
        {
          id: 'criteres',
          type: 'multi',
          label: 'Parmi cette liste, cochez entre 3 et 5 éléments maximum :',
          min: 3,
          max: 5,
          // à vérifier
          options: [
            'Autonomie', 'Salaire', 'Stabilité', 'Respect', "Esprit d'équipe",
            'Utilité', 'Reconnaissance', 'Apprendre', 'Responsabilités', 'Transmission',
            'Proximité du domicile', 'Équilibre vie professionnelle / vie personnelle',
          ],
          other: true,
        },
      ],
    },
    {
      titre: "Mes points d'appui",
      questions: [
        { id: 'forces', type: 'textarea', label: "Quelles sont aujourd'hui vos 3 principales forces ?" },
        { id: 'fierte', type: 'textarea', label: 'De quoi êtes-vous le plus fier ou fière dans votre parcours ?' },
      ],
    },
    {
      titre: 'Mon projet tient-il la route ?',
      questions: [
        { id: 'projetPrincipal', type: 'textarea', label: "Quel est aujourd'hui votre projet principal ou le métier qui vous attire le plus ? Pourquoi ?", socle: 'metierVise' },
        {
          id: 'evalPrincipal',
          type: 'scales',
          label: 'Évaluez-le (sur 10) :',
          items: [
            { id: 'envie', label: "J'ai envie de faire ce métier" },
            { id: 'capacite', label: 'Je pense pouvoir y arriver' },
            { id: 'opportunites', label: "Je pense qu'il existe des opportunités" },
          ],
        },
        { id: 'doutePrincipal', type: 'textarea', label: "Qu'est-ce qui vous fait aujourd'hui le plus douter de ce projet ?" },
        { id: 'projetSecondaire', type: 'textarea', label: 'Avez-vous un projet secondaire ? Lequel ?' },
        {
          id: 'evalSecondaire',
          type: 'scales',
          label: 'Évaluez-le (sur 10) :',
          items: [
            { id: 'envie', label: "J'ai envie de faire ce métier" },
            { id: 'capacite', label: 'Je pense pouvoir y arriver' },
            { id: 'opportunites', label: "Je pense qu'il existe des opportunités" },
          ],
        },
        { id: 'douteSecondaire', type: 'textarea', label: "Qu'est-ce qui vous fait aujourd'hui le plus douter de ce projet ?" },
      ],
    },
    {
      titre: 'Mon cap pour PROMO 45+',
      questions: [
        { id: 'capFin', type: 'textarea', label: 'À la fin de PROMO 45+, je veux pouvoir dire :', socle: 'cap' },
        engagementSuivant,
      ],
    },
  ],
};

const PROMO45_S2 = {
  id: 'promo45-s2',
  version: 1,
  titre: 'Mon CV',
  intro: "Cette semaine, on regarde votre CV avec les yeux d'un recruteur pressé : 30 secondes, pas plus.",
  sections: [
    {
      titre: 'Mon évolution personnelle',
      questions: [
        notes(),
        { id: 'change', type: 'textarea', label: "Qu'est-ce qui a changé depuis la semaine passée ?", socle: 'change' },
      ],
    },
    {
      titre: 'Mon projet est-il toujours le même ?',
      questions: [
        { id: 'metierVise', type: 'text', label: 'Notez votre projet ou métier visé à ce jour :', socle: 'metierVise' },
        {
          id: 'evolutionProjet',
          type: 'choice',
          label: 'Depuis la semaine dernière :',
          options: ["Il n'a pas changé", 'Il a légèrement évolué', 'Il est plus clair', 'Il a complètement changé'],
        },
        { id: 'raisonEvolution', type: 'textarea', label: "S'il a évolué ou changé, qu'est-ce qui vous a amené à le faire évoluer ?" },
      ],
    },
    {
      titre: 'Mon CV donne-t-il envie de me recruter ?',
      questions: [
        {
          id: 'cvEnvie',
          type: 'grid',
          label: 'Si vous lisez votre CV en 30 secondes, pouvez-vous affirmer que :',
          options: OUI_PRESQUE_NON,
          rows: [
            { id: 'metier', label: 'Il permet de comprendre rapidement le métier que je recherche.' },
            { id: 'competences', label: 'Il met clairement en valeur mes principales compétences.' },
            { id: 'coherence', label: 'Il est cohérent avec mon projet professionnel.' },
          ],
        },
      ],
    },
    {
      titre: 'Les preuves de mes compétences',
      questions: [
        { id: 'competences', type: 'list', count: 3, label: 'Choisissez 3 compétences importantes pour votre projet et notez-les :' },
        {
          id: 'preuves',
          type: 'grid',
          label: 'Pour chaque compétence choisie, mon CV apporte-t-il une preuve ?',
          options: ['Oui', 'Non'],
          rows: [
            { id: 'c1', label: 'Compétence 1' },
            { id: 'c2', label: 'Compétence 2' },
            { id: 'c3', label: 'Compétence 3' },
          ],
        },
        { id: 'ajouts', type: 'textarea', label: "Si vous avez répondu non à l'une des questions, que pourriez-vous ajouter ?" },
      ],
    },
    {
      titre: 'Ce qui manque encore',
      questions: [
        {
          id: 'manque',
          type: 'multi',
          label: "Aujourd'hui, mon CV manque principalement de :",
          // à vérifier
          options: ['Résultats chiffrés', 'Compétences', 'Accroche', 'Intitulé de poste', 'Expériences', 'Formation', 'Mise en page', 'Mots-clés'],
          other: true,
        },
      ],
    },
    {
      titre: 'Mon cap PROMO 45+',
      questions: [
        ...engagementTenu,
        {
          id: 'capable',
          type: 'multi',
          label: 'À la fin de cette semaine, je suis capable de dire :',
          options: [
            'Mon CV est cohérent avec mon projet professionnel.',
            'Mon CV met en valeur mes compétences.',
            'Mon CV est lisible par les ATS (revoir ce point avec le CBE si besoin).',
            "Je sais expliquer les choix que j'ai faits sur mon CV.",
            'Je sais ce que je dois améliorer.',
          ],
          socle: 'capable',
        },
        engagementSuivant,
      ],
    },
  ],
};

const PROMO45_S3 = {
  id: 'promo45-s3',
  version: 1,
  titre: 'Terrain et crédibilité',
  intro: "Ce que le terrain vous a appris, et ce que vous êtes prêt ou prête à défendre face à un recruteur.",
  sections: [
    {
      titre: 'Mon évolution personnelle',
      questions: [
        notes(),
        { id: 'change', type: 'textarea', label: "Depuis mon entretien individuel de point d'étape, qu'est-ce qui a le plus changé dans ma façon de voir ma recherche d'emploi ?", socle: 'change' },
      ],
    },
    {
      titre: "Ce que le terrain m'a appris",
      questions: [
        {
          id: 'terrain',
          type: 'multi',
          label: 'Depuis le début de cette semaine…',
          options: [
            "J'ai découvert des métiers auxquels je n'avais pas pensé.",
            "J'ai confirmé mon projet.",
            "J'ai identifié des compétences à développer.",
            "J'ai compris ce qu'attendent les recruteurs.",
            "J'ai revu certaines idées que je pensais vraies.",
            "Rien ne m'a surpris(e).",
          ],
        },
      ],
    },
    {
      titre: 'Suis-je crédible ?',
      questions: [
        {
          id: 'credible',
          type: 'grid',
          label: "Aujourd'hui, je pense être capable de :",
          options: OUI_PRESQUE_NON,
          rows: [
            { id: 'pitch', label: 'Expliquer clairement mon projet en moins de deux minutes' },
            { id: 'pourquoiVous', label: 'Répondre à la question « Pourquoi vous ? »' },
            { id: 'exemples', label: 'Donner un exemple concret de chacune de mes principales compétences' },
            { id: 'motivation', label: "Montrer ma motivation sans avoir l'air de réciter un texte appris" },
          ],
        },
        { id: 'aProgresser', type: 'textarea', label: 'Sur lequel de ces points avez-vous encore le plus besoin de progresser ? Pourquoi ?' },
      ],
    },
    {
      titre: 'Mon projet face au marché',
      questions: [
        {
          id: 'marche',
          type: 'grid',
          label: 'Pour chacune des affirmations, cochez la réponse qui vous correspond :',
          options: OUI_PARTIE_NON,
          rows: [
            { id: 'entreprises', label: 'Je connais les entreprises qui recrutent dans mon domaine.' },
            { id: 'offres', label: 'Je sais où trouver des offres pertinentes.' },
            { id: 'apport', label: 'Je sais ce que je peux apporter à une entreprise.' },
          ],
        },
      ],
    },
    {
      titre: "Mes freins aujourd'hui",
      questions: [
        {
          id: 'freins',
          type: 'multi',
          label: "Aujourd'hui, ce qui me freine le plus est :",
          // à vérifier
          options: [
            'Mon âge',
            "La peur d'être refusé(e)",
            'Le manque de confiance',
            'La difficulté à parler de moi',
            'Le manque de réseau',
            'La fatigue',
            'Je reporte certaines démarches',
          ],
          other: true,
          socle: 'frein',
        },
        { id: 'petitPas', type: 'textarea', label: 'Quel petit pas pourriez-vous faire dès lundi pour dépasser ce(s) frein(s) ?', socle: 'petitPas' },
      ],
    },
    {
      titre: "Les retours que j'ai reçus",
      questions: [
        { id: 'retours', type: 'textarea', label: 'Cette semaine, quel retour reçu vous a été le plus utile ?' },
      ],
    },
    {
      titre: 'Mon cap PROMO 45+',
      questions: [
        ...engagementTenu,
        {
          id: 'capable',
          type: 'multi',
          label: 'À ce stade du parcours, je suis capable de dire :',
          // à vérifier
          options: [
            'Mon projet est réaliste.',
            'Je connais mieux les attentes des recruteurs.',
            'Je sais quelles actions mener la semaine prochaine.',
          ],
          socle: 'capable',
        },
        engagementSuivant,
      ],
    },
  ],
};

const PROMO45_S4 = {
  id: 'promo45-s4',
  version: 1,
  titre: "Passage à l'action",
  intro: 'Plus que deux semaines. Où en est vraiment votre recherche ?',
  sections: [
    {
      titre: 'Mon évolution personnelle',
      questions: [notes(true)],
    },
    {
      titre: 'Le chemin parcouru',
      questions: [
        { id: 'progression', type: 'textarea', label: 'Quelle est votre plus grande progression depuis le début du parcours ?', socle: 'change' },
      ],
    },
    {
      titre: 'Ce qui se passe dans ma tête',
      questions: [
        {
          id: 'reaction',
          type: 'multi',
          label: "Lorsque vous pensez à votre recherche d'emploi aujourd'hui, quelle est votre première réaction ?",
          // à vérifier
          options: [
            "J'ai envie d'y aller, je me mets dans l'action.",
            "J'hésite encore.",
            'Je remets souvent certaines démarches au lendemain.',
            'Je ne sais pas vraiment par quoi commencer.',
            "J'attends que ma candidature soit encore meilleure avant de l'envoyer.",
          ],
          other: true,
        },
        { id: 'frein', type: 'textarea', label: 'Quel est le principal frein qui pourrait encore ralentir votre passage à l\'action ?', socle: 'frein' },
        { id: 'petitPas', type: 'textarea', label: 'Quelle petite action concrète pourriez-vous réaliser dès lundi pour le dépasser ?', socle: 'petitPas' },
      ],
    },
    {
      titre: "Ma recherche d'emploi est-elle vraiment lancée ?",
      questions: [
        {
          id: 'cetteSemaine',
          type: 'multi',
          label: "Cette semaine, j'ai :",
          // à vérifier
          options: [
            'envoyé au moins une candidature',
            'relancé une candidature',
            'identifié de nouvelles entreprises',
            'contacté une personne de mon réseau',
            'Aucune de ces actions',
          ],
        },
        {
          id: 'profil',
          type: 'choice',
          label: "Lequel de ces profils vous ressemble le plus aujourd'hui ?",
          // à vérifier
          options: [
            "J'attends encore avant de passer à l'action.",
            'Je continue à modifier mes candidatures avant de les envoyer.',
            "J'ai commencé à postuler mais je manque de régularité.",
            'Je postule régulièrement.',
          ],
        },
        { id: 'empechement', type: 'textarea', label: "Si vous n'êtes pas encore dans une démarche de candidature active, qu'est-ce qui vous en empêche aujourd'hui et qu'est-ce qui pourrait changer cela selon vous ?" },
      ],
    },
    {
      titre: 'Le compte à rebours est lancé',
      questions: [
        { id: 'attentes', type: 'textarea', label: "Qu'attendez-vous le plus des deux dernières semaines ?" },
      ],
    },
    {
      titre: 'Mon regard sur moi',
      questions: [
        { id: 'fier', type: 'textarea', label: "Aujourd'hui, je suis fier(ère) de…" },
        { id: 'besoinAide', type: 'textarea', label: "J'ai encore besoin d'aide pour…" },
      ],
    },
    {
      titre: 'Mon cap PROMO 45+',
      questions: [...engagementTenu, engagementSuivant],
    },
  ],
};

export const QUESTIONNAIRES = {
  [PROMO45_S1.id]: PROMO45_S1,
  [PROMO45_S2.id]: PROMO45_S2,
  [PROMO45_S3.id]: PROMO45_S3,
  [PROMO45_S4.id]: PROMO45_S4,
};

// ─── Parcours (types d'accompagnement) ───────────────────────────────────────

export const PARCOURS = {
  promo45: {
    id: 'promo45',
    label: 'PROMO 45+',
    description: 'Parcours collectif de six semaines pour les 45 ans et plus.',
    etapes: [
      { n: 1, label: 'Semaine 1', questionnaireId: 'promo45-s1' },
      { n: 2, label: 'Semaine 2', questionnaireId: 'promo45-s2' },
      { n: 3, label: 'Semaine 3', questionnaireId: 'promo45-s3' },
      { n: 4, label: 'Semaine 4', questionnaireId: 'promo45-s4' },
      { n: 5, label: 'Semaine 5', questionnaireId: null },
      { n: 6, label: 'Semaine 6', questionnaireId: null },
    ],
  },
};

export function getParcours(id) {
  return (id && PARCOURS[id]) || null;
}

export function getQuestionnaire(id) {
  return (id && QUESTIONNAIRES[id]) || null;
}

export const AUTRE = 'Autre (préciser)';

// Toutes les questions d'une fiche, à plat.
export function allQuestions(q) {
  return (q?.sections || []).flatMap((s) => s.questions.map((qq) => ({ ...qq, section: s.titre })));
}

// ─── Validation et nettoyage d'une réponse ───────────────────────────────────
// Ne garde que les clés connues, coupe les textes trop longs, borne les notes.
// Renvoie { answers, missing } : missing liste les questions obligatoires vides.

const MAX_TEXT = 3000;
const clip = (v, n = MAX_TEXT) => String(v ?? '').trim().slice(0, n);

export function sanitizeAnswers(questionnaire, raw = {}) {
  const answers = {};
  const missing = [];
  for (const q of allQuestions(questionnaire)) {
    const v = raw?.[q.id];
    let out;
    switch (q.type) {
      case 'scales': {
        out = {};
        for (const it of q.items) {
          const n = Number(v?.[it.id]);
          if (v?.[it.id] !== undefined && v?.[it.id] !== null && v?.[it.id] !== '' && Number.isFinite(n)) {
            out[it.id] = Math.max(0, Math.min(10, Math.round(n)));
          }
        }
        if (q.required && Object.keys(out).length < q.items.length) missing.push(q.id);
        if (!Object.keys(out).length) out = undefined;
        break;
      }
      case 'choice': {
        const val = clip(v?.value ?? v, 300);
        const ok = q.options.includes(val) || (q.other && val === AUTRE);
        if (ok) {
          out = { value: val };
          if (val === AUTRE) out.other = clip(v?.other, 500);
        }
        if (q.required && !out) missing.push(q.id);
        break;
      }
      case 'multi': {
        const vals = Array.isArray(v?.values) ? v.values : [];
        const allowed = q.other ? [...q.options, AUTRE] : q.options;
        let picked = [...new Set(vals.map((x) => clip(x, 300)).filter((x) => allowed.includes(x)))];
        if (q.max) picked = picked.slice(0, q.max);
        if (picked.length) {
          out = { values: picked };
          if (picked.includes(AUTRE)) out.other = clip(v?.other, 500);
        }
        if (q.required && !out) missing.push(q.id);
        break;
      }
      case 'grid': {
        out = {};
        for (const r of q.rows) {
          const val = clip(v?.[r.id], 100);
          if (q.options.includes(val)) out[r.id] = val;
        }
        if (q.required && Object.keys(out).length < q.rows.length) missing.push(q.id);
        if (!Object.keys(out).length) out = undefined;
        break;
      }
      case 'list': {
        const arr = Array.isArray(v) ? v : [];
        out = Array.from({ length: q.count }, (_, i) => clip(arr[i], 500));
        if (!out.some(Boolean)) out = undefined;
        if (q.required && !out) missing.push(q.id);
        break;
      }
      default: {
        const t = clip(v, q.type === 'text' ? 300 : MAX_TEXT);
        out = t || undefined;
        if (q.required && !out) missing.push(q.id);
      }
    }
    if (out !== undefined) answers[q.id] = out;
  }
  return { answers, missing };
}

// ─── Lecture des réponses ───────────────────────────────────────────────────

// Valeur lisible d'une réponse (pour l'affichage conseiller et le socle).
export function formatAnswer(q, a) {
  if (a === undefined || a === null) return '';
  switch (q.type) {
    case 'scales':
      return q.items.map((it) => `${it.label} : ${a[it.id] ?? '–'}`).join(' · ');
    case 'choice':
      return a.value === AUTRE ? `Autre : ${a.other || ''}`.trim() : a.value;
    case 'multi':
      return a.values.map((x) => (x === AUTRE ? `Autre : ${a.other || ''}`.trim() : x)).join(' ; ');
    case 'grid':
      return q.rows.map((r) => `${r.label} ${a[r.id] ?? '–'}`).join(' · ');
    case 'list':
      return a.filter(Boolean).join(' ; ');
    default:
      return String(a);
  }
}

// Détail à plat : [{ section, question, reponse }], même format que les fiches
// archivées, pour que la vue conseiller les affiche de la même façon.
export function toDetail(questionnaire, answers = {}) {
  const out = [];
  for (const q of allQuestions(questionnaire)) {
    const a = answers[q.id];
    if (a === undefined) continue;
    if (q.type === 'grid') {
      for (const r of q.rows) if (a[r.id]) out.push({ section: q.section, question: r.label, reponse: a[r.id] });
    } else if (q.type === 'scales') {
      for (const it of q.items) if (a[it.id] !== undefined) out.push({ section: q.section, question: it.label, reponse: String(a[it.id]) });
    } else {
      out.push({ section: q.section, question: q.label, reponse: formatAnswer(q, a) });
    }
  }
  return out;
}

// Indicateurs communs extraits d'une réponse.
export function computeSocle(questionnaire, answers = {}) {
  const socle = {};
  for (const q of allQuestions(questionnaire)) {
    const a = answers[q.id];
    if (q.type === 'scales') {
      for (const it of q.items) if (it.socle && a?.[it.id] !== undefined) socle[it.socle] = a[it.id];
      continue;
    }
    if (!q.socle || a === undefined) continue;
    if (q.socle === 'capable') {
      socle.capable = a.values || [];
    } else if (q.socle === 'engagementTenu') {
      socle.engagementTenu = a.value || '';
    } else {
      socle[q.socle] = formatAnswer(q, a);
    }
  }
  return socle;
}
