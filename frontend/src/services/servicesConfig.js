// FICHIER : frontend/src/services/servicesConfig.js
// Configuration unifiée avec l'admin (version stable)

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
  'salary-negotiation': 'salary_negotiation',
  'reconversion-analyze': 'reconversion_analysis',
  'reconversion-analysis': 'reconversion_analysis',
  'career-orientation': 'career_transition',
  'career-transition': 'career_transition',
  'industry-orientation': 'industry_orientation',
  'cv-ats-optimize': 'cv_ats_optimization',
  'cv-ats-optimization': 'cv_ats_optimization',
  'matching-cv-offre': 'matching_cv_offre',
  'analyze-cv': 'analyze_cv',
  'analyse-emploi': 'analyse_emploi',
  'skills-analysis': 'skills_analysis',
  'cv-video': 'cv_video'
};

// Configuration des services basée sur l'admin
export const SERVICES_CONFIG = {
  // === THÈME : ÉVALUER UNE OFFRE ===
  matching_cv_offre: {
    id: 'matching_cv_offre',
    title: 'Matching CV/Offre',
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

  // === THÈME : AMÉLIORER MON CV ===
  analyze_cv: {
    id: 'analyze_cv',
    title: 'Évaluer mon CV',
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
    coachAdvice: "Les grandes entreprises utilisent des logiciels (ATS) qui filtrent les CV avant qu'un humain ne les lise. L'IA a identifié les mots-clés essentiels de cette offre. Intégrez ces termes naturellement dans votre CV en restant authentique. Reprenez l'intitulé exact du poste et le vocabulaire de l'annonce pour décrire VOS vraies expériences. Évitez tableaux et colonnes qui perturbent les robots. L'IA vous aide à franchir le filtre technique, mais c'est votre parcours réel qui convaincra l'humain ensuite. Ne jamais inventer - juste mieux formuler. Un CV optimisé ATS reste avant tout VOTRE histoire, racontée avec les bons mots.",
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

  // === THÈME : CANDIDATER ===
  cover_letter_advice: {
    id: 'cover_letter_advice',
    title: 'Conseils lettre de motivation',
    shortTitle: 'Conseils lettre',
    icon: '💡',
    coachAdvice: "L'IA vous propose une structure efficace et les bons arguments pour ce poste. C'est votre point de départ, pas votre point d'arrivée. Enrichissez chaque paragraphe avec VOS histoires concrètes. Remplacez \"j'ai de l'expérience en gestion de projet\" par \"j'ai coordonné une équipe de 5 personnes sur le projet X, livré dans les délais\". Les recruteurs détectent instantanément les lettres génériques. Iamonjob structure vos idées mais ne peut raconter votre parcours unique. Une lettre sans exemples personnels finit à la poubelle. Une lettre qui raconte VOTRE histoire ouvre les portes. La meilleure lettre est celle qui vous ressemble, pas celle qui ressemble à toutes les autres.",
    requiresCV: true,
    requiresJobOffer: true,
    requiresQuestionnaire: false,
    allowsNotes: false,
    outputType: 'advice',
    storageKey: 'iamonjob_cover_advice',
    actionType: 'cover_letter_advice_response',
    apiEndpoint: '/api/services/execute/cover_letter_advice',
    tabs: [
      { id: 'structure', label: 'Structure', icon: '📋' },
      { id: 'examples', label: 'Exemples', icon: '💡' },
      { id: 'tips', label: 'Conseils', icon: '🎯' }
    ]
  },

  cover_letter_generate: {
    id: 'cover_letter_generate',
    title: 'Rédigez votre lettre de motivation',
    shortTitle: 'Générer lettre',
    icon: '✉️',
    coachAdvice: "L'IA vous propose une structure efficace et les bons arguments pour ce poste. C'est votre point de départ, pas votre point d'arrivée. Enrichissez chaque paragraphe avec VOS histoires concrètes. Remplacez \"j'ai de l'expérience en gestion de projet\" par \"j'ai coordonné une équipe de 5 personnes sur le projet X, livré dans les délais\". Iamonjob structure vos idées mais ne peut raconter votre parcours unique. Une lettre sans exemples personnels risque fort de finir à la poubelle. La meilleure lettre est celle qui vous ressemble, pas celle qui ressemble à toutes les autres.",
    requiresCV: true,
    requiresJobOffer: true,
    requiresQuestionnaire: true,
    allowsNotes: true,
    outputType: 'cover_letter',
    storageKey: 'iamonjob_cover_letter',
    actionType: 'cover_letter_generate_response',
    apiEndpoint: '/api/services/execute/cover_letter_generate',
    tabs: [
      { id: 'letter', label: 'Lettre', icon: '✉️' },
      { id: 'alternatives', label: 'Variantes', icon: '🔄' },
      { id: 'personalization', label: 'Personnalisation', icon: '🎯' }
    ]
  },

  professional_pitch: {
    id: 'professional_pitch',
    title: 'Présentez-vous en 30 secondes chrono !',
    shortTitle: 'Pitch pro',
    icon: '🎤',
    coachAdvice: "Iamonjob vous propose un pitch de 30 secondes structuré et personnalisé. C'est votre base de travail pour vous présenter avec impact. Appropriez-vous cette présentation jusqu'à ce qu'elle sonne naturelle. Testez-la sur 3 personnes différentes et ajustez selon leurs réactions. Adaptez le ton à votre interlocuteur : professionnel en entretien, plus décontracté à l'occasion de rencontres professionnelles. Iamonjob structure votre présentation mais c'est votre conviction qui la rendra mémorable. Un pitch récité mécaniquement tombera toujours à plat. Le meilleur pitch est celui que vous pouvez dire sans y penser, comme si vous racontiez votre passion à un ami.",
    requiresCV: true,
    requiresJobOffer: true,
    requiresQuestionnaire: true,
    allowsNotes: true,
    outputType: 'pitch',
    storageKey: 'iamonjob_pitch',
    actionType: 'professional_pitch_response',
    apiEndpoint: '/api/services/execute/professional_pitch',
    tabs: [
      { id: 'pitch', label: 'Pitch', icon: '🎤' },
      { id: 'variants', label: 'Variantes', icon: '🔄' },
      { id: 'tips', label: 'Conseils', icon: '💡' }
    ]
  },

  interview_prep: {
    id: 'interview_prep',
    title: 'Préparez votre entretien d\'embauche',
    shortTitle: 'Préparation entretien',
    icon: '🎯',
    coachAdvice: "L'IA a identifié les questions probables pour ce poste. Vous avez maintenant la liste des sujets qui tomberont quasi-certainement. Préparez 3 exemples concrets pour chaque question en utilisant la méthode STAR (Situation-Tâche-Action-Résultat). Puis le plus important : ENTRAÎNEZ-VOUS à haute voix, encore et encore. Filmez-vous, chronométrez-vous, répétez devant un miroir. Une réponse hésitante trahit le manque de préparation. Seul l'entraînement intensif vous rendra convaincant. La différence entre échec et succès ? Les heures de répétition que les autres candidats n'ont pas faites.",
    requiresCV: true,
    requiresJobOffer: true,
    requiresQuestionnaire: false,
    allowsNotes: true,
    outputType: 'interview_prep',
    storageKey: 'iamonjob_interview_prep',
    actionType: 'interview_prep_response',
    apiEndpoint: '/api/services/execute/interview_prep',
    tabs: [
      { id: 'questions', label: 'Questions', icon: '❓' },
      { id: 'answers', label: 'Réponses', icon: '💬' },
      { id: 'tips', label: 'Conseils', icon: '💡' }
    ]
  },

  follow_up_email: {
    id: 'follow_up_email',
    title: 'Rédigez un email de relance',
    shortTitle: 'Email relance',
    icon: '📧',
    coachAdvice: "Iamonjob vous propose un email de relance structuré et professionnel. C'est votre modèle pour relancer sans harceler. Personnalisez-le avec un élément nouveau et pertinent : une actualité récente de l'entreprise, une compétence que vous venez d'acquérir, un projet similaire que vous avez découvert. La relance générique \"je me permets de revenir vers vous\" finit en spam. Un email pertinent montre votre motivation. Un email creux agace. La meilleure relance donne une nouvelle raison au recruteur de s'intéresser à vous.",
    requiresCV: false,
    requiresJobOffer: true,
    requiresQuestionnaire: false,
    allowsNotes: true,
    outputType: 'email',
    storageKey: 'iamonjob_follow_up',
    actionType: 'follow_up_email_response',
    apiEndpoint: '/api/services/execute/follow_up_email',
    tabs: [
      { id: 'email', label: 'Email', icon: '📧' },
      { id: 'variants', label: 'Variantes', icon: '🔄' },
      { id: 'timing', label: 'Timing', icon: '⏰' }
    ]
  },

  // === THÈME : PROJET PROFESSIONNEL ===
  skills_analysis: {
    id: 'skills_analysis',
    title: 'Analysez vos compétences d\'après votre CV',
    shortTitle: 'Analyse compétences',
    icon: '🔍',
    coachAdvice: "L'IA détecte vos compétences transférables en analysant votre parcours. Vous découvrirez des atouts que vous sous-estimez et de nouveaux secteurs où les valoriser. Pour chaque compétence identifiée, listez 3 réalisations concrètes qui la prouvent. \"Je sais gérer\" ne vaut rien. \"J'ai géré 10 personnes pendant 2 ans avec 0% de turnover\" est nettement plus convaincant. Comme l'amour, les compétences ont besoin de preuves ! Vos vraies compétences ne sont pas ce que vous savez faire, mais ce que vous avez déjà fait.",
    requiresCV: true,
    requiresJobOffer: false,
    requiresQuestionnaire: true,
    allowsNotes: true,
    outputType: 'skills_analysis',
    storageKey: 'iamonjob_skills_analysis',
    actionType: 'skills_analysis_response',
    apiEndpoint: '/api/services/execute/skills_analysis',
    tabs: [
      { id: 'summary', label: 'Synthèse', icon: '📊' },
      { id: 'skills', label: 'Compétences', icon: '🎯' },
      { id: 'transferability', label: 'Transférabilité', icon: '🔄' },
      { id: 'opportunities', label: 'Opportunités', icon: '🌟' }
    ]
  },

  reconversion_analysis: {
    id: 'reconversion_analysis',
    title: 'Découvrez des pistes de reconversion',
    shortTitle: 'Reconversion',
    icon: '🔄',
    coachAdvice: "Commencez par indiquer dans l'espace ci-dessous la recounversion qui vous inspirerait le plus. Iamonjob va identifier des pistes de reconversion cohérentes avec votre profil. C'est votre carte des possibles, pas une boule de cristal et pas LA Vérité absolue ! Confrontez ces idées à VOS contraintes réelles (budget, famille, mobilité). Pour chaque compétence manquante, identifiez comment l'acquérir rapidement : formation courte, bénévolat, projet personnel. Surtout, TESTEZ avant de sauter : stage d'observation, mission freelance, immersion d'une journée. L'IA suggère des chemins mais ne vivra pas les conséquences de vos choix. Une reconversion réussie se teste avant de se lancer. Rêver c'est bien, tester c'est mieux.",
    requiresCV: true,
    requiresJobOffer: false,
    requiresQuestionnaire: true,
    allowsNotes: true,
    outputType: 'reconversion',
    storageKey: 'iamonjob_reconversion',
    actionType: 'reconversion_analysis_response',
    apiEndpoint: '/api/services/execute/reconversion_analysis',
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
    coachAdvice: "Iamonjob vous propose des métiers compatibles avec vos compétences actuelles. C'est votre liste de pistes réalistes, pas de rêves inaccessibles. Sélectionnez 3 métiers maximum et enquêtez sérieusement. Pour chacun : contactez 2 professionnels sur LinkedIn pour un échange, analysez 5 vraies offres d'emploi, identifiez les 2-3 compétences prioritaires à acquérir. L'exploration superficielle ne mène nulle part. L'IA suggère des directions mais seule votre enquête terrain validera le choix. Un métier sur le papier et un métier au quotidien sont deux réalités différentes. Le bon métier n'est pas celui qui vous fait rêver, mais celui dont vous connaissez et acceptez la réalité.",
    requiresCV: true,
    requiresJobOffer: false,
    requiresQuestionnaire: true,
    allowsNotes: true,
    outputType: 'career_orientation',
    storageKey: 'iamonjob_career_orientation',
    actionType: 'career_transition_response',
    apiEndpoint: '/api/services/execute/career_transition',
    tabs: [
      { id: 'summary', label: 'Synthèse', icon: '📊' },
      { id: 'table', label: 'Tableau comparatif', icon: '📋' }
    ]
  },

  salary_negotiation: {
    id: 'salary_negotiation',
    title: 'Négociez votre salaire',
    shortTitle: 'Négociation salaire',
    icon: '💰',
    coachAdvice: "Vous avez maintenant des leviers de négociation basés sur le marché et votre profil. C'est votre arsenal d'arguments objectifs. Pour être plus crédible et convaincant, préparez 3 réussites chiffrées qui justifient vos prétentions (économies réalisées, CA généré, délais tenus). Ne négociez JAMAIS sans plan B : autres pistes, missions freelance, formation financée. Sans alternative, vous êtes pieds et poings liés. L'IA fournit les arguments mais c'est votre assurance qui fera la différence. Et rappelez-vous qu'une vraie négociation commence quand vous êtes prêt à dire non. Pas avant...",
    requiresCV: true,
    requiresJobOffer: true,
    requiresQuestionnaire: true,
    allowsNotes: true,
    outputType: 'salary_negotiation',
    storageKey: 'iamonjob_salary_negotiation',
    actionType: 'salary_negotiation_response',
    apiEndpoint: '/api/services/execute/salary_negotiation',
    tabs: [
      { id: 'arguments', label: 'Arguments', icon: '💬' },
      { id: 'range', label: 'Fourchette', icon: '📊' },
      { id: 'strategy', label: 'Stratégie', icon: '🎯' }
    ]
  },

  industry_orientation: {
    id: 'industry_orientation',
    title: "Et pourquoi pas un métier dans l'industrie ?",
    shortTitle: 'Métier industrie',
    icon: '🏭',
    coachAdvice: "L'industrie peut aussi proposer de belles carrières. Iamonjob identifie vos passerelles vers ce secteur, même sans formation technique. L'industrie recrute des profils variés et forme en interne. Explorez les sites des entreprises industrielles locales, repérez les postes sans prérequis techniques stricts. Mettez en avant vos soft skills transférables : rigueur, esprit d'équipe, respect des procédures. L'industrie moderne cherche des mentalités, pas que des diplômes. L'IA révèle les opportunités mais c'est votre motivation visible qui convaincra. L'industrie forme volontiers ceux qui montrent envie et sérieux. Le secteur manque de bras et de têtes. L'industrie d'aujourd'hui n'est plus celle de vos grands-parents. Elle cherche des talents, pas des robots.",
    requiresCV: true,
    requiresJobOffer: false,
    requiresQuestionnaire: true,
    allowsNotes: true,
    outputType: 'industry_orientation',
    storageKey: 'iamonjob_industry_orientation',
    actionType: 'industry_orientation_response',
    apiEndpoint: '/api/services/execute/industry_orientation',
    tabs: [
      { id: 'summary', label: 'Synthèse', icon: '📊' },
      { id: 'table', label: 'Tableau comparatif', icon: '📋' }
    ]
  },

  analyse_emploi: {
    id: 'analyse_emploi',
    title: 'Analyse d\'offre d\'emploi',
    shortTitle: 'Analyse offre',
    icon: '🔍',
    coachAdvice: "Iamonjob vous aide à décoder les offres d'emploi au-delà des mots : vraies priorités du poste, compétences négociables vs critiques, signaux sur la culture d'entreprise. Vous saurez où mettre l'accent. Utilisez cette analyse pour personnaliser chirurgicalement votre candidature. Reprenez le vocabulaire exact de l'offre, insistez sur les points critiques identifiés, anticipez les questions probables. L'IA décrypte les attentes mais c'est votre adéquation réelle qui compte. Ne forcez pas le match si l'écart est trop grand. Mieux vaut une compatibilité vraie qu'un maquillage qui tombera en entretien.",
    requiresCV: true,
    requiresJobOffer: true,
    requiresQuestionnaire: false,
    allowsNotes: true,
    outputType: 'analysis',
    storageKey: 'iamonjob_analyse_emploi',
    actionType: 'analyse_emploi_response',
    apiEndpoint: '/api/generic/analyse_emploi',
    tabs: [
      { id: 'analysis', label: 'Analyse', icon: '📊' },
      { id: 'skills', label: 'Compétences', icon: '🎯' },
      { id: 'opportunities', label: 'Opportunités', icon: '🌟' }
    ]
  },

  cv_video: {
    id: 'cv_video',
    title: 'CV Vidéo - Présentez-vous en vidéo',
    shortTitle: 'CV Vidéo',
    icon: '🎥',
    coachAdvice: "Un CV vidéo vous permet de vous démarquer et de montrer votre personnalité. Iamonjob vous guide pour créer une présentation vidéo percutante. Préparez votre script, choisissez un bon éclairage, soignez votre tenue et votre environnement. Parlez clairement, regardez la caméra, et restez naturel. Votre CV vidéo doit compléter votre CV papier, pas le remplacer. Montrez votre passion et votre motivation pour le poste. L'IA vous aide à structurer votre présentation mais c'est votre authenticité qui fera la différence.",
    requiresCV: true,
    requiresJobOffer: true,
    requiresQuestionnaire: true,
    allowsNotes: true,
    outputType: 'cv_video',
    storageKey: 'iamonjob_cv_video',
    actionType: 'cv_video_response',
    apiEndpoint: '/api/cv-video/generate',
    tabs: [
      { id: 'script', label: 'Script', icon: '📝' },
      { id: 'tips', label: 'Conseils', icon: '💡' },
      { id: 'structure', label: 'Structure', icon: '📋' }
    ]
  }
};

// Utilitaires pour travailler avec la config
export const getServiceConfig = (serviceId) => {
  return SERVICES_CONFIG[serviceId] || null;
};

export const getServicesByCategory = () => {
  const categories = {
    evaluate_offer: ['matching_cv_offre', 'analyse_emploi'],
    improve_cv: ['analyze_cv', 'cv_ats_optimization'],
    apply_jobs: ['cover_letter_advice', 'cover_letter_generate', 'follow_up_email'],
    interview_prep: ['professional_pitch', 'interview_prep', 'salary_negotiation', 'cv_video'],
    career_project: ['skills_analysis', 'reconversion_analysis', 'career_transition', 'industry_orientation']
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
