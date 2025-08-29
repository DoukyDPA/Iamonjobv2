// FICHIER : frontend/src/services/servicesConfig.js
// Configuration stable des services (version compatible production)

// Mapping des URLs vers les IDs de service
export const URL_TO_SERVICE_MAPPING = {
  'followup-generate': 'follow_up_email',
  'follow-up-email': 'follow_up_email',
  'cover-letter-generate': 'cover_letter_generate',
  'cover-letter-advice': 'cover_letter_advice',
  'interview-prep': 'interview_prep',
  'professional-pitch': 'professional_pitch',
  'presentation-slides': 'presentation_slides',
  'salary-prepare': 'salary_negotiation',
  'reconversion-analyze': 'reconversion_analysis',
  'career-orientation': 'career_transition',
  'industry-orientation': 'industry_orientation',
  'cv-ats-optimize': 'cv_ats_optimization',
  'matching-cv-offre': 'matching_cv_offre',
  'analyze-cv': 'analyze_cv'
};

// Configuration stable des services
export const SERVICES_CONFIG = {
  analyze_cv: {
    id: 'analyze_cv',
    title: 'Analysez votre CV',
    shortTitle: 'Analyse CV',
    icon: '📄',
    coachAdvice: "L'IA va identifier vos points forts et axes d'amélioration. Utilisez cette analyse comme base de travail : notez 3 réalisations concrètes pour chaque compétence identifiée. Les recruteurs veulent des exemples chiffrés de VOS succès, pas des phrases génériques.",
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
    title: 'Optimisez votre CV pour les ATS',
    shortTitle: 'Optimisation ATS',
    icon: '🤖',
    coachAdvice: "L'IA détecte les mots-clés manquants pour passer les filtres robots. Intégrez-les naturellement dans VOS expériences réelles. Astuce : reprenez l'intitulé exact du poste visé et les compétences de l'annonce dans votre CV, mais toujours avec vos vraies expériences.",
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
    title: 'Vérifiez si vous correspondez aux offres d\'emploi',
    shortTitle: 'Compatibilité',
    icon: '🎯',
    coachAdvice: "Ce score de compatibilité est votre point de départ. Si <60% : ne perdez pas de temps. Si 60-80% : comblez les écarts avec des formations courtes. Si >80% : foncez et personnalisez votre candidature sur les points de match identifiés.",
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
    title: 'Apprenez à rédiger votre lettre de motivation',
    shortTitle: 'Conseils lettre',
    icon: '💡',
    coachAdvice: "L'IA vous donne la structure gagnante en 3 parties. Votre mission : remplir avec VOS exemples concrets. Paragraphe 1 : pourquoi cette entreprise (citez un projet récent). Paragraphe 2 : une réussite similaire de votre parcours. Paragraphe 3 : votre vision du poste.",
    requiresCV: true,
    requiresJobOffer: true,
    requiresQuestionnaire: false,
    allowsNotes: false,
    outputType: 'advice',
    storageKey: 'iamonjob_cover_advice',
    actionType: 'cover_letter_advice_response',
    apiEndpoint: '/api/cover-letter/advice',
    tabs: [
      { id: 'structure', label: 'Structure', icon: '📋' },
      { id: 'examples', label: 'Exemples', icon: '💡' },
      { id: 'tips', label: 'Conseils', icon: '🎯' }
    ]
  },

  cover_letter_generate: {
    id: 'cover_letter_generate',
    title: 'Générez votre lettre de motivation',
    shortTitle: 'Générer lettre',
    icon: '✉️',
    coachAdvice: "L'IA crée une lettre personnalisée. Votre mission : personnalisez chaque phrase avec VOS exemples concrets. Remplacez les formulations génériques par vos vraies expériences. Une lettre générique = candidature ignorée. Une lettre personnalisée = entretien garanti.",
    requiresCV: true,
    requiresJobOffer: true,
    requiresQuestionnaire: true,
    allowsNotes: true,
    outputType: 'cover_letter',
    storageKey: 'iamonjob_cover_letter',
    actionType: 'cover_letter_generate_response',
    apiEndpoint: '/api/cover-letter/generate',
    tabs: [
      { id: 'letter', label: 'Lettre', icon: '✉️' },
      { id: 'alternatives', label: 'Variantes', icon: '🔄' },
      { id: 'personalization', label: 'Personnalisation', icon: '🎯' }
    ]
  },

  professional_pitch: {
    id: 'professional_pitch',
    title: 'Préparez votre pitch professionnel',
    shortTitle: 'Pitch pro',
    icon: '🎤',
    coachAdvice: "L'IA crée un pitch de 30 secondes. Votre mission : mémorisez-le et testez-le sur 3 personnes différentes. Un pitch efficace doit être : court, clair, mémorable. Adaptez le ton selon votre interlocuteur : formel pour un recruteur, décontracté pour un réseau.",
    requiresCV: true,
    requiresJobOffer: true,
    requiresQuestionnaire: true,
    allowsNotes: true,
    outputType: 'pitch',
    storageKey: 'iamonjob_pitch',
    actionType: 'professional_pitch_response',
    apiEndpoint: '/api/pitch/generate',
    tabs: [
      { id: 'pitch', label: 'Pitch', icon: '🎤' },
      { id: 'variants', label: 'Variantes', icon: '🔄' },
      { id: 'tips', label: 'Conseils', icon: '💡' }
    ]
  },

  interview_prep: {
    id: 'interview_prep',
    title: 'Préparez-vous à votre entretien',
    shortTitle: 'Préparation entretien',
    icon: '🎯',
    coachAdvice: "L'IA identifie les questions probables. Votre mission : préparez 3 réponses concrètes pour chaque question. Utilisez la méthode STAR : Situation, Tâche, Action, Résultat. Entraînez-vous à haute voix : une réponse non pratiquée = hésitation = doute du recruteur.",
    requiresCV: true,
    requiresJobOffer: true,
    requiresQuestionnaire: false,
    allowsNotes: true,
    outputType: 'interview_prep',
    storageKey: 'iamonjob_interview_prep',
    actionType: 'interview_prep_response',
    apiEndpoint: '/api/interview/prepare',
    tabs: [
      { id: 'questions', label: 'Questions', icon: '❓' },
      { id: 'answers', label: 'Réponses', icon: '💬' },
      { id: 'tips', label: 'Conseils', icon: '💡' }
    ]
  },

  follow_up_email: {
    id: 'follow_up_email',
    title: 'Rédigez votre email de relance',
    shortTitle: 'Email relance',
    icon: '📧',
    coachAdvice: "L'IA crée un email de relance professionnel. Votre mission : personnalisez-le avec des éléments de suivi concrets. Mentionnez un point de l'entretien, une actualité de l'entreprise, ou une nouvelle compétence acquise. Un email générique = ignoré. Un email personnalisé = réponse garantie.",
    requiresCV: false,
    requiresJobOffer: true,
    requiresQuestionnaire: false,
    allowsNotes: true,
    outputType: 'email',
    storageKey: 'iamonjob_follow_up',
    actionType: 'follow_up_email_response',
    apiEndpoint: '/api/follow-up/generate',
    tabs: [
      { id: 'email', label: 'Email', icon: '📧' },
      { id: 'variants', label: 'Variantes', icon: '🔄' },
      { id: 'timing', label: 'Timing', icon: '⏰' }
    ]
  },

  reconversion_analysis: {
    id: 'reconversion_analysis',
    title: 'Évaluez votre projet de reconversion',
    shortTitle: 'Reconversion',
    icon: '🔄',
    coachAdvice: "L'IA objective votre projet de reconversion. Listez ensuite vos contraintes réelles (finances, famille, mobilité). Pour chaque compétence manquante identifiée, trouvez une formation courte ou une expérience bénévole. Testez le métier : stage d'observation, freelance, bénévolat avant de vous lancer.",
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
    coachAdvice: "L'IA révèle des métiers compatibles avec vos compétences. Choisissez-en 3 maximum et pour chacun : contactez 2 professionnels sur LinkedIn pour un café virtuel, regardez 5 offres d'emploi réelles, identifiez les 2-3 compétences à acquérir en priorité.",
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
    coachAdvice: "L'IA identifie vos passerelles vers l'industrie. Action immédiate : visitez les sites des entreprises industrielles locales, repérez les postes ouverts sans diplôme industriel requis. Valorisez vos soft skills : rigueur, travail d'équipe, respect des process. L'industrie forme en interne si motivation prouvée.",
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
  },

  salary_negotiation: {
    id: 'salary_negotiation',
    title: 'Préparez votre négociation salariale',
    shortTitle: 'Négociation salaire',
    icon: '💰',
    coachAdvice: "L'IA identifie vos arguments de négociation. Votre mission : préparez 3 exemples concrets de vos réussites avec des chiffres. Ne négociez jamais sans alternatives (autres offres, freelance, formation). Un salaire négocié = +15% en moyenne. Un salaire accepté tel quel = opportunité perdue.",
    requiresCV: true,
    requiresJobOffer: true,
    requiresQuestionnaire: true,
    allowsNotes: true,
    outputType: 'salary_negotiation',
    storageKey: 'iamonjob_salary_negotiation',
    actionType: 'salary_negotiation_response',
    apiEndpoint: '/api/salary/prepare',
    tabs: [
      { id: 'arguments', label: 'Arguments', icon: '💬' },
      { id: 'range', label: 'Fourchette', icon: '📊' },
      { id: 'strategy', label: 'Stratégie', icon: '🎯' }
    ]
  },

  skills_analysis: {
    id: 'skills_analysis',
    title: 'Analyser mes compétences',
    shortTitle: 'Analyse compétences',
    icon: '🔍',
    coachAdvice: "L'IA identifie vos compétences transférables et découvre de nouveaux domaines d'application. Votre mission : pour chaque compétence identifiée, trouvez 3 exemples concrets de votre parcours. Les compétences sont transférables si vous pouvez les prouver avec des réalisations.",
    requiresCV: true,
    requiresJobOffer: false,
    requiresQuestionnaire: true,
    allowsNotes: true,
    outputType: 'skills_analysis',
    storageKey: 'iamonjob_skills_analysis',
    actionType: 'skills_analysis_response',
    apiEndpoint: '/api/skills/analyze',
    tabs: [
      { id: 'summary', label: 'Synthèse', icon: '📊' },
      { id: 'skills', label: 'Compétences', icon: '🎯' },
      { id: 'transferability', label: 'Transférabilité', icon: '🔄' },
      { id: 'opportunities', label: 'Opportunités', icon: '🌟' }
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
    career_project: ['career_transition', 'reconversion_analysis', 'industry_orientation', 'skills_analysis']
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
