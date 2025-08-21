// FICHIER : frontend/src/services/servicesConfig.js
// Configuration centrale de tous les services avec nouveaux conseils

export const SERVICES_CONFIG = {
  analyze_cv: {
    id: 'analyze_cv',
    title: 'Analyser mon CV',
    shortTitle: 'Analyse CV',
    icon: '📄',
    coachAdvice: 'Obtenez une analyse experte de votre CV, puis adaptez les conseils à votre style. Vous serez recruté, pas l\'IA : reformulez tout avec vos mots pour rester authentique.',
    description: 'Analyse complète de votre CV avec recommandations personnalisées',
    requiresCV: true,
    requiresJobOffer: false,
    requiresQuestionnaire: false,
    allowsNotes: false,
    outputType: 'analysis',
    storageKey: 'iamonjob_cv_analysis',
    actionType: 'analyze_cv_response',
    apiEndpoint: '/api/actions/analyze-cv',
    tabs: [
      { id: 'analysis', label: 'Analyse', icon: '📊' },
      { id: 'strengths', label: 'Points forts', icon: '✅' },
      { id: 'improvements', label: 'Améliorations', icon: '🎯' }
    ]
  },

  cv_ats_optimization: {
    id: 'cv_ats_optimization',
    title: 'Optimiser pour les ATS',
    shortTitle: 'Optimisation ATS',
    icon: '🤖',
    coachAdvice: 'Maîtrisez les codes ATS tout en gardant votre personnalité. Testez plusieurs versions, ajoutez vos spécificités sectorielles : l\'outil s\'améliore avec vos précisions répétées.',
    description: 'Optimisation de votre CV pour les systèmes ATS',
    requiresCV: true,
    requiresJobOffer: true,
    requiresQuestionnaire: false,
    allowsNotes: false,
    outputType: 'optimization',
    storageKey: 'iamonjob_ats_optimization',
    actionType: 'ats_optimization_response',
    apiEndpoint: '/api/cv/ats-optimize',
    tabs: [
      { id: 'keywords', label: 'Mots-clés', icon: '🔑' },
      { id: 'format', label: 'Format', icon: '📋' },
      { id: 'score', label: 'Score ATS', icon: '📊' }
    ]
  },

  matching_cv_offre: {
    id: 'matching_cv_offre',
    title: 'Matching CV / Offre',
    shortTitle: 'Compatibilité',
    icon: '🎯',
    coachAdvice: 'Évaluez votre adéquation avec une offre, puis personnalisez votre approche. Redemandez en précisant votre expérience : l\'analyse s\'affine avec vos détails spécifiques.',
    description: 'Analyse professionnelle de compatibilité avec graphiques détaillés et scores précis',
    requiresCV: true,
    requiresJobOffer: true,
    requiresQuestionnaire: false,
    allowsNotes: true,
    outputType: 'matching',
    storageKey: 'iamonjob_matching',
    actionType: 'matching_response',
    apiEndpoint: '/api/actions/compatibility',
    tabs: [
      { id: 'score', label: 'Score global', icon: '📊' },
      { id: 'details', label: 'Analyse détaillée', icon: '🔍' },
      { id: 'charts', label: 'Graphiques', icon: '📈' },
      { id: 'recommendations', label: 'Recommandations', icon: '💡' }
    ]
  },

  cover_letter_advice: {
    id: 'cover_letter_advice',
    title: 'Conseils lettre de motivation',
    shortTitle: 'Conseils lettre',
    icon: '💡',
    coachAdvice: 'Recevez la structure parfaite, puis réécrivez tout avec votre ton. Précisez votre secteur, votre expérience : plus vous détaillez, plus les conseils s\'ajustent.',
    description: 'Obtenez des conseils personnalisés pour rédiger une lettre percutante',
    requiresCV: true,
    requiresJobOffer: true,
    requiresQuestionnaire: false,
    allowsNotes: false,
    outputType: 'advice',
    storageKey: 'iamonjob_cover_advice',
    actionType: 'cover_letter_advice_response',
    apiEndpoint: '/api/cover-letter/advice',
    tabs: [
      { id: 'structure', label: 'Structure', icon: '🏗️' },
      { id: 'content', label: 'Contenu', icon: '📝' },
      { id: 'tips', label: 'Conseils', icon: '💡' }
    ]
  },

  cover_letter_generate: {
    id: 'cover_letter_generate',
    title: 'Générer lettre de motivation',
    shortTitle: 'Générer lettre',
    icon: '✍️',
    coachAdvice: 'Générez un premier jet, puis personnalisez chaque phrase. Demandez des variantes, ajoutez vos réalisations concrètes : vous devez vous reconnaître dans le texte final.',
    description: 'Génération complète d\'une lettre de motivation personnalisée',
    requiresCV: true,
    requiresJobOffer: true,
    requiresQuestionnaire: true,
    allowsNotes: true,
    outputType: 'complete_letter',
    storageKey: 'iamonjob_cover_generate',
    actionType: 'cover_letter_generate_response',
    apiEndpoint: '/api/cover-letter/generate',
    tabs: [
      { id: 'letter', label: 'Lettre complète', icon: '📄' },
      { id: 'variants', label: 'Variantes', icon: '🔄' },
      { id: 'personalization', label: 'Personnalisation', icon: '✨' }
    ]
  },

  follow_up_email: {
    id: 'follow_up_email',
    title: 'Email de relance',
    shortTitle: 'Relance',
    icon: '📧',
    coachAdvice: 'Créez votre relance professionnelle, puis adaptez le ton à votre relation avec l\'entreprise. Testez différentes approches : l\'IA s\'améliore quand vous précisez le contexte.',
    description: 'Rédigez un email de relance professionnel efficace',
    requiresCV: false,
    requiresJobOffer: true,
    requiresQuestionnaire: false,
    allowsNotes: true,
    outputType: 'email',
    storageKey: 'iamonjob_follow_up',
    actionType: 'follow_up_email_response',
    apiEndpoint: '/api/follow-up/email',
    tabs: [
      { id: 'email', label: 'Email', icon: '📧' },
      { id: 'timing', label: 'Timing', icon: '⏰' },
      { id: 'alternatives', label: 'Alternatives', icon: '🔄' }
    ]
  },

  interview_prep: {
    id: 'interview_prep',
    title: 'Préparation entretien',
    shortTitle: 'Prep entretien',
    icon: '🎤',
    coachAdvice: 'Préparez vos réponses types, puis entraînez-vous avec vos propres exemples. Redemandez pour d\'autres scénarios : c\'est votre histoire qu\'il faut raconter, pas celle de l\'IA.',
    description: 'Préparation complète pour réussir votre entretien d\'embauche',
    requiresCV: true,
    requiresJobOffer: true,
    requiresQuestionnaire: false,
    allowsNotes: true,
    outputType: 'preparation',
    storageKey: 'iamonjob_interview_prep',
    actionType: 'interview_prep_response',
    apiEndpoint: '/api/interview/prepare',
    tabs: [
      { id: 'questions', label: 'Questions types', icon: '❓' },
      { id: 'answers', label: 'Mes réponses', icon: '💬' },
      { id: 'scenarios', label: 'Scénarios', icon: '🎭' },
      { id: 'tips', label: 'Conseils', icon: '💡' }
    ]
  },

  professional_pitch: {
    id: 'professional_pitch',
    title: 'Pitch professionnel',
    shortTitle: 'Pitch',
    icon: '🎯',
    coachAdvice: 'Structurez votre présentation, puis répétez avec vos mots jusqu\'à la fluidité naturelle. Demandez des versions pour différents contextes : vous devez être à l\'aise et spontané.',
    description: 'Développez un pitch percutant pour vous présenter efficacement',
    requiresCV: true,
    requiresJobOffer: false,
    requiresQuestionnaire: false,
    allowsNotes: false,
    outputType: 'pitch',
    storageKey: 'iamonjob_pitch',
    actionType: 'professional_pitch_response',
    apiEndpoint: '/api/pitch/generate',
    tabs: [
      { id: 'pitch_30s', label: '30 secondes', icon: '⚡' },
      { id: 'pitch_1min', label: '1 minute', icon: '⏱️' },
      { id: 'pitch_2min', label: '2 minutes', icon: '⏰' },
      { id: 'contexts', label: 'Contextes', icon: '🎯' }
    ]
  },

  presentation_slides: {
    id: 'presentation_slides',
    title: 'Support de présentation',
    shortTitle: 'Slides',
    icon: '📊',
    coachAdvice: 'Obtenez la structure PowerPoint idéale, puis intégrez vos vrais projets et données. Précisez votre domaine d\'activité : vos slides doivent refléter votre expertise unique.',
    description: 'Créez une présentation PowerPoint impactante pour entretien',
    requiresCV: true,
    requiresJobOffer: true,
    requiresQuestionnaire: false,
    allowsNotes: true,
    outputType: 'presentation',
    storageKey: 'iamonjob_presentation',
    actionType: 'presentation_slides_response',
    apiEndpoint: '/api/presentation/create',
    tabs: [
      { id: 'structure', label: 'Structure', icon: '🏗️' },
      { id: 'slides', label: 'Slides', icon: '📊' },
      { id: 'tips', label: 'Conseils', icon: '💡' }
    ]
  },

  salary_negotiation: {
    id: 'salary_negotiation',
    title: 'Négociation salariale',
    shortTitle: 'Négociation',
    icon: '💰',
    coachAdvice: 'Préparez vos arguments de négociation, puis adaptez-les à votre situation réelle. Précisez votre secteur et expérience : les données de marché s\'ajustent à votre profil.',
    description: 'Préparez votre négociation salariale avec arguments solides',
    requiresCV: true,
    requiresJobOffer: true,
    requiresQuestionnaire: false,
    allowsNotes: true,
    outputType: 'negotiation',
    storageKey: 'iamonjob_salary',
    actionType: 'salary_negotiation_response',
    apiEndpoint: '/api/salary/prepare',
    tabs: [
      { id: 'research', label: 'Recherche marché', icon: '📊' },
      { id: 'arguments', label: 'Arguments', icon: '💪' },
      { id: 'scenarios', label: 'Scénarios', icon: '🎭' }
    ]
  },

  reconversion_analysis: {
    id: 'reconversion_analysis',
    title: 'Évaluer une reconversion',
    shortTitle: 'Reconversion',
    icon: '🚀',
    coachAdvice: 'Explorez les pistes de reconversion, puis confrontez-les à votre réalité personnelle. Multipliez les questions, affinez le secteur visé : votre projet doit être 100% vous.',
    description: 'Analyse complète d\'un projet de reconversion professionnelle',
    requiresCV: true,
    requiresJobOffer: false,
    requiresQuestionnaire: true,
    allowsNotes: true,
    outputType: 'reconversion',
    storageKey: 'iamonjob_reconversion',
    actionType: 'reconversion_analysis_response',
    apiEndpoint: '/api/reconversion/analyze',
    tabs: [
      { id: 'analysis', label: 'Analyse', icon: '🔍' },
      { id: 'roadmap', label: 'Feuille de route', icon: '🗺️' },
      { id: 'skills', label: 'Compétences', icon: '🎯' },
      { id: 'opportunities', label: 'Opportunités', icon: '🌟' }
    ]
  },

  career_transition: {
    id: 'career_transition',
    title: 'Vers quel métier aller ?',
    shortTitle: 'Orientation métier',
    icon: '🚀',
    coachAdvice: 'Découvrez les métiers faits pour vous grâce à l\'analyse de votre CV et de vos aspirations.',
    description: 'Bilan complet des compétences et pistes de métiers adaptés.',
    requiresCV: true,
    requiresJobOffer: false,
    requiresQuestionnaire: true,
    allowsNotes: true,
    outputType: 'career_orientation',
    storageKey: 'iamonjob_career_orientation',
    actionType: 'career_transition_response',
    apiEndpoint: '/api/career/orientation',
    tabs: [
      { id: 'summary', label: 'Synthèse', icon: '📊' },
      { id: 'table', label: 'Tableau comparatif', icon: '📋' }
    ]
  },

  industry_orientation: {
    id: 'industry_orientation',
    title: "Et pourquoi pas un métier dans l'industrie ?",
    shortTitle: 'Métier industrie',
    icon: '🏭',
    coachAdvice: "Explorez les débouchés industriels compatibles avec votre profil.",
    description: "Conseils personnalisés pour cibler des métiers dans l'industrie.",
    requiresCV: true,
    requiresJobOffer: false,
    requiresQuestionnaire: true,
    allowsNotes: true,
    outputType: 'industry_orientation',
    storageKey: 'iamonjob_industry_orientation',
    actionType: 'industry_orientation_response',
    apiEndpoint: '/api/industry/orientation',
    tabs: [
      { id: 'summary', label: 'Synthèse', icon: '📊' },
      { id: 'table', label: 'Tableau comparatif', icon: '📋' }
    ]
  }
};

