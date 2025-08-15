// frontend/src/utils/contextUtils.js
// Utilitaires pour optimiser le contexte envoyé à l'IA

// frontend/src/utils/contextUtils.js
// Utilitaires pour optimiser le contexte envoyé à l'IA
// ⚠️ IMPORTANT : Ces fonctions reconstituent TOUJOURS le contexte à partir des données ACTUELLES

/**
 * Crée un contexte enrichi en fusionnant CV et questionnaire pour l'IA
 * 🔄 FUSION DYNAMIQUE : Reconstruit à chaque appel avec les données actuelles
 * @param {Object} documentStatus - Statut ACTUEL des documents (live data)
 * @returns {string} - Contexte optimisé pour l'IA
 */
export const createEnrichedContext = (documentStatus) => {
  let context = "";
  
  // 1. CV (document principal) - DONNÉES ACTUELLES
  if (documentStatus.cv?.uploaded && documentStatus.cv?.content) {
    context += "=== CURRICULUM VITAE ===\n\n";
    context += documentStatus.cv.content;
    context += "\n\n";
  }
  
  // 2. Questionnaire personnel (si disponible) - DONNÉES ACTUELLES  
  if (documentStatus.questionnaire?.uploaded && documentStatus.questionnaire?.content) {
    context += "=== PROFIL PERSONNEL ET ASPIRATIONS ===\n\n";
    context += documentStatus.questionnaire.content;
    context += "\n\n";
  }
  
  // 3. Métier visé (si défini) - DONNÉES ACTUELLES
  if (documentStatus.metier_souhaite?.uploaded && documentStatus.metier_souhaite?.content) {
    context += "=== PROJET DE RECONVERSION ===\n\n";
    context += documentStatus.metier_souhaite.content;
    context += "\n\n";
  }
  
  return context.trim();
};

/**
 * Crée un contexte pour l'analyse de compatibilité CV/Offre
 * 🔄 FUSION DYNAMIQUE : Toujours basé sur les données actuelles
 * @param {Object} documentStatus - Statut ACTUEL des documents
 * @returns {Object} - Contexte structuré pour l'analyse de compatibilité
 */
export const createCompatibilityContext = (documentStatus) => {
  const result = {
    candidateProfile: "",
    jobOffer: "",
    hasPersonalProfile: false,
    hasCareerChange: false
  };
  
  // Profil du candidat (CV + questionnaire) - DONNÉES ACTUELLES
  if (documentStatus.cv?.uploaded && documentStatus.cv?.content) {
    result.candidateProfile += "=== PROFIL DU CANDIDAT ===\n\n";
    result.candidateProfile += "--- CURRICULUM VITAE ---\n";
    result.candidateProfile += documentStatus.cv.content;
    result.candidateProfile += "\n\n";
    
    // Ajouter le questionnaire s'il existe - DONNÉES ACTUELLES
    if (documentStatus.questionnaire?.uploaded && documentStatus.questionnaire?.content) {
      result.candidateProfile += "--- ASPIRATIONS ET OBJECTIFS PERSONNELS ---\n";
      result.candidateProfile += documentStatus.questionnaire.content;
      result.candidateProfile += "\n\n";
      result.hasPersonalProfile = true;
    }
    
    // Ajouter le projet de reconversion s'il existe - DONNÉES ACTUELLES
    if (documentStatus.metier_souhaite?.uploaded && documentStatus.metier_souhaite?.content) {
      result.candidateProfile += "--- PROJET DE RECONVERSION ---\n";
      result.candidateProfile += documentStatus.metier_souhaite.content;
      result.candidateProfile += "\n\n";
      result.hasCareerChange = true;
    }
  }
  
  // Offre d'emploi - DONNÉES ACTUELLES
  if (documentStatus.offre_emploi?.uploaded && documentStatus.offre_emploi?.content) {
    result.jobOffer = "=== OFFRE D'EMPLOI CIBLE ===\n\n";
    result.jobOffer += documentStatus.offre_emploi.content;
  }
  
  return result;
};

/**
 * Optimise le texte du questionnaire en retirant les questions vides
 * (utilisé dans QuestionnaireModal.js)
 * @param {Object} formData - Données du formulaire
 * @returns {string} - Texte optimisé pour l'IA
 */
export const optimizeQuestionnaireForAI = (formData) => {
  const questionsLabels = {
    quality: "Mes principales qualités professionnelles",
    skills_to_develop: "Compétences que je souhaite développer", 
    ideal_environment: "Mon environnement de travail idéal",
    sectors_of_interest: "Secteurs d'activité qui m'intéressent",
    constraints: "Mes contraintes personnelles",
    change_attitude: "Mon rapport au changement et nouvelles situations",
    communication_style: "Mon style de communication",
    values: "Mes valeurs professionnelles importantes", 
    five_year_goal: "Mon objectif professionnel à 5 ans",
    additional_info: "Informations complémentaires importantes"
  };

  let optimizedText = "PROFIL PERSONNEL - ASPIRATIONS ET OBJECTIFS\n\n";
  
  // Ne garder que les réponses fournies
  Object.entries(formData).forEach(([key, value]) => {
    if (value && value.trim()) {
      optimizedText += `• ${questionsLabels[key]} :\n${value.trim()}\n\n`;
    }
  });

  // Statistiques pour l'IA
  const answeredCount = Object.values(formData).filter(v => v && v.trim()).length;
  optimizedText += `[Profil enrichi : ${answeredCount}/10 questions renseignées]`;
  
  return optimizedText;
};

