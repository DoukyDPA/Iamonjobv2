# FICHIER : services/ai_service_prompts.py
# ARCHITECTURE : Pure Consumer (Le code est esclave de la BDD)

import logging
from typing import Optional, Dict, Any

# Configuration des logs
logger = logging.getLogger(__name__)

# Cache en mémoire (rempli uniquement par la BDD)
AI_PROMPTS = {}

def execute_ai_service(service_id, cv_content, job_content="", questionnaire_content="", user_notes="", force_new=False):
    """
    Exécute un service IA en utilisant la configuration stockée en base de données.
    Si le service n'existe pas en base, on échoue proprement plutôt que d'inventer un prompt.
    """
    try:
        from services.ai_service_mistral import call_mistral_api
        
        # 1. Vérification si le service est chargé en mémoire
        if service_id not in AI_PROMPTS:
            # Tentative de rechargement à chaud (au cas où un admin vient de le créer)
            reload_prompts_from_db()
            
        if service_id in AI_PROMPTS:
            service_config = AI_PROMPTS[service_id]
            prompt_template = service_config["prompt"]
            
            logger.info(f"🚀 Exécution Service IA : {service_id}")
            
            # 2. Construction dynamique du prompt
            # On remplace les placeholders par les vraies données
            prompt = prompt_template
            
            # Injection sécurisée des données
            # On gère les clés manquantes pour éviter des erreurs de formatage
            prompt = prompt.replace("{cv_content}", cv_content or "Non fourni")
            prompt = prompt.replace("{job_content}", job_content or "Non fourni")
            prompt = prompt.replace("{questionnaire_content}", questionnaire_content or "Non fourni")
            prompt = prompt.replace("{user_notes}", user_notes or "")
            
            # Gestion des instructions conditionnelles (Questionnaire vs Standard)
            instruction_text = "Analysez le profil personnel fourni." if questionnaire_content else "Analysez le CV et l'offre."
            context_text = f"\n\nCONTEXTE PERSONNEL:\n{questionnaire_content}" if questionnaire_content else ""
            
            prompt = prompt.replace("{questionnaire_instruction}", instruction_text)
            prompt = prompt.replace("{questionnaire_context}", context_text)
            
            # 3. Gestion du Cache (Spécifique Analyse CV)
            if service_id == "analyze_cv" and cv_content:
                from services.cv_analysis_persistence import CVAnalysisPersistence
                cache_result = CVAnalysisPersistence.get_persistent_analysis(cv_content, force_new=force_new)
                if cache_result['success']:
                    logger.info(f"♻️ Résultat récupéré depuis le cache")
                    return cache_result['analysis']
            
            # 4. Appel API (Mistral)
            return call_mistral_api(prompt, service_id=service_id)
            
        else:
            logger.warning(f"⚠️ Service ID '{service_id}' inconnu dans la configuration Supabase.")
            return "Configuration du service IA manquante. Veuillez contacter l'administrateur."
            
    except Exception as e:
        logger.error(f"❌ Erreur exécution service {service_id}: {e}")
        return f"Erreur technique lors de l'analyse : {str(e)}"

def generate_generic_service(service_id, cv_content, job_content="", questionnaire_content="", user_notes=""):
    return execute_ai_service(service_id, cv_content, job_content, questionnaire_content, user_notes)

# === GESTION DE LA SYNCHRONISATION BDD ===

def reload_prompts_from_db():
    """
    Charge les configurations depuis la table 'ai_prompts' de Supabase.
    Ne crée rien, ne modifie rien. Lecture seule.
    """
    try:
        from services.supabase_storage import _supabase_storage
        
        # Vérification disponibilité
        if not _supabase_storage or not _supabase_storage.is_available():
            logger.warning("⚠️ Impossible de charger les prompts : Supabase non connecté")
            return False
        
        # Lecture de la table
        response = _supabase_storage.client.table('ai_prompts').select('*').execute()
        
        if response.data:
            AI_PROMPTS.clear()
            count = 0
            for row in response.data:
                # On stocke tout ce qui est utile
                AI_PROMPTS[row['service_id']] = {
                    "id": row['service_id'],
                    "prompt": row['prompt'],
                    "title": row.get('title', 'Service sans titre'),
                    "requires_cv": row.get('requires_cv', False)
                }
                count += 1
            logger.info(f"✅ Configuration IA chargée : {count} services actifs")
            return True
            
        logger.info("ℹ️ Aucun service IA configuré en base de données.")
        return False
        
    except Exception as e:
        logger.error(f"❌ Erreur chargement prompts depuis DB : {e}")
        return False

# Initialisation au démarrage
reload_prompts_from_db()
