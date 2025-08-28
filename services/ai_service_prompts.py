# FICHIER : services/ai_service_prompts.py
# SYSTÈME HYBRIDE : Base de données + JSON en fallback

# Dictionnaire vide qui sera rempli depuis la base de données ou le JSON
AI_PROMPTS = {}

# Dictionnaire vide qui sera rempli depuis la base de données ou le JSON
AI_PROMPTS = {}

def execute_ai_service(service_id, cv_content, job_content="", questionnaire_content="", user_notes=""):
    """Fonction générique pour exécuter un service IA selon l'identifiant"""
    try:
        from services.ai_service_mistral import call_mistral_api
        
        # Récupérer le prompt depuis le dictionnaire centralisé
        if service_id in AI_PROMPTS:
            service_config = AI_PROMPTS[service_id]
            prompt_template = service_config["prompt"]
            
            # Remplacer les variables de contexte dans le prompt
            prompt = prompt_template.replace("{cv_content}", cv_content or "CV non disponible")
            prompt = prompt.replace("{job_content}", job_content or "Offre d'emploi non disponible")
            prompt = prompt.replace("{questionnaire_content}", questionnaire_content or "Questionnaire non disponible")
            prompt = prompt.replace("{user_notes}", user_notes or "")
            
            # Remplacer les placeholders dans le prompt
            prompt = prompt.replace("{questionnaire_instruction}", 
                "Analysez le profil personnel fourni pour personnaliser l'analyse." if questionnaire_content else 
                "Analysez le CV et l'offre d'emploi fournis.")
            
            prompt = prompt.replace("{questionnaire_context}", 
                f"\n\nCONTEXTE PERSONNEL:\n{questionnaire_content}" if questionnaire_content else "")
            
            # Appeler l'API avec le prompt personnalisé (sans contexte séparé)
            return call_mistral_api(prompt, service_id=service_id)
        else:
            # Fallback pour les services non configurés
            prompt = f"SERVICE: {service_id}\nCV:\n{cv_content}\n\nOFFRE:\n{job_content}\n\nQUESTIONNAIRE:\n{questionnaire_content}\n\nNOTES:\n{user_notes}"
            return call_mistral_api(prompt, service_id=service_id)
            
    except ImportError:
        return f"Service IA temporairement indisponible pour {service_id}"
    except Exception as e:
        return f"Erreur lors de l'exécution du service {service_id}: {str(e)}"

def generate_generic_service(service_id, cv_content, job_content="", questionnaire_content="", user_notes=""):
    """Fonction générique pour tous les services"""
    return execute_ai_service(
        service_id=service_id,
        cv_content=cv_content,
        job_content=job_content,
        questionnaire_content=questionnaire_content,
        user_notes=user_notes
    )

# === FONCTIONS UTILITAIRES AVEC BASE DE DONNÉES ===

def get_all_prompts():
    """Retourne la configuration complète des prompts depuis la base de données."""
    try:
        # Essayer d'abord la base de données
        prompts = get_prompts_from_database()
        if prompts:
            return prompts
        else:
            # Fallback vers le fichier JSON
            print("⚠️ Base de données non disponible, utilisation du fichier JSON")
            return get_prompts_from_json()
    except Exception as e:
        print(f"⚠️ Erreur base de données: {e}, utilisation du fichier JSON")
        return get_prompts_from_json()

def get_prompt(service_id):
    """Retourne le prompt d'un service donné depuis la base de données."""
    try:
        # Essayer d'abord la base de données
        prompt = get_prompt_from_database(service_id)
        if prompt:
            return prompt
        else:
            # Fallback vers le fichier JSON
            return get_prompt_from_json(service_id)
    except Exception as e:
        print(f"⚠️ Erreur base de données: {e}, utilisation du fichier JSON")
        return get_prompt_from_json(service_id)