/**
 * Crée un prompt optimisé pour l'IA en fonction du type d'analyse
 * 🔄 TOUJOURS AVEC DONNÉES FRAÎCHES
 * @param {string} analysisType - Type d'analyse (cv, compatibility, letter, etc.)
 * @param {Object} documentStatus - Statut ACTUEL des documents (jamais de cache)
 * @returns {string} - Prompt optimisé avec contexte live
 */
export const createOptimizedPrompt = (analysisType, documentStatus) => {
  let prompt = "";
  
  switch (analysisType) {
    case 'cv_analysis':
      prompt = createEnrichedContext(documentStatus);
      if (documentStatus.questionnaire?.uploaded) {
        prompt += "\n\nINSTRUCTION : Prends en compte les aspirations personnelles dans ton analyse du CV.";
      }
      break;
      
    case 'compatibility':
      const compatContext = createCompatibilityContext(documentStatus);
      prompt = compatContext.candidateProfile + "\n\n" + compatContext.jobOffer;
      if (compatContext.hasPersonalProfile) {
        prompt += "\n\nINSTRUCTION : Intègre les aspirations personnelles dans l'analyse de compatibilité.";
      }
      break;
      
    case 'cover_letter':
      const letterContext = createCompatibilityContext(documentStatus);
      prompt = letterContext.candidateProfile + "\n\n" + letterContext.jobOffer;
      if (letterContext.hasPersonalProfile) {
        prompt += "\n\nINSTRUCTION : Personnalise la lettre en tenant compte des valeurs et aspirations du candidat.";
      }
      break;
      
    default:
      prompt = createEnrichedContext(documentStatus);
  }
  
  return prompt;
};

/**
 * 🔒 FONCTION DE SÉCURITÉ : Garantit que les données sont fraîches avant appel IA
 * Cette fonction doit être appelée dans AppContext avant chaque executeQuickAction
 * @param {Function} reloadDocuments - Fonction pour recharger les documents depuis l'API
 * @param {string} analysisType - Type d'analyse à effectuer
 * @returns {Promise<Object>} - Documents frais garantis
 */
export const ensureFreshDataBeforeAI = async (reloadDocuments, analysisType) => {
  console.log(`🔄 Rechargement des données avant analyse: ${analysisType}`);
  
  try {
    // Forcer le rechargement depuis l'API
    await reloadDocuments();
    
    console.log(`✅ Données fraîches garanties pour: ${analysisType}`);
    return { success: true };
  } catch (error) {
    console.error(`❌ Erreur rechargement données pour ${analysisType}:`, error);
    return { success: false, error: error.message };
  }
};

/**
 * 📝 GUIDE D'UTILISATION DANS AppContext
 * 
 * Dans executeQuickAction, TOUJOURS faire :
 * 
 * const executeQuickAction = async (actionId) => {
 *   // 1. RECHARGER LES DONNÉES AVANT L'ANALYSE
 *   await ensureFreshDataBeforeAI(loadDocumentsStatus, actionId);
 *   
 *   // 2. CRÉER LE CONTEXTE AVEC LES DONNÉES FRAÎCHES
 *   const context = createOptimizedPrompt(actionId, documentStatus);
 *   
 *   // 3. APPELER L'IA AVEC LE CONTEXTE À JOUR
 *   const response = await callAI(context);
 * };
 */

/**
 * Valide si les documents nécessaires sont disponibles pour une analyse
 * @param {string} analysisType - Type d'analyse
 * @param {Object} documentStatus - Statut des documents
 * @returns {Object} - Résultat de validation avec messages
 */
export const validateDocumentsForAnalysis = (analysisType, documentStatus) => {
  const result = {
    isValid: false,
    missingDocuments: [],
    recommendations: []
  };
  
  switch (analysisType) {
    case 'cv_analysis':
      if (!documentStatus.cv?.uploaded) {
        result.missingDocuments.push('CV');
      } else {
        result.isValid = true;
        if (!documentStatus.questionnaire?.uploaded) {
          result.recommendations.push('Complétez votre questionnaire personnel pour une analyse encore plus précise');
        }
      }
      break;
      
    case 'compatibility':
      if (!documentStatus.cv?.uploaded) {
        result.missingDocuments.push('CV');
      }
      if (!documentStatus.offre_emploi?.uploaded) {
        result.missingDocuments.push('Offre d\'emploi');
      }
      if (result.missingDocuments.length === 0) {
        result.isValid = true;
        if (!documentStatus.questionnaire?.uploaded) {
          result.recommendations.push('Le questionnaire personnel enrichirait l\'analyse de compatibilité');
        }
      }
      break;
      
    case 'cover_letter':
      if (!documentStatus.cv?.uploaded) {
        result.missingDocuments.push('CV');
      }
      if (!documentStatus.offre_emploi?.uploaded) {
        result.missingDocuments.push('Offre d\'emploi');
      }
      if (result.missingDocuments.length === 0) {
        result.isValid = true;
        if (!documentStatus.questionnaire?.uploaded) {
          result.recommendations.push('Vos aspirations personnelles rendraient la lettre plus authentique');
        }
      }
      break;
      
    default:
      result.isValid = true;
  }
  
  return result;
};

export default {
  createEnrichedContext,
  createCompatibilityContext, 
  optimizeQuestionnaireForAI,
  createOptimizedPrompt,
  validateDocumentsForAnalysis
};
