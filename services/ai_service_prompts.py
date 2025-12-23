# FICHIER : services/ai_service_prompts.py
# SYSTEME HYBRIDE : Lecture rapide (Cache) + Écriture BDD (Admin)

import logging
from typing import Optional, Dict, Any, List

# Configuration des logs
logger = logging.getLogger(__name__)

# Cache en mémoire pour éviter de taper la BDD à chaque message
AI_PROMPTS = {}

# ============================================================
# 1. PARTIE CONSOMMATEUR (Utilisée par le Chat/IA)
# ============================================================

def execute_ai_service(service_id, cv_content, job_content="", questionnaire_content="", user_notes="", force_new=False):
    """
    Exécute un service IA en utilisant la configuration en mémoire.
    """
    try:
        from services.ai_service_mistral import call_mistral_api
        
        # Sécurité : Si le cache est vide, on tente de le remplir
        if not AI_PROMPTS:
            reload_prompts_from_db()

        if service_id in AI_PROMPTS:
            service_config = AI_PROMPTS[service_id]
            prompt_template = service_config["prompt"]
            
            logger.info(f"🚀 Exécution Service IA : {service_id}")
            
            # Construction du prompt avec injection de données
            prompt = prompt_template
            prompt = prompt.replace("{cv_content}", cv_content or "Non fourni")
            prompt = prompt.replace("{job_content}", job_content or "Non fourni")
            prompt = prompt.replace("{questionnaire_content}", questionnaire_content or "Non fourni")
            prompt = prompt.replace("{user_notes}", user_notes or "")
            
            # Instructions conditionnelles
            instruction_text = "Analysez le profil personnel fourni." if questionnaire_content else "Analysez le CV et l'offre."
            context_text = f"\n\nCONTEXTE PERSONNEL:\n{questionnaire_content}" if questionnaire_content else ""
            
            prompt = prompt.replace("{questionnaire_instruction}", instruction_text)
            prompt = prompt.replace("{questionnaire_context}", context_text)
            
            # Gestion Cache (Analyse CV)
            if service_id == "analyze_cv" and cv_content:
                from services.cv_analysis_persistence import CVAnalysisPersistence
                cache_result = CVAnalysisPersistence.get_persistent_analysis(cv_content, force_new=force_new)
                if cache_result['success']:
                    return cache_result['analysis']
            
            return call_mistral_api(prompt, service_id=service_id)
        else:
            return f"Service non configuré : {service_id}"
            
    except Exception as e:
        logger.error(f"❌ Erreur exécution service {service_id}: {e}")
        return f"Erreur technique: {str(e)}"

def generate_generic_service(service_id, cv_content, job_content="", questionnaire_content="", user_notes=""):
    return execute_ai_service(service_id, cv_content, job_content, questionnaire_content, user_notes)

# ============================================================
# 2. PARTIE ADMINISTRATION (Utilisée par l'API Admin)
# ============================================================

def get_all_prompts() -> Dict[str, Any]:
    """Retourne tous les prompts (pour la liste admin)"""
    # On rafraîchit le cache pour être sûr d'avoir la dernière version BDD
    reload_prompts_from_db()
    return AI_PROMPTS

def get_prompt(service_id: str) -> Optional[Dict[str, Any]]:
    """Retourne un prompt spécifique"""
    if service_id not in AI_PROMPTS:
        reload_prompts_from_db()
    return AI_PROMPTS.get(service_id)

def update_prompt(service_id: str, new_prompt: str) -> bool:
    """
    Met à jour un prompt en BDD et rafraîchit le cache.
    C'est cette fonction que l'Admin API appelle.
    """
    try:
        from services.supabase_storage import _supabase_storage
        if not _supabase_storage or not _supabase_storage.is_available():
            return False

        # 1. Mise à jour BDD
        response = _supabase_storage.client.table('ai_prompts').update({
            'prompt': new_prompt,
            'updated_at': 'now()'
        }).eq('service_id', service_id).execute()
        
        # 2. Mise à jour Cache Immédiate (Hot Reload)
        if service_id in AI_PROMPTS:
            AI_PROMPTS[service_id]['prompt'] = new_prompt
            logger.info(f"✅ Prompt {service_id} mis à jour (BDD + Cache)")
            return True
        else:
            # Si c'est un nouveau service, on recharge tout
            return reload_prompts_from_db()

    except Exception as e:
        logger.error(f"❌ Erreur mise à jour prompt {service_id}: {e}")
        return False

def reload_prompts_from_file():
    """Alias pour la compatibilité (ancien nom de fonction)"""
    return reload_prompts_from_db()

# ============================================================
# 3. INTERNE (Synchro BDD)
# ============================================================

def reload_prompts_from_db():
    """Charge la configuration depuis Supabase vers le cache mémoire"""
    try:
        from services.supabase_storage import _supabase_storage
        
        if not _supabase_storage or not _supabase_storage.is_available():
            return False
        
        response = _supabase_storage.client.table('ai_prompts').select('*').execute()
        
        if response.data:
            AI_PROMPTS.clear()
            for row in response.data:
                AI_PROMPTS[row['service_id']] = {
                    "id": row['service_id'],
                    "prompt": row['prompt'],
                    "title": row.get('title', 'Service sans titre'),
                    "requires_cv": row.get('requires_cv', False),
                    # On garde tout ce qui peut être utile
                    "description": row.get('description', '')
                }
            logger.info(f"✅ Prompts chargés : {len(AI_PROMPTS)} services")
            return True
        return False
        
    except Exception as e:
        logger.error(f"❌ Erreur chargement prompts DB: {e}")
        return False

# Initialisation au démarrage
reload_prompts_from_db()
