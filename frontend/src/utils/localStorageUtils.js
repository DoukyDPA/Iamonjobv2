// frontend/src/utils/localStorageUtils.js
/**
 * Utilitaires pour la gestion du localStorage
 * Gestion centralisée du nettoyage des données persistantes
 */

// Clés de localStorage à nettoyer lors du chargement de nouveaux documents
const STORAGE_KEYS_TO_CLEAR = [
  // Résultats d'analyses
  'iamonjob_advice',
  'iamonjob_letter',
  'iamonjob_notes',
  'cvAnalysis',

  // Résultats stockés des services IA
  'iamonjob_cv_analysis',
  'iamonjob_ats_optimization',
  'iamonjob_matching',
  'iamonjob_cover_advice',
  'iamonjob_cover_generate',
  'iamonjob_follow_up',
  'iamonjob_interview_prep',
  'iamonjob_pitch',
  'iamonjob_presentation',
  'iamonjob_salary',
  'iamonjob_reconversion',
  'iamonjob_cv_improvement',
  'iamonjob_cv_compatibility',
  'iamonjob_job_analysis',
  'iamonjob_compatibility_score',
  'iamonjob_letter_content',
  'iamonjob_personal_analysis',
  'iamonjob_career_advice',
  'iamonjob_reconversion_plan',
  'iamonjob_career_orientation',
  'iamonjob_industry_orientation',
  
  // Résultats de services génériques
  'iamonjob_analysis_result',
  'iamonjob_compatibility_result',
  'iamonjob_interview_prep',
  'iamonjob_pitch_result',
  'iamonjob_presentation_result',
  'iamonjob_reconversion_result',
  'iamonjob_followup_result',
  'iamonjob_salary_result',
  'iamonjob_matching_result',
  
  // Données persistantes
  'chat_history_data',
  'document_status_data',
  
  // Cache des services
  'iamonjob_service_cache',
  'iamonjob_analysis_cache',
  
  // Autres données liées aux actions génériques
  'iamonjob_generated_content',
  'iamonjob_service_results'
];

/**
 * Nettoie le localStorage pour un type de document spécifique
 * @param {string} documentType - Type de document (cv, offre_emploi, questionnaire)
 */
export const clearLocalStorageForDocument = (documentType) => {
  try {
    console.log(`🗑️ Nettoyage localStorage pour nouveau ${documentType}`);
    
    // Nettoyer les clés spécifiques selon le type de document
    const keysToRemove = [...STORAGE_KEYS_TO_CLEAR];
    
    // Ajouter des clés spécifiques selon le type
    if (documentType === 'cv') {
      keysToRemove.push(
        'iamonjob_cv_analysis',
        'iamonjob_cv_improvement',
        'iamonjob_cv_compatibility',
        'iamonjob_career_orientation',
        'iamonjob_industry_orientation'
      );
    } else if (documentType === 'offre_emploi') {
      keysToRemove.push(
        'iamonjob_job_analysis',
        'iamonjob_compatibility_score',
        'iamonjob_letter_content'
      );
    } else if (documentType === 'questionnaire') {
      keysToRemove.push(
        'iamonjob_personal_analysis',
        'iamonjob_career_advice',
        'iamonjob_reconversion_plan',
        'iamonjob_career_orientation',
        'iamonjob_industry_orientation'
      );
    }
    
    // Supprimer toutes les clés
    keysToRemove.forEach(key => {
      try {
        localStorage.removeItem(key);
        console.log(`✅ Supprimé: ${key}`);
      } catch (e) {
        console.warn(`⚠️ Erreur suppression ${key}:`, e);
      }
    });
    
    // Déclencher un événement pour notifier les composants
    try {
      localStorage.setItem('iamonjob_clear_cache', 'true');
      // Déclencher l'événement storage pour les autres onglets
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'iamonjob_clear_cache',
        newValue: 'true',
        oldValue: null
      }));
    } catch (e) {
      console.warn('⚠️ Erreur déclenchement événement:', e);
    }
    
    console.log(`✅ localStorage nettoyé pour ${documentType}`);
    return true;
    
  } catch (error) {
    console.error('❌ Erreur nettoyage localStorage:', error);
    return false;
  }
};

/**
 * Nettoie complètement le localStorage
 */
export const clearAllLocalStorage = () => {
  try {
    console.log('🗑️ Nettoyage complet localStorage');
    
    // Supprimer toutes les clés de l'application
    const allKeys = Object.keys(localStorage);
    const appKeys = allKeys.filter(key => key.startsWith('iamonjob_') || key.includes('cv') || key.includes('analysis'));
    
    appKeys.forEach(key => {
      try {
        localStorage.removeItem(key);
        console.log(`✅ Supprimé: ${key}`);
      } catch (e) {
        console.warn(`⚠️ Erreur suppression ${key}:`, e);
      }
    });
    
    console.log('✅ localStorage complètement nettoyé');
    return true;
    
  } catch (error) {
    console.error('❌ Erreur nettoyage complet localStorage:', error);
    return false;
  }
};

/**
 * Notifie le serveur de nettoyer le cache et nettoie le localStorage
 * @param {string} documentType - Type de document
 */
export const notifyServerAndClearLocalStorage = async (documentType) => {
  try {
    console.log(`🔄 Notification serveur pour nettoyage ${documentType}`);
    
    // Appeler l'API pour nettoyer le cache serveur
    const response = await fetch('/api/chat/clear-local-storage', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
      },
      body: JSON.stringify({
        document_type: documentType
      })
    });
    
    const data = await response.json();
    
    if (data.success && data.clear_local_storage) {
      // Nettoyer le localStorage côté client
      clearLocalStorageForDocument(documentType);
      console.log('✅ Cache serveur et localStorage nettoyés');
      return true;
    } else {
      console.warn('⚠️ Réponse serveur inattendue:', data);
      // Nettoyer quand même le localStorage
      clearLocalStorageForDocument(documentType);
      return false;
    }
    
  } catch (error) {
    console.error('❌ Erreur notification serveur:', error);
    // Nettoyer quand même le localStorage en cas d'erreur
    clearLocalStorageForDocument(documentType);
    return false;
  }
};

/**
 * Vérifie si des données sont présentes dans le localStorage
 * @param {string} documentType - Type de document
 * @returns {boolean} - True si des données sont présentes
 */
export const hasLocalStorageData = (documentType) => {
  try {
    const relevantKeys = STORAGE_KEYS_TO_CLEAR.filter(key => 
      key.includes(documentType) || 
      key.includes('analysis') || 
      key.includes('result')
    );
    
    return relevantKeys.some(key => localStorage.getItem(key) !== null);
  } catch (error) {
    console.warn('⚠️ Erreur vérification localStorage:', error);
    return false;
  }
}; 