// Utilitaires pour travailler avec la config
export const getServiceConfig = (serviceId) => {
  return SERVICES_CONFIG[serviceId] || null;
};

export const getServicesByCategory = () => {
  const categories = {
    improve_cv: ['analyze_cv', 'cv_ats_optimization'],
    apply_jobs: ['cover_letter_advice', 'cover_letter_generate', 'follow_up_email'],
    interview_prep: ['interview_prep', 'professional_pitch', 'presentation_slides', 'salary_negotiation'],
    career_project: ['career_transition', 'reconversion_analysis', 'industry_orientation']
  };
  
  const result = {};
  Object.keys(categories).forEach(category => {
    result[category] = categories[category].map(id => SERVICES_CONFIG[id]).filter(Boolean);
  });
  
  return result;
};

export const getAllServices = () => {
  return Object.values(SERVICES_CONFIG);
};

export const getRequiredDocuments = (serviceId) => {
  const config = getServiceConfig(serviceId);
  if (!config) return [];
  
  const required = [];
  if (config.requiresCV) required.push('cv');
  if (config.requiresJobOffer) required.push('offre_emploi');
  if (config.requiresQuestionnaire) required.push('questionnaire');
  
  return required;
};

export const canExecuteService = (serviceId, documentStatus) => {
  const requiredDocs = getRequiredDocuments(serviceId);
  return requiredDocs.every(doc => documentStatus[doc]?.uploaded);
};
