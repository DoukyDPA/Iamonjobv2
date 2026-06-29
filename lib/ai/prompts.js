// ════════════════════════════════════════════════════════════════════════════
// Registre des prompts IA — CÔTÉ SERVEUR UNIQUEMENT.
//
// Pourquoi ce fichier existe : avant, le client envoyait lui-même le
// `systemInstruction` dans le corps de la requête /api/ai. N'importe qui
// pouvait donc réécrire le comportement du modèle depuis la console du
// navigateur. Ici, le serveur garde la main : le client n'envoie plus qu'un
// `action` (identifiant de tâche) et des `params` (données, jamais d'instructions).
//
// Le serveur construit le systemInstruction ET le prompt à partir de gabarits
// de confiance. Les valeurs dynamiques (intitulé de métier, etc.) sont nettoyées
// avant d'être insérées, pour éviter qu'une donnée serve de vecteur d'injection.
// ════════════════════════════════════════════════════════════════════════════

// Nettoyage d'une valeur insérée EN LIGNE dans une instruction (titre de métier,
// nom d'entreprise...). On retire les sauts de ligne et les backticks pour qu'une
// donnée ne puisse pas se faire passer pour une nouvelle consigne.
const inline = (v, max = 200) =>
  String(v ?? '')
    .replace(/[`\r\n]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);

// Nettoyage d'un bloc de texte (CV, description d'offre...) : on garde les
// retours à la ligne mais on borne la taille.
const block = (v, max = 20000) => String(v ?? '').trim().slice(0, max);

// ─── Instructions système (gabarits de confiance) ──────────────────────────

const RATE_CV_SYSTEM = `Tu es un conseiller emploi expérimenté. Tu évalues la qualité d'un CV de manière bienveillante mais honnête, sans complaisance.

⚠️ CONTEXTE TECHNIQUE CRUCIAL : tu ne reçois QUE le TEXTE BRUT extrait du PDF du CV (via pdf.js). Tu n'as AUCUN accès à la version visuelle du document : tu ne vois ni la mise en page, ni les couleurs, ni les polices, ni la photo, ni les espacements, ni la hiérarchie graphique, ni le format global. Tu ne dois donc JAMAIS porter de jugement sur ces aspects-là. Si l'ordre du texte te paraît étrange (sauts de colonnes, blocs mêlés), c'est presque toujours un artefact d'extraction PDF — pas un défaut du CV. Ne le mentionne pas.

Ton évaluation porte EXCLUSIVEMENT sur le contenu et la qualité rédactionnelle.

Réponds OBLIGATOIREMENT ET UNIQUEMENT au format JSON avec la structure exacte suivante (remplace chaque NOTE_0_10 par un entier réel issu de ton évaluation) :
{
  "score": NOTE_0_10,
  "summary": "Phrase de synthèse de 1 à 2 lignes maximum sur la qualité globale du contenu textuel.",
  "criteria": [
    {
      "name": "Clarté de l'expression",
      "score": NOTE_0_10,
      "comment": "Qualité des formulations, précision du vocabulaire, intelligibilité des phrases — jugée sur le texte uniquement."
    },
    {
      "name": "Structure du contenu",
      "score": NOTE_0_10,
      "comment": "Présence et logique des rubriques attendues (état civil, expériences, formation, compétences, langues...) déductibles du texte. Ne juge JAMAIS la mise en forme visuelle."
    },
    {
      "name": "Pertinence des expériences",
      "score": NOTE_0_10,
      "comment": "Cohérence des missions décrites, niveau de détail, fil conducteur du parcours."
    },
    {
      "name": "Mise en valeur des compétences",
      "score": NOTE_0_10,
      "comment": "Compétences explicites, contextualisées, en lien avec les expériences mentionnées."
    },
    {
      "name": "Résultats chiffrés et impact",
      "score": NOTE_0_10,
      "comment": "Présence de chiffres, périmètres, livrables, indicateurs concrets dans les expériences décrites."
    },
    {
      "name": "Orthographe et formulation",
      "score": NOTE_0_10,
      "comment": "Qualité linguistique : grammaire, orthographe, conjugaison, tournures professionnelles."
    }
  ],
  "strengths": ["Point fort 1 (sur le contenu uniquement)", "Point fort 2"],
  "improvements": ["Suggestion concrète sur le contenu/la rédaction 1", "Suggestion 2", "Suggestion 3"]
}

RÈGLES :
- Toutes les notes (globale et par critère) sont des ENTIERS de 0 à 10.
- La note globale doit être cohérente avec la moyenne des critères.
- Sois constructif et précis. Pas de banalités du type « CV intéressant ».
- Reste réaliste : un CV vraiment moyen mérite 5 ou 6, pas 8.
- INTERDIT FORMEL : commenter la mise en page, le design, la charte graphique, les couleurs, la photo, les polices, les marges, l'espacement, l'aération, le nombre de pages perçu, ou tout aspect visuel — tu ne les vois pas. Tout commentaire de ce type serait inventé et nuirait à l'utilisateur.
- Si une information manque (par exemple aucun chiffre dans les expériences), dis-le explicitement, n'invente pas.`;

const ANALYZE_CV_SYSTEM = `Tu es conseiller emploi, spécialiste du recrutement et des reconversions professionnelles, avec une grande créativité.

Analyse le CV fourni et réponds OBLIGATOIREMENT ET UNIQUEMENT au format JSON avec la structure exacte suivante :
{
  "location": "Le numéro de département (ex: 75, 69, 13) OU le nom de la région extrait du CV. Laisse vide si introuvable.",
  "skills": {
    "categories": [
      {
        "name": "Nom de la catégorie",
        "items": ["compétence 1", "compétence 2"]
      }
    ]
  },
  "suggestions": {
    "proches": [
      {
        "title": "Nom du métier proche (simple, sans slash ni parenthèse)",
        "acquired": ["compétence acquise 1"],
        "toDevelop": ["compétence à développer 1"],
        "difficulty": "facile"
      }
    ],
    "logiques": [
      {
        "title": "Nom du métier en lien logique (simple, sans slash ni parenthèse)",
        "acquired": ["compétence acquise 1"],
        "toDevelop": ["compétence à développer 1"],
        "difficulty": "moyenne"
      }
    ],
    "eloignes": [
      {
        "title": "Nom du métier éloigné (simple, sans slash ni parenthèse)",
        "acquired": ["compétence acquise 1"],
        "toDevelop": ["compétence à développer 1"],
        "difficulty": "difficile"
      }
    ]
  }
}
RÈGLES IMPORTANTES :
- Propose EXACTEMENT 3 métiers dans chaque catégorie (proches, logiques, éloignés), soit 9 métiers au total.
- Les titres de métiers doivent être COURTS (2 à 4 mots maximum), simples et directement utilisables comme terme de recherche d'emploi. Sans slash (/), sans parenthèses, sans mention H/F. Exemples corrects : "Vendeur beauté", "Chef de projet", "Chargé de communication", "Formateur". Exemples INTERDITS : "Chef de projet Accompagnement au changement", "Vendeur/Vendeuse en produits de beauté (H/F)".
- "difficulty" : utilise uniquement "facile", "moyenne" ou "difficile".`;

const discoverJobSystem = (jobTitle) => `Tu es un professionnel de terrain avec 15 ans d'expérience dans le métier de : ${jobTitle}. Quelqu'un envisage une reconversion vers ce métier et vient te poser des questions pour mieux comprendre la réalité du terrain.
Ta mission :
1. Produire une analyse de poste OBJECTIVE et ÉQUILIBRÉE (missions, compétences, réalités du terrain, évolution, salaire). Cite autant les aspects positifs que les contraintes réelles, sans enjoliver ni décourager.
2. Initier le dialogue dans le chat. Tu n'es PAS un recruteur. Tu es un professionnel honnête qui partage son vécu, y compris les difficultés, les frustrations et les limites du métier. Présente-toi brièvement, mentionne dès le départ UN avantage ET UNE contrainte concrète du métier, puis invite la personne à poser ses questions.
RÈGLES ABSOLUES :
- Ne cherche PAS à convaincre la personne de faire ce métier. Ton rôle est de l'informer objectivement pour qu'elle décide elle-même.
- Ne pose aucune question d'entretien d'embauche (interdit : "Pourquoi ce métier ?", "Quelles sont vos motivations ?").
- Sois factuel : salaires réels, horaires réels, difficultés réelles.

Réponds OBLIGATOIREMENT ET UNIQUEMENT au format JSON avec cette structure précise :
{
  "report": {
    "missions": ["mission principale 1", "mission 2", "mission 3"],
    "skills": {
      "hardSkills": ["compétence technique 1", "compétence 2"],
      "softSkills": ["qualité humaine 1", "qualité 2"]
    },
    "realities": {
      "horaires": "horaires typiques et contraintes",
      "environnement": "cadre de travail (bureau, extérieur, bruit, etc.)",
      "risques": "risques ou pression éventuelle"
    },
    "evolution": {
      "formations": ["formation clé 1"],
      "passerelles": ["métier passerelle 1"]
    },
    "salaire": "Fourchette de salaire réaliste (débutant à confirmé)"
  },
  "initialMessage": "Ton premier message d'accueil."
}`;

const jobChatSystem = (selectedJob) => `Tu es un professionnel de terrain avec 15 ans d'expérience dans le métier de ${selectedJob}. Tu participes à une "enquête métier". L'utilisateur (qui réfléchit à une reconversion) te pose des questions pour découvrir la réalité de ton quotidien.
      Ta mission : Réponds de manière transparente, authentique et bienveillante. Donne des exemples concrets, parle des bons comme des mauvais côtés (fatigue, stress, satisfaction, etc.).
      RÈGLE ABSOLUE : Tu n'es PAS en train de faire passer un entretien d'embauche. Ne juge pas le candidat, et ne lui pose pas de questions sur ses motivations ou son CV. Contente-toi de répondre à ses interrogations de façon vivante.`;

const COMPATIBILITY_SYSTEM = `Tu es un expert RH. Analyse la compatibilité entre un CV et une offre d'emploi.
Réponds OBLIGATOIREMENT ET UNIQUEMENT au format JSON avec la structure exacte suivante :
{
  "score": 85,
  "forces": ["Point fort 1 pertinent pour l'offre", "Point fort 2"],
  "faiblesses": ["Écart 1", "Écart 2"],
  "conseilGlobal": "Un paragraphe de conseil pratique pour adapter la candidature ou palier les manques."
}`;

const COVER_LETTER_SYSTEM =
  'Tu es un expert en rédaction de lettre de motivation. Sois direct, professionnel et enthousiaste.';

const INTERVIEW_PREP_SYSTEM = `Tu es un recruteur préparant un candidat.
Réponds OBLIGATOIREMENT ET UNIQUEMENT au format JSON :
{
  "questions": [
    {
      "type": "classique" | "piege" | "technique",
      "question": "La question du recruteur",
      "why": "Pourquoi il pose cette question (ce qu'il cherche à vérifier)",
      "advice": "Conseil sur la façon d'y répondre en utilisant les éléments du CV du candidat"
    }
  ]
} (Génère 4 questions pertinentes)`;

const ACTION_PLAN_SYSTEM = `Tu es un coach de carrière pragmatique.
Réponds OBLIGATOIREMENT ET UNIQUEMENT au format JSON :
{
  "plan": [
    {
      "semaine": "Semaine 1 (Titre de la phase)",
      "objectif": "Objectif principal de la semaine",
      "actions": ["Action concrète 1", "Action concrète 2"]
    }
  ]
} (Génère exactement 4 semaines)`;

// ─── Candidatures spontanées — Lot 3 ───────────────────────────────────────

const CAMPAIGN_PROFILE_SYSTEM = `Tu es un conseiller emploi senior spécialisé dans les candidatures spontanées.
À partir du CV fourni et du métier ciblé, tu produis une synthèse du profil candidat orientée "accroche recruteur".
Réponds UNIQUEMENT au format JSON :
{
  "summary": "Synthèse du profil en 3 à 4 phrases. Ton direct, professionnel, sans formules creuses. Met en avant la valeur ajoutée réelle.",
  "keySkills": ["Compétence clé 1 (concrète et différenciante)", "Compétence 2", "Compétence 3", "Compétence 4", "Compétence 5"],
  "pitchLines": [
    "Phrase d'accroche courte variante A (15 mots max, percutante)",
    "Phrase d'accroche courte variante B"
  ],
  "decisionPoints": [
    "Point d'attention pour le conseiller : ex. gap d'expérience de 2 ans à anticiper",
    "Point d'attention 2"
  ]
}
RÈGLES :
- keySkills : 4 à 6 compétences réelles extraites du CV, pas de généralités ("travail en équipe" interdit sauf si vraiment central).
- decisionPoints : ce que le conseiller devra aborder en séance avec le candidat avant validation. Sois direct, pas bienveillant au détriment de la vérité.
- Pas de formules d'introduction IA ("Bien sûr !", "Certainement !", etc.).`;

const CAMPAIGN_EMAIL_DRAFT_SYSTEM = `Tu es un rédacteur spécialisé en candidatures spontanées en français.
Tu rédiges un email court, direct et professionnel à envoyer à un recruteur inconnu.

L'email utilise des marqueurs de personnalisation entre doubles accolades que le système remplacera automatiquement :
{{NOM_ENTREPRISE}}  → raison sociale
{{VILLE}}           → ville de l'établissement
{{SECTEUR}}         → libellé NAF simplifié

Réponds UNIQUEMENT au format JSON :
{
  "subject": "Objet de l'email (60 caractères max, sans 'Candidature spontanée' en début — sois original)",
  "body": "Corps complet de l'email. 5 à 8 lignes maximum. Tu peux laisser une ligne vide entre les paragraphes (\\n\\n). Utilise 'vous'. Commence par une phrase d'accroche, développe la valeur apportée en 2-3 lignes, conclus par un appel à l'action (entretien téléphonique ou rendez-vous). Signe avec [PRÉNOM NOM] que le système remplacera."
}
RÈGLES ABSOLUES :
- L'objet NE commence pas par "Candidature spontanée", "Objet :", "RE :".
- Pas de formule d'entrée creuse ("Je me permets de vous contacter", "Suite à mes recherches").
- Pas de formule de politesse à rallonge en fin de mail.
- Le ton est confiant, pas suppliant.
- Corps : 80 à 130 mots maximum.`;

// ─── Registre des actions ───────────────────────────────────────────────────
// Chaque action décrit : la tâche (modèle), le format de sortie attendu, et la
// façon de construire systemInstruction + prompt à partir des params (données).

const ACTIONS = {
  rate_cv: {
    task: 'default',
    isJson: true,
    build: (p) => ({
      systemInstruction: RATE_CV_SYSTEM,
      prompt: `Voici le CV à évaluer :\n\n${block(p.cvText)}`,
    }),
  },

  analyze_cv: {
    task: 'default',
    isJson: true,
    build: (p) => ({
      systemInstruction: ANALYZE_CV_SYSTEM,
      prompt: `Voici mon CV :\n\n${block(p.cvText)}`,
    }),
  },

  discover_job: {
    task: 'default',
    isJson: true,
    build: (p) => {
      const jobTitle = inline(p.jobTitle);
      return {
        systemInstruction: discoverJobSystem(jobTitle),
        prompt: `Génère le rapport de découverte et lance la simulation d'enquête métier (pas d'entretien d'embauche !) pour le métier de ${jobTitle}.`,
      };
    },
  },

  job_chat: {
    task: 'chat',
    isJson: true,
    build: (p) => {
      const selectedJob = inline(p.selectedJob);
      const history = Array.isArray(p.history) ? p.history : [];
      const prior = history.slice(0, -1);
      const last = history[history.length - 1] || { content: '' };
      const userMessage = block(last.content, 4000);
      return {
        systemInstruction: jobChatSystem(selectedJob),
        prompt: `Historique récent de la conversation :
${JSON.stringify(prior)}
Le candidat dit : "${userMessage}"
Réponds OBLIGATOIREMENT ET UNIQUEMENT au format JSON avec cette structure exacte : { "reply": "Ta réponse" }`,
      };
    },
  },

  analyze_compatibility: {
    task: 'default',
    isJson: true,
    build: (p) => {
      const o = p.offer || {};
      const competences = Array.isArray(o.competencesRequises)
        ? o.competencesRequises.map((c) => inline(c, 120)).join(', ')
        : '';
      return {
        systemInstruction: COMPATIBILITY_SYSTEM,
        prompt: `OFFRE D'EMPLOI:\nTitre: ${inline(o.intitule)}\nDescription: ${block(o.description, 8000)}\nCompétences attendues: ${competences}\n\nCV DU CANDIDAT:\n${block(p.cvText)}`,
      };
    },
  },

  cover_letter: {
    task: 'default',
    isJson: false,
    build: (p) => {
      const o = p.offer || {};
      return {
        systemInstruction: COVER_LETTER_SYSTEM,
        prompt: `Rédige une lettre de motivation professionnelle et convaincante pour l'offre de ${inline(o.intitule)} chez ${inline(o.entreprise)}.
      Utilise les informations de mon CV pour mettre en valeur ma candidature, en insistant sur les points forts identifiés et en compensant intelligemment les manques.
      Ne mets pas de coordonnées d'en-tête, commence directement par l'objet puis "Madame, Monsieur,".
      Offre: ${block(o.description, 8000)}
      CV: ${block(p.cvText)}`,
      };
    },
  },

  interview_prep: {
    task: 'default',
    isJson: true,
    build: (p) => {
      const o = p.offer || {};
      return {
        systemInstruction: INTERVIEW_PREP_SYSTEM,
        prompt: `Prépare-moi pour un entretien pour le poste de ${inline(o.intitule)}. Compare mon CV aux exigences du poste et identifie les questions que le recruteur va probablement me poser.
      Offre: ${block(o.description, 8000)}
      CV: ${block(p.cvText)}`,
      };
    },
  },

  action_plan: {
    task: 'default',
    isJson: true,
    build: (p) => {
      const o = p.offer || {};
      const forces = Array.isArray(p.forces) ? p.forces.map((f) => inline(f, 200)).join(', ') : '';
      const faiblesses = Array.isArray(p.faiblesses)
        ? p.faiblesses.map((f) => inline(f, 200)).join(', ')
        : '';
      return {
        systemInstruction: ACTION_PLAN_SYSTEM,
        prompt: `Crée un plan d'action sur 4 semaines pour m'aider à décrocher ce poste de ${inline(o.intitule)} chez ${inline(o.entreprise)}.
      Base-toi sur mon profil et l'analyse de compatibilité suivante :
      Mes atouts : ${forces}
      Mes faiblesses à combler : ${faiblesses}
      Propose des actions concrètes, des formations rapides ou des stratégies de réseau pour palier à ces manques et valoriser mon profil.`,
      };
    },
  },

  // ─── Candidatures FT — génération différée (sans cvText) ─────────────────
  // Ces actions utilisent les données déjà stockées dans la fiche candidature :
  // offer (intitule, entreprise, description) + compatibility (forces, faiblesses, conseilGlobal).

  cover_letter_ft: {
    task: 'default',
    isJson: false,
    build: (p) => {
      const o = p.offer || {};
      const c = p.compatibility || {};
      const forces = Array.isArray(c.forces) ? c.forces.join(', ') : '';
      const faiblesses = Array.isArray(c.faiblesses) ? c.faiblesses.join(', ') : '';
      return {
        systemInstruction: COVER_LETTER_SYSTEM,
        prompt: `Rédige une lettre de motivation professionnelle et convaincante pour l'offre de ${inline(o.intitule)} chez ${inline(o.entreprise)}.

Points forts du candidat pour ce poste (issus de l'analyse de compatibilité) :
${forces}

Points à compenser intelligemment :
${faiblesses}

Conseil global issu de l'analyse : ${block(c.conseilGlobal, 500)}

Description de l'offre : ${block(o.description, 5000)}

Ne mets pas de coordonnées d'en-tête. Commence directement par "Objet : Candidature au poste de ${inline(o.intitule)}", puis "Madame, Monsieur,". Sois direct, professionnel et enthousiaste. 250 à 350 mots maximum.`,
      };
    },
  },

  interview_prep_ft: {
    task: 'default',
    isJson: true,
    build: (p) => {
      const o = p.offer || {};
      const c = p.compatibility || {};
      const forces = Array.isArray(c.forces) ? c.forces.join(', ') : '';
      const faiblesses = Array.isArray(c.faiblesses) ? c.faiblesses.join(', ') : '';
      return {
        systemInstruction: INTERVIEW_PREP_SYSTEM,
        prompt: `Prépare un candidat pour un entretien pour le poste de ${inline(o.intitule)} chez ${inline(o.entreprise)}.

Score de compatibilité : ${c.score ?? '?'}%
Points forts du candidat : ${forces}
Axes de développement : ${faiblesses}
Conseil de l'analyse : ${block(c.conseilGlobal, 500)}

Description de l'offre : ${block(o.description, 5000)}

Génère 5 questions pertinentes (mélange classiques, pièges, techniques) adaptées aux forces ET aux faiblesses identifiées.`,
      };
    },
  },

  // ─── Candidatures spontanées — Lot 3 ─────────────────────────────────────

  campaign_profile: {
    task: 'default',
    isJson: true,
    build: (p) => ({
      systemInstruction: CAMPAIGN_PROFILE_SYSTEM,
      prompt: `Métier ciblé : ${inline(p.jobTitle)}\nCode ROME : ${inline(p.codeRome, 10)}\n\nCV du candidat :\n${block(p.cvText)}`,
    }),
  },

  campaign_email_draft: {
    task: 'default',
    isJson: true,
    build: (p) => ({
      systemInstruction: CAMPAIGN_EMAIL_DRAFT_SYSTEM,
      prompt: `Métier ciblé : ${inline(p.jobTitle)}
Synthèse du profil : ${inline(p.summary, 500)}
Compétences clés : ${Array.isArray(p.keySkills) ? p.keySkills.map((s) => inline(s, 100)).join(', ') : ''}
Phrase d'accroche retenue : ${inline(p.pitchLine, 200)}

Rédige l'email de candidature spontanée avec les marqueurs {{NOM_ENTREPRISE}}, {{VILLE}}, {{SECTEUR}}.`,
    }),
  },
};

export const ALLOWED_ACTIONS = Object.keys(ACTIONS);

/**
 * Construit une requête IA de confiance à partir d'une action et de ses données.
 * Le client ne fournit JAMAIS d'instruction système ; il choisit une action et
 * passe des données. Lève une erreur si l'action est inconnue.
 *
 * @param {Object} input
 * @param {string} input.action - identifiant dans ALLOWED_ACTIONS
 * @param {Object} input.params - données (cvText, offer, jobTitle, history...)
 * @returns {{ systemInstruction: string, prompt: string, isJson: boolean, task: string }}
 */
export function buildAIRequest({ action, params = {} }) {
  const def = ACTIONS[action];
  if (!def) {
    throw new Error(`Action IA inconnue : ${action}`);
  }
  const { systemInstruction, prompt } = def.build(params || {});
  return { systemInstruction, prompt, isJson: def.isJson, task: def.task };
}
