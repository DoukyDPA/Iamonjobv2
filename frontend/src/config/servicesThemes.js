// NOUVEAU FICHIER : frontend/src/config/servicesThemes.js
// Configuration thématique des services avec backend flexible

export const SERVICES_THEMES = {
  evaluate_offer: {
    id: 'evaluate_offer',
    title: '🎯 Évaluer une offre d\'emploi',
    description: 'Analysez votre adéquation avec une offre spécifique',
    color: '#0ea5e9',
    icon: '🎯',
    services: [
      'matching_cv_offre'
    ]
  },
  
  improve_cv: {
    id: 'improve_cv', 
    title: '📄 Améliorer mon CV',
    description: 'Optimisez votre CV pour maximiser vos chances',
    color: '#8b5cf6',
    icon: '📄',
    services: [
      'analyze_cv',
      'cv_ats_optimization'
    ]
  },
  
  apply_jobs: {
    id: 'apply_jobs',
    title: '✉️ Candidater', 
    description: 'Préparez vos candidatures et entretiens',
    color: '#10b981',
    icon: '✉️',
    services: [
      'cover_letter_advice',
      'cover_letter_generate', 
      'professional_pitch',
      'interview_prep',
      'follow_up_email'
    ]
  },
  
  career_project: {
    id: 'career_project',
    title: '🚀 Reconstruire mon projet professionnel',
    description: 'Explorez de nouvelles opportunités de carrière',
    color: '#f59e0b',
    icon: '🚀',
    services: [
      'skills_analysis',
      'reconversion_analysis',
      'career_transition',
      'industry_orientation'
    ]
  }
};

