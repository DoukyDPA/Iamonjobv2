// FICHIER : frontend/src/services/servicesConfig.js
// Configuration dynamique des services depuis l'API admin

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

// Configuration par défaut des services (fallback si API non disponible)
export const SERVICES_CONFIG_DEFAULT = {
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
      { id: 'structure', label: 'Structure', icon: '🏗️' },
      { id: 'content', label: 'Contenu', icon: '📝' },
      { id: 'tips', label: 'Conseils', icon: '💡' }
    ]
  },

  cover_letter_generate: {
    id: 'cover_letter_generate',
    title: 'Rédigez votre lettre de motivation',
    shortTitle: 'Générer lettre',
    icon: '✍️',
    coachAdvice: "Le premier jet généré est votre brouillon de travail. Remplacez CHAQUE exemple générique par une situation réelle vécue. Ajoutez des détails : noms d'entreprises, chiffres, contextes. Une lettre efficace = 70% de votre vécu + 30% de structure IA.",
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
    title: 'N\'oubliez pas l\'email de relance',
    shortTitle: 'Relance',
    icon: '📧',
    coachAdvice: "L'IA crée le cadre professionnel de votre relance. Personnalisez en ajoutant : la date précise de votre candidature, un élément spécifique de l'entreprise qui vous motive, votre disponibilité concrète. Envoyez 7-10 jours après candidature, le mardi ou jeudi matin.",
    requiresCV: false,
    requiresJobOffer: true,
    requiresQuestionnaire: false,
    allowsNotes: true,
    outputType: 'email',
    storageKey: 'iamonjob_follow_up',
    actionType: 'follow_up_email_response',
    apiEndpoint: '/api/followup/generate',
    tabs: [
      { id: 'email', label: 'Email', icon: '📧' },
      { id: 'timing', label: 'Timing', icon: '⏰' },
      { id: 'alternatives', label: 'Alternatives', icon: '🔄' }
    ]
  },

  interview_prep: {
    id: 'interview_prep',
    title: 'Prépararez votre entretien d\'embauche',
    shortTitle: 'Prep entretien',
    icon: '🎤',
    coachAdvice: "L'IA prédit les questions probables de votre entretien. Pour chaque question, préparez 2 exemples STAR de votre vécu (Situation-Tâche-Action-Résultat). Entraînez-vous à voix haute 3 fois minimum. Les mots-clés IA + vos histoires = succès assuré.",
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
    title: 'Présentez-vous en 30 secondes chrono',
    shortTitle: 'Pitch',
    icon: '🎯',
    coachAdvice: "L'IA structure votre pitch, vous le rendez vivant. Chronométrez-vous : 30 sec = 3 phrases max. Phrase 1 : Qui vous êtes. Phrase 2 : Votre meilleure réalisation. Phrase 3 : Ce que vous cherchez. Répétez 10 fois jusqu'à ce que ça soit naturel.",
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
    title: 'Préparez un support de présentation',
    shortTitle: 'Slides',
    icon: '📊',
    coachAdvice: "L'IA conçoit le squelette de vos slides. Remplacez tout texte générique par : vos vrais projets, vos chiffres, vos équipes. Règle d'or : max 5 mots par bullet point, 1 idée par slide. Préparez des notes détaillées pour l'oral, les slides = support visuel uniquement.",
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
    title: 'Négociez votre salaire',
    shortTitle: 'Négociation',
    icon: '💰',
    coachAdvice: "L'IA compile les données marché de votre poste. Préparez 3 arguments basés sur VOS réalisations qui justifient le salaire visé. Jamais le premier à annoncer un chiffre. Si forcé : donnez une fourchette avec le salaire cible en bas de fourchette. Négociez aussi : télétravail, formation, congés.",
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
    title: 'Évaluer les chances de votre reconversion',
    shortTitle: 'Reconversion',
    icon: '🚀',
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
  return SERVICES_CONFIG_DEFAULT[serviceId] || null;
};

// Configuration dynamique des services depuis l'API admin
let SERVICES_CONFIG_CACHE = null;
let SERVICES_LAST_UPDATE = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Fonction pour charger les services depuis l'API admin
export const loadServicesFromAdmin = async () => {
  try {
    // Vérifier le cache
    if (SERVICES_CONFIG_CACHE && SERVICES_LAST_UPDATE && 
        (Date.now() - SERVICES_LAST_UPDATE) < CACHE_DURATION) {
      return SERVICES_CONFIG_CACHE;
    }

    // Charger depuis l'API admin
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (!token) {
      console.warn('Token non disponible, utilisation de la config par défaut');
      return SERVICES_CONFIG_DEFAULT;
    }

    const response = await fetch('/api/admin/services', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      console.warn('Erreur API admin, utilisation de la config par défaut');
      return SERVICES_CONFIG_DEFAULT;
    }

    const data = await response.json();
    if (!data.success || !data.services) {
      console.warn('Données API invalides, utilisation de la config par défaut');
      return SERVICES_CONFIG_DEFAULT;
    }

    // Fusionner avec la config par défaut
    const mergedConfig = { ...SERVICES_CONFIG_DEFAULT };
    
    Object.entries(data.services).forEach(([serviceId, adminService]) => {
      if (adminService.visible && mergedConfig[serviceId]) {
        // Mettre à jour avec les données admin
        mergedConfig[serviceId] = {
          ...mergedConfig[serviceId],
          title: adminService.title,
          coachAdvice: adminService.coach_advice,
          requiresCV: adminService.requires_cv,
          requiresJobOffer: adminService.requires_job_offer,
          requiresQuestionnaire: adminService.requires_questionnaire,
          difficulty: adminService.difficulty,
          durationMinutes: adminService.duration_minutes,
          featured: adminService.featured,
          featuredTitle: adminService.featured_title
        };
      }
    });

    // Mettre en cache
    SERVICES_CONFIG_CACHE = mergedConfig;
    SERVICES_LAST_UPDATE = Date.now();
    
    return mergedConfig;
  } catch (error) {
    console.error('Erreur lors du chargement des services:', error);
    return SERVICES_CONFIG_DEFAULT;
  }
};

// Fonction pour obtenir la config actuelle (avec cache)
export const getServicesConfig = async () => {
  if (SERVICES_CONFIG_CACHE) {
    return SERVICES_CONFIG_CACHE;
  }
  return await loadServicesFromAdmin();
};

// Fonction pour forcer le rechargement
export const refreshServicesConfig = async () => {
  SERVICES_CONFIG_CACHE = null;
  SERVICES_LAST_UPDATE = null;
  return await loadServicesFromAdmin();
};

export const getServicesByCategory = async () => {
  const config = await getServicesConfig();
  
  const categories = {
    improve_cv: ['analyze_cv', 'cv_ats_optimization'],
    apply_jobs: ['cover_letter_advice', 'cover_letter_generate', 'follow_up_email'],
    interview_prep: ['interview_prep', 'professional_pitch', 'presentation_slides', 'salary_negotiation'],
    career_project: ['career_transition', 'reconversion_analysis', 'industry_orientation', 'skills_analysis']
  };
  
  const result = {};
  Object.keys(categories).forEach(category => {
    result[category] = categories[category].map(id => config[id]).filter(Boolean);
  });
  
  return result;
};

export const getAllServices = async () => {
  const config = await getServicesConfig();
  return Object.values(config);
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