def reload_prompts_from_file():
    """Recharge les prompts depuis la base de données ou le fichier JSON"""
    try:
        # Essayer d'abord la base de données
        prompts = get_prompts_from_database()
        if prompts:
            AI_PROMPTS.clear()
            AI_PROMPTS.update(prompts)
            print(f"✅ Prompts rechargés depuis la base de données: {len(prompts)} services")
            return True
        else:
            # Si pas de prompts en DB, essayer de créer la table
            print("⚠️ Aucun prompt en base, tentative de création de la table...")
            if create_prompts_table():
                # Réessayer de récupérer les prompts
                prompts = get_prompts_from_database()
                if prompts:
                    AI_PROMPTS.clear()
                    AI_PROMPTS.update(prompts)
                    print(f"✅ Prompts rechargés depuis la base de données: {len(prompts)} services")
                    return True
            
            # Fallback vers le fichier JSON
            prompts = get_prompts_from_json()
            if prompts:
                AI_PROMPTS.clear()
                AI_PROMPTS.update(prompts)
                print(f"✅ Prompts rechargés depuis le fichier JSON: {len(prompts)} services")
                return True
            else:
                print("❌ Aucun prompt trouvé (ni DB ni JSON)")
                return False
    except Exception as e:
        print(f"❌ Erreur lors du rechargement des prompts: {e}")
        return False

def update_prompt(service_id, new_prompt):
    """Met à jour le contenu du prompt pour un service dans la base de données."""
    try:
        # Essayer d'abord la base de données
        success = update_prompt_in_database(service_id, new_prompt)
        if success:
            # Mettre à jour en mémoire
            if service_id in AI_PROMPTS:
                AI_PROMPTS[service_id]["prompt"] = new_prompt
            print(f"✅ Prompt mis à jour dans la base de données pour {service_id}")
            return True
        else:
            # Fallback vers le fichier JSON
            success = update_prompt_in_json(service_id, new_prompt)
            if success:
                # Mettre à jour en mémoire
                if service_id in AI_PROMPTS:
                    AI_PROMPTS[service_id]["prompt"] = new_prompt
                print(f"✅ Prompt mis à jour dans le fichier JSON pour {service_id}")
                return True
            else:
                print(f"❌ Impossible de mettre à jour le prompt pour {service_id}")
                return False
    except Exception as e:
        print(f"❌ Erreur lors de la mise à jour du prompt: {e}")
        return False

# === FONCTIONS BASE DE DONNÉES ===

def get_prompts_from_database():
    """Récupère tous les prompts depuis la base de données Supabase"""
    try:
        # Importer la connexion à Supabase
        from services.supabase_storage import _supabase_storage
        
        if not _supabase_storage or not _supabase_storage.is_available():
            print("⚠️ Supabase non disponible")
            return None
        
        # Récupérer tous les prompts
        response = _supabase_storage.client.table('ai_prompts').select('*').execute()
        
        if response.data:
            prompts = {}
            for row in response.data:
                prompts[row['service_id']] = {
                    "id": row['service_id'],
                    "title": row['title'],
                    "description": row['description'],
                    "prompt": row['prompt'],
                    "requires_cv": bool(row['requires_cv']),
                    "requires_job_offer": bool(row['requires_job_offer']),
                    "requires_questionnaire": bool(row['requires_questionnaire'])
                }
            return prompts
        else:
            print("⚠️ Aucun prompt trouvé dans la base de données")
            return None
        
    except Exception as e:
        print(f"❌ Erreur base de données Supabase: {e}")
        return None

def get_prompt_from_database(service_id):
    """Récupère un prompt spécifique depuis la base de données Supabase"""
    try:
        from services.supabase_storage import _supabase_storage
        
        if not _supabase_storage or not _supabase_storage.is_available():
            print("⚠️ Supabase non disponible")
            return None
        
        response = _supabase_storage.client.table('ai_prompts').select('*').eq('service_id', service_id).execute()
        
        if response.data and len(response.data) > 0:
            row = response.data[0]
            return {
                "id": row['service_id'],
                "title": row['title'],
                "description": row['description'],
                "prompt": row['prompt'],
                "requires_cv": bool(row['requires_cv']),
                "requires_job_offer": bool(row['requires_job_offer']),
                "requires_questionnaire": bool(row['requires_questionnaire'])
            }
        return None
        
    except Exception as e:
        print(f"❌ Erreur base de données Supabase: {e}")
        return None

def update_prompt_in_database(service_id, new_prompt):
    """Met à jour un prompt dans la base de données Supabase"""
    try:
        from services.supabase_storage import _supabase_storage
        
        if not _supabase_storage or not _supabase_storage.is_available():
            print("⚠️ Supabase non disponible")
            return False
        
        response = _supabase_storage.client.table('ai_prompts').update({
            'prompt': new_prompt,
            'updated_at': 'now()'
        }).eq('service_id', service_id).execute()
        
        success = len(response.data) > 0
        return success
        
    except Exception as e:
        print(f"❌ Erreur base de données Supabase: {e}")
        return False