// Configuration des services avec métadonnées étendues
export const ENHANCED_SERVICES_CONFIG = {
  // === THÈME : ÉVALUER UNE OFFRE ===
  matching_cv_offre: {
    id: 'matching_cv_offre',
    title: 'Matching CV/Offre',
    shortTitle: 'Matching CV/Offre',
    coachAdvice: 'Découvrez précisément votre adéquation avec cette offre grâce à une analyse IA approfondie avec graphiques détaillés.',
    description: 'Analyse professionnelle de compatibilité avec graphiques détaillés et scores précis',
    theme: 'evaluate_offer',
    
    // Configuration technique
    requiresCV: true,
    requiresJobOffer: true, 
    requiresQuestionnaire: false,
    allowsNotes: true,
    
    // Configuration affichage
    visible: true,
    featured: false,
    featuredUntil: null,
    
    // Métadonnées
    difficulty: 'intermediate',
    duration: '5-10 minutes',
    outputType: 'detailed_analysis_with_charts',
    
    // URL et API
    slug: 'matching-cv-offre',
    apiEndpoint: '/api/actions/compatibility'
  },

  // === THÈME : AMÉLIORER MON CV ===
  analyze_cv: {
    id: 'analyze_cv',
    title: 'Évaluer mon CV',
    shortTitle: 'Analyse CV',
    coachAdvice: 'Obtenez une évaluation professionnelle de votre CV avec des recommandations concrètes pour l\'optimiser.',
    description: 'Analyse détaillée de votre CV avec recommandations d\'amélioration',
    theme: 'improve_cv',
    
    requiresCV: true,
    requiresJobOffer: false,
    requiresQuestionnaire: false,
    allowsNotes: false,
    
    visible: true,
    featured: false,
    featuredUntil: null,
    
    difficulty: 'beginner',
    duration: '3-5 minutes', 
    outputType: 'structured_analysis',
    
    slug: 'analyze-cv',
    apiEndpoint: '/api/actions/analyze-cv'
  },

  cv_ats_optimization: {
    id: 'cv_ats_optimization',
    title: 'Optimisez mon CV pour les ATS',
    shortTitle: 'Optimisation ATS',
    coachAdvice: 'Adaptez votre CV pour qu\'il soit parfaitement lisible par les systèmes de tri automatiques des entreprises.',
    description: 'Optimisation de votre CV pour les systèmes ATS',
    theme: 'improve_cv',
    
    requiresCV: true,
    requiresJobOffer: true, // Pour adapter aux mots-clés
    requiresQuestionnaire: false,
    allowsNotes: false,
    
    visible: true,
    featured: false,
    featuredUntil: null,
    
    difficulty: 'intermediate',
    duration: '5-8 minutes',
    outputType: 'optimization_guide',
    
    slug: 'cv-ats-optimization', 
    apiEndpoint: '/api/cv/ats-optimize'
  },

  // === THÈME : CANDIDATER ===
  cover_letter_advice: {
    id: 'cover_letter_advice',
    title: 'Conseils lettre de motivation',
    shortTitle: 'Conseils lettre',
    coachAdvice: 'Recevez des conseils personnalisés pour structurer et rédiger une lettre de motivation percutante.',
    description: 'Conseils personnalisés pour votre lettre de motivation',
    theme: 'apply_jobs',
    
    requiresCV: true,
    requiresJobOffer: true,
    requiresQuestionnaire: false,
    allowsNotes: false,
    
    visible: true,
    featured: false,
    featuredUntil: null,
    
    difficulty: 'beginner',
    duration: '3-5 minutes',
    outputType: 'advice_guide',
    
    slug: 'cover-letter-advice',
    apiEndpoint: '/api/cover-letter/advice'
  },

  cover_letter_generate: {
    id: 'cover_letter_generate', 
    title: 'Rédigez votre lettre de motivation',
    shortTitle: 'Générer lettre',
    coachAdvice: 'Créez une lettre de motivation complète et personnalisée prête à être envoyée avec votre candidature.',
    description: 'Génération complète d\'une lettre de motivation personnalisée',
    theme: 'apply_jobs',
    
    requiresCV: true,
    requiresJobOffer: true,
    requiresQuestionnaire: true,
    allowsNotes: true,
    
    visible: true,
    featured: false,
    featuredUntil: null,
    
    difficulty: 'intermediate',
    duration: '8-12 minutes',
    outputType: 'complete_letter',
    
    slug: 'cover-letter-generate',
    apiEndpoint: '/api/cover-letter/generate'
  },

  professional_pitch: {
    id: 'professional_pitch',
    title: 'Présentez-vous en 30 secondes chrono !',
    shortTitle: 'Pitch',
    coachAdvice: 'Développez un pitch percutant pour vous présenter efficacement en entretien ou en networking.',
    description: 'Création de votre pitch professionnel personnalisé',
    theme: 'apply_jobs',
    
    requiresCV: true,
    requiresJobOffer: false,
    requiresQuestionnaire: true,
    allowsNotes: true,
    
    visible: true,
    featured: false,
    featuredUntil: null,
    
    difficulty: 'intermediate',
    duration: '6-10 minutes',
    outputType: 'pitch_versions',
    
    slug: 'professional-pitch',
    apiEndpoint: '/api/pitch/generate'
  },

  interview_prep: {
    id: 'interview_prep',
    title: 'Préparez votre entretien d'embauche',
    shortTitle: 'Entretien',
    coachAdvice: 'Préparez-vous méthodiquement à votre entretien avec des questions types et des stratégies de réponse.',
    description: 'Préparation complète à votre entretien d\'embauche',
    theme: 'apply_jobs',
    
    requiresCV: true,
    requiresJobOffer: true,
    requiresQuestionnaire: false,
    allowsNotes: true,
    
    visible: true,
    featured: false,
    featuredUntil: null,
    
    difficulty: 'intermediate',
    duration: '10-15 minutes',
    outputType: 'interview_guide',
    
    slug: 'interview-prep',
    apiEndpoint: '/api/interview/prepare'
  },

  follow_up_email: {
    id: 'follow_up_email',
    title: 'Rédigez un email de relance',
    shortTitle: 'Relance',
    coachAdvice: 'Rédigez un email de relance professionnel pour maintenir le contact après un entretien ou une candidature.',
    description: 'Rédaction d\'emails de relance professionnels',
    theme: 'apply_jobs',
    
    requiresCV: false,
    requiresJobOffer: true,
    requiresQuestionnaire: false,
    allowsNotes: true,
    
    visible: true,
    featured: false,
    featuredUntil: null,
    
    difficulty: 'beginner',
    duration: '3-5 minutes',
    outputType: 'email_template',
    
    slug: 'follow-up-email',
    apiEndpoint: '/api/followup/generate'
  },

  // === THÈME : PROJET PROFESSIONNEL ===
  skills_analysis: {
    id: 'skills_analysis',
    title: 'Analysez vos compétences',
    shortTitle: 'Compétences',
    coachAdvice: 'Identifiez vos compétences transférables et découvrez de nouveaux domaines d\'application pour votre profil.',
    description: 'Analyse approfondie de vos compétences et potentiels',
    theme: 'career_project',
    
    requiresCV: true,
    requiresJobOffer: false,
    requiresQuestionnaire: true,
    allowsNotes: true,
    
    visible: true,
    featured: false,
    featuredUntil: null,
    
    difficulty: 'intermediate',
    duration: '8-12 minutes',
    outputType: 'skills_mapping',
    
    slug: 'skills-analysis',
    apiEndpoint: '/api/skills/analyze'
  },

  reconversion_analysis: {
    id: 'reconversion_analysis',
    title: 'Découvrez des pistes de reconversion',
    shortTitle: 'Reconversion',
    coachAdvice: 'Explorez une reconversion professionnelle avec une analyse détaillée des étapes et opportunités.',
    description: 'Analyse complète d\'un projet de reconversion professionnelle',
    theme: 'career_project',
    
    requiresCV: true,
    requiresJobOffer: false,
    requiresQuestionnaire: true,
    allowsNotes: true,
    
    visible: true,
    featured: true, // ⭐ EXEMPLE D'ACTION MISE EN AVANT
    featuredUntil: '2025-08-31',
    featuredTitle: 'Tester ma compatibilité avec le métier de chauffeur de bus',
    
    difficulty: 'advanced',
    duration: '15-20 minutes',
    outputType: 'reconversion_roadmap',
    
    slug: 'reconversion-analysis',
    apiEndpoint: '/api/reconversion/analyze'
  },

  career_transition: {
    id: 'career_transition',
    title: 'Vers quel métier aller ?',
    shortTitle: 'Orientation métier',
    coachAdvice: 'Explorez les métiers correspondant à vos compétences et à vos envies.',
    description: 'Analyse détaillée de votre profil pour proposer des pistes de métiers et les compétences à développer.',
    theme: 'career_project',

    requiresCV: true,
    requiresJobOffer: false,
    requiresQuestionnaire: true,
    allowsNotes: true,

    visible: true,
    featured: false,
    featuredUntil: null,

    difficulty: 'intermediate',
    duration: '10-15 minutes',
    outputType: 'career_orientation',

    slug: 'career-transition',
    apiEndpoint: '/api/career/orientation'
  },

  industry_orientation: {
    id: 'industry_orientation',
    title: "Et pourquoi pas un métier dans l'industrie ?",
    shortTitle: 'Métier industrie',
    coachAdvice: "Explorez les débouchés industriels compatibles avec votre profil.",
    description: "Conseils personnalisés pour identifier des métiers industriels.",
    theme: 'career_project',

    requiresCV: true,
    requiresJobOffer: false,
    requiresQuestionnaire: true,
    allowsNotes: true,

    visible: true,
    featured: false,
    featuredUntil: null,

    difficulty: 'intermediate',
    duration: '10-15 minutes',
    outputType: 'industry_orientation',

    slug: 'industry-orientation',
    apiEndpoint: '/api/industry/orientation'
  }
};

// Utilitaires pour le nouveau système
export const getServicesByTheme = () => {
  const result = {};
  
  Object.values(SERVICES_THEMES).forEach(theme => {
    result[theme.id] = {
      ...theme,
      services: theme.services
        .map(serviceId => ENHANCED_SERVICES_CONFIG[serviceId])
        .filter(service => service && service.visible)
        .sort((a, b) => a.title.localeCompare(b.title))
    };
  });
  
  return result;
};

export const getFeaturedService = () => {
  const now = new Date();
  return Object.values(ENHANCED_SERVICES_CONFIG).find(service => 
    service.featured && 
    service.visible && 
    (!service.featuredUntil || new Date(service.featuredUntil) > now)
  );
};

export const getServiceBySlug = (slug) => {
  return Object.values(ENHANCED_SERVICES_CONFIG).find(service => service.slug === slug);
};

export const getVisibleServices = () => {
  return Object.values(ENHANCED_SERVICES_CONFIG).filter(service => service.visible);
};