def create_prompts_table():
    """Crée la table ai_prompts dans Supabase si elle n'existe pas"""
    try:
        from services.supabase_storage import _supabase_storage
        
        if not _supabase_storage or not _supabase_storage.is_available():
            print("⚠️ Supabase non disponible")
            return False
        
        # Vérifier si la table existe en essayant de récupérer un prompt
        response = _supabase_storage.client.table('ai_prompts').select('service_id').limit(1).execute()
        
        if not response.data:
            print("⚠️ Table ai_prompts vide, insertion des prompts par défaut...")
            insert_default_prompts()
        
        return True
        
    except Exception as e:
        print(f"❌ Erreur lors de la création de la table: {e}")
        return False

def insert_default_prompts():
    """Insère les prompts par défaut dans Supabase"""
    try:
        from services.supabase_storage import _supabase_storage
        
        if not _supabase_storage or not _supabase_storage.is_available():
            print("⚠️ Supabase non disponible")
            return False
        
        # Récupérer les prompts depuis le fichier JSON
        prompts = get_prompts_from_json()
        
        if prompts:
            for service_id, prompt_data in prompts.items():
                _supabase_storage.client.table('ai_prompts').upsert({
                    'service_id': service_id,
                    'title': prompt_data.get('title', ''),
                    'description': prompt_data.get('description', ''),
                    'prompt': prompt_data.get('prompt', ''),
                    'requires_cv': prompt_data.get('requires_cv', False),
                    'requires_job_offer': prompt_data.get('requires_job_offer', False),
                    'requires_questionnaire': prompt_data.get('requires_questionnaire', False)
                }).execute()
            
            print(f"✅ {len(prompts)} prompts par défaut insérés dans Supabase")
            return True
        
        return False
        
    except Exception as e:
        print(f"❌ Erreur lors de l'insertion des prompts par défaut: {e}")
        return False

# === FONCTIONS FICHIER JSON (FALLBACK) ===

def get_prompts_from_json():
    """Récupère tous les prompts depuis le fichier JSON (fallback)"""
    try:
        import json
        import os
        
        prompts_file = os.path.join(os.path.dirname(__file__), 'ai_service_prompts.json')
        
        if os.path.exists(prompts_file):
            with open(prompts_file, 'r', encoding='utf-8') as f:
                prompts = json.load(f)
                print(f"📁 Prompts chargés depuis le fichier JSON: {len(prompts)} services")
                return prompts
        else:
            print("⚠️ Fichier JSON non trouvé")
            return {}
            
    except Exception as e:
        print(f"❌ Erreur lors du chargement du fichier JSON: {e}")
        return {}

def get_prompt_from_json(service_id):
    """Récupère un prompt spécifique depuis le fichier JSON (fallback)"""
    prompts = get_prompts_from_json()
    return prompts.get(service_id)

def update_prompt_in_json(service_id, new_prompt):
    """Met à jour un prompt dans le fichier JSON (fallback)"""
    try:
        import json
        import os
        
        prompts_file = os.path.join(os.path.dirname(__file__), 'ai_service_prompts.json')
        
        if os.path.exists(prompts_file):
            with open(prompts_file, 'r', encoding='utf-8') as f:
                prompts = json.load(f)
        else:
            prompts = {}
        
        # Mettre à jour le prompt
        if service_id in prompts:
            prompts[service_id]["prompt"] = new_prompt
            
            # Sauvegarder la configuration mise à jour
            with open(prompts_file, 'w', encoding='utf-8') as f:
                json.dump(prompts, f, ensure_ascii=False, indent=2)
            
            print(f"📁 Prompt mis à jour dans le fichier JSON pour {service_id}")
            return True
        else:
            print(f"❌ Service {service_id} non trouvé dans le fichier JSON")
            return False
            
    except Exception as e:
        print(f"❌ Erreur lors de la mise à jour du fichier JSON: {e}")
        return False

# Charger les prompts au démarrage
print("🔄 Chargement des prompts depuis la base de données...")
reload_prompts_from_file()
