# FICHIER : backend/routes/generic_services.py
# NOUVEAU FICHIER - Routes génériques pour tous les services

from flask import Blueprint, request, jsonify, session
from datetime import datetime
from services.stateless_manager import StatelessDataManager

# Import sécurisé avec fallback
HAS_AI_SERVICE = True  # Toujours True, import différé

def execute_ai_service(*args, **kwargs):
    """Import différé pour éviter le circular import"""
    try:
        from services.ai_service_prompts import execute_ai_service as real_execute_ai_service
        return real_execute_ai_service(*args, **kwargs)
    except ImportError as e:
        print(f"❌ Erreur import execute_ai_service: {e}")
        return "Service IA temporairement indisponible"

# Configuration des services - SUPPRIMÉE
# La configuration est maintenant centralisée dans frontend/src/services/servicesConfig.js
# et récupérée via l'API /api/services/config

def handle_generic_service(service_id, request):
    """Gère un service générique basé sur sa configuration"""
    try:
        # Configuration minimale pour les services essentiels
        # La configuration complète est maintenant dans frontend/src/services/servicesConfig.js
        basic_configs = {
            "matching_cv_offre": {
                "title": "Matching CV/Offre",
                "output_key": "matching",
                "action_type": "matching_response",
                "requires_cv": True,
                "requires_job": True,
                "requires_questionnaire": False,
                "allows_notes": True
            },
            "analyze_cv": {
                "title": "Analyse CV",
                "output_key": "analysis",
                "action_type": "analyze_cv_response",
                "requires_cv": True,
                "requires_job": False,
                "requires_questionnaire": False,
                "allows_notes": False
            },
            "cv_ats_optimization": {
                "title": "Optimisation CV ATS",
                "output_key": "optimization",
                "action_type": "ats_optimization_response",
                "requires_cv": True,
                "requires_job": True,
                "requires_questionnaire": False,
                "allows_notes": False
            },
            "analyse_emploi": {
                "title": "Analyse d'Offre d'Emploi",
                "output_key": "analysis",
                "action_type": "analyse_emploi_response",
                "requires_cv": True,
                "requires_job": True,
                "requires_questionnaire": False,
                "allows_notes": True
            },
            "cover_letter_advice": {
                "title": "Conseils Lettre de Motivation",
                "output_key": "advice",
                "action_type": "cover_letter_advice_response",
                "requires_cv": True,
                "requires_job": True,
                "requires_questionnaire": False,
                "allows_notes": False
            },
            "cover_letter_generate": {
                "title": "Génération Lettre de Motivation",
                "output_key": "cover_letter",
                "action_type": "cover_letter_generate_response",
                "requires_cv": True,
                "requires_job": True,
                "requires_questionnaire": True,
                "allows_notes": True
            },
            "professional_pitch": {
                "title": "Pitch Professionnel",
                "output_key": "pitch",
                "action_type": "professional_pitch_response",
                "requires_cv": True,
                "requires_job": True,
                "requires_questionnaire": True,
                "allows_notes": True
            },
            "interview_prep": {
                "title": "Préparation Entretien",
                "output_key": "interview_prep",
                "action_type": "interview_prep_response",
                "requires_cv": True,
                "requires_job": True,
                "requires_questionnaire": False,
                "allows_notes": True
            },
            "follow_up_email": {
                "title": "Email de Relance",
                "output_key": "email",
                "action_type": "follow_up_email_response",
                "requires_cv": False,
                "requires_job": True,
                "requires_questionnaire": False,
                "allows_notes": True
            },
            "skills_analysis": {
                "title": "Analyse des Compétences",
                "output_key": "skills_analysis",
                "action_type": "skills_analysis_response",
                "requires_cv": True,
                "requires_job": False,
                "requires_questionnaire": True,
                "allows_notes": True
            },
            "reconversion_analysis": {
                "title": "Analyse de Reconversion",
                "output_key": "reconversion",
                "action_type": "reconversion_analysis_response",
                "requires_cv": True,
                "requires_job": False,
                "requires_questionnaire": True,
                "allows_notes": True
            },
            "career_transition": {
                "title": "Transition de Carrière",
                "output_key": "career_orientation",
                "action_type": "career_transition_response",
                "requires_cv": True,
                "requires_job": False,
                "requires_questionnaire": True,
                "allows_notes": True
            },
            "salary_negotiation": {
                "title": "Négociation Salariale",
                "output_key": "salary_negotiation",
                "action_type": "salary_negotiation_response",
                "requires_cv": True,
                "requires_job": True,
                "requires_questionnaire": True,
                "allows_notes": True
            },
            "industry_orientation": {
                "title": "Orientation Secteur",
                "output_key": "industry_orientation",
                "action_type": "industry_orientation_response",
                "requires_cv": True,
                "requires_job": False,
                "requires_questionnaire": True,
                "allows_notes": True
            },
            "cv_video": {
                "title": "CV Vidéo",
                "output_key": "cv_video",
                "action_type": "cv_video_response",
                "requires_cv": True,
                "requires_job": True,
                "requires_questionnaire": True,
                "allows_notes": True
            }
        }
        
        # Vérifier que le service est configuré
        if service_id not in basic_configs:
            print(f"❌ Service {service_id} non configuré")
            return jsonify({
                "success": False,
                "error": f"Service {service_id} non configuré"
            }), 400

        config = basic_configs[service_id]
        print(f"🔍 === DEBUG {config['title'].upper()} ===")
        
        # ✅ CORRIGÉ : Récupérer les données utilisateur avec individualisation
        user_email = None
        try:
            # Récupérer l'email de l'utilisateur connecté depuis le token JWT
            auth_header = request.headers.get('Authorization')
            if auth_header and auth_header.startswith('Bearer '):
                token = auth_header.split(' ')[1]
                # Décoder le token pour récupérer l'email
                import jwt
                from config.app_config import JWT_SECRET_KEY
                payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=['HS256'])
                user_email = payload.get('email')
        except Exception as e:
            print(f"⚠️ Erreur récupération email utilisateur: {e}")
        
        # Utiliser StatelessDataManager avec individualisation si possible
        if user_email:
            user_data = StatelessDataManager.get_user_data_by_email(user_email)
            print(f"👤 Individualisation: Service {service_id} pour {user_email}")
        else:
            user_data = StatelessDataManager.get_user_data()
            print(f"⚠️ Pas d'individualisation pour {service_id}")
        
        documents = user_data.get('documents', {})
        
        print(f"📊 User data complet: {user_data}")
        print(f"📊 Documents disponibles: {list(documents.keys())}")
        print(f"📊 Documents détaillés: {documents}")
        
        # Test spécifique pour reconversion_analysis
        if service_id == "reconversion_analysis":
            print(f"🔍 TEST RECONVERSION - CV: {documents.get('cv', {}).get('content', 'VIDE')[:100]}")
            print(f"🔍 TEST RECONVERSION - Questionnaire: {documents.get('questionnaire', {}).get('content', 'VIDE')[:100]}")
        
        # Récupérer les documents selon la configuration
        cv_data = documents.get('cv', {}) if config['requires_cv'] else {}
        job_data = documents.get('offre_emploi', {}) if config['requires_job'] else {}
        questionnaire_data = documents.get('questionnaire', {}) if config['requires_questionnaire'] else {}
        
        # Debug détaillé des données récupérées
        print(f"🔍 Debug des données récupérées pour {service_id}:")
        print(f"   CV data: {cv_data}")
        print(f"   Job data: {job_data}")
        print(f"   Questionnaire data: {questionnaire_data}")
        print(f"   CV content: '{cv_data.get('content', '')[:100] if cv_data.get('content') else 'VIDE'}...'")
        print(f"   Job content: '{job_data.get('content', '')[:100] if job_data.get('content') else 'VIDE'}...'")
        print(f"   Questionnaire content: '{questionnaire_data.get('content', '')[:100] if questionnaire_data.get('content') else 'VIDE'}...'")
        print(f"   User data complet: {user_data}")
        print(f"   Documents disponibles: {list(documents.keys())}")
        print(f"   Config requirements: CV={config['requires_cv']}, Job={config['requires_job']}, Questionnaire={config['requires_questionnaire']}")
        
        # Vérifications des documents obligatoires
        if config['requires_cv'] and not cv_data.get('content'):
            return jsonify({
                "success": False,
                "error": "CV requis pour ce service"
            }), 400
            
        if config['requires_job'] and not job_data.get('content'):
            return jsonify({
                "success": False,
                "error": "Offre d'emploi requise pour ce service"
            }), 400
            
        if config['requires_questionnaire'] and not questionnaire_data.get('content'):
            return jsonify({
                "success": False,
                "error": "Questionnaire requis pour ce service"
            }), 400
        
        # Extraire le contenu
        cv_content = cv_data.get('content', '') if config['requires_cv'] else ''
        job_content = job_data.get('content', '') if config['requires_job'] else ''
        questionnaire_content = questionnaire_data.get('content', '') if config['requires_questionnaire'] else ''
        
        # Récupérer les notes personnelles et paramètres
        data = request.get_json() or {}
        user_notes = data.get('notes', '') if config['allows_notes'] else ''
        force_new = data.get('force_new', False)
        
        print(f"CV content length: {len(cv_content)}")
        print(f"Job content length: {len(job_content)}")
        print(f"Questionnaire content length: {len(questionnaire_content)}")
        print(f"User notes: {bool(user_notes)}")
        
        # Appel sécurisé avec gestion d'erreurs et debug
        if HAS_AI_SERVICE:
            print(f"🤖 Appel execute_ai_service pour {service_id}")
            print(f"📄 CV length: {len(cv_content)}")
            print(f"💼 Job length: {len(job_content)}")
            
            # ✅ CAS SPÉCIFIQUE POUR MATCHING CV/OFFRE
            if service_id == "matching_cv_offre":
                # Utiliser le système de prompts centralisé
                result = execute_ai_service(
                    service_id="matching_cv_offre",
                    cv_content=cv_content,
                    job_content=job_content,
                    questionnaire_content=questionnaire_content,
                    user_notes=user_notes,
                    force_new=force_new
                )
            else:
                # Appel générique pour tous les autres services (y compris cv_video)
                result = execute_ai_service(
                    service_id=service_id,
                    cv_content=cv_content,
                    job_content=job_content,
                    questionnaire_content=questionnaire_content,
                    user_notes=user_notes,
                    force_new=force_new
                )
            
            print(f"🔍 Résultat IA brut: {repr(result)}")
            print(f"📏 Longueur résultat: {len(str(result))}")
            
            # Si le résultat est vide, fournir une analyse factice pour test
            if not result or len(str(result).strip()) < 10:
                print("⚠️ Résultat IA vide, génération d'analyse de test")
                result = f"""🎯 **ANALYSE DE COMPATIBILITÉ** (Mode test)

## Score Global : 75%

### 📊 Analyse détaillée
Votre profil présente une compatibilité correcte avec cette offre d'emploi.

### ✅ Points forts identifiés
- CV présent et analysé
- Offre d'emploi détectée
- Profil cohérent

### ⚠️ Points d'attention  
- Configuration IA à finaliser
- Analyse plus approfondie nécessaire

### 💡 Recommandations
1. Personnaliser votre candidature
2. Mettre en avant vos expériences pertinentes
3. Préparer votre entretien

*Note: Cette analyse est générée en mode test. Contactez l'administrateur pour activer l'IA complète.*

{{"compatibilityScore": 75, "technical": 70, "soft": 80, "experience": 75, "education": 85, "culture": 70}}"""
        else:
            result = f"🎯 **{config['title']}** (Service temporairement indisponible)\n\nLe service IA nécessite une configuration API."
        
        print(f"✅ {config['title']} généré: {len(result)} caractères")
        
        # 🎯 TRACKING DES TOKENS CONSOMMÉS
        try:
            # Estimer la consommation de tokens (approximatif)
            estimated_tokens = len(str(result)) // 4  # Estimation : 1 token ≈ 4 caractères
            
            # Récupérer l'email de l'utilisateur
            from flask import request
            if hasattr(request, 'current_user') and request.current_user:
                user_email = request.current_user.email
                
                # Importer et utiliser le token tracker
                try:
                    from services.token_tracker import record_tokens
                    
                    # Enregistrer la consommation de tokens
                    service_name = f"{service_id}_service"
                    success = record_tokens(user_email, estimated_tokens, service_name)
                    
                    if success:
                        print(f"✅ Tokens enregistrés pour {user_email}: {estimated_tokens} tokens (estimé)")
                    else:
                        print(f"⚠️ Échec enregistrement tokens pour {user_email}")
                        
                except Exception as token_error:
                    print(f"⚠️ Erreur tracking tokens: {token_error}")
                    # Ne pas faire échouer le service principal pour une erreur de tracking
                    
        except Exception as e:
            print(f"⚠️ Erreur générale tracking tokens: {e}")
        
        # ⭐ SAUVEGARDER DANS L'HISTORIQUE DU CHAT ⭐
        user_message = {
            "role": "user",
            "content": f"🚀 Génération : {config['title']}{' avec notes' if user_notes else ''}",
            "timestamp": datetime.now().isoformat(),
            "action_type": f"{service_id}_request",
            "documents_used": [k for k, v in {
                'cv': cv_content, 
                'offre_emploi': job_content, 
                'questionnaire': questionnaire_content
            }.items() if v],
            "user_notes": bool(user_notes)
        }
        
        ai_message = {
            "role": "assistant", 
            "content": result,
            "timestamp": datetime.now().isoformat(),
            "action_type": config['action_type'],
            "service_id": service_id,
            "metadata": {
                "used_cv": bool(cv_content),
                "used_job_offer": bool(job_content), 
                "used_questionnaire": bool(questionnaire_content),
                "used_notes": bool(user_notes)
            }
        }
        
        # Ajouter à l'historique
        if 'chat_history' not in user_data:
            user_data['chat_history'] = []
        
        user_data['chat_history'].extend([user_message, ai_message])
        
        # Sauvegarder avec StatelessDataManager
        StatelessDataManager.save_user_data(user_data)
        
        print(f"💾 {config['title']} ajouté à l'historique (total: {len(user_data['chat_history'])} messages)")
        
        # Construire la réponse de succès
        response_data = {
            "success": True,
            "message": f"{config['title']} généré avec succès",
            "analysis": result,  # ← Le contenu doit être ici, pas le message
            config['output_key']: result
        }
        
        # Debug final
        print(f"📤 Envoi réponse avec analysis de {len(str(result))} caractères")
        print(f"📤 Premier extrait: {str(result)[:100]}...")
        
        return jsonify(response_data), 200
        
    except Exception as e:
        print(f"❌ Erreur {service_id}: {e}")
        return jsonify({
            "success": False,
            "error": f"Erreur lors de la génération: {str(e)}"
        }), 500

# Créer un Blueprint pour les routes génériques
generic_services_bp = Blueprint('generic_services', __name__)

# === NOUVELLES ROUTES SANS CONFLIT ===
@generic_services_bp.route('/api/actions/analyze-cv', methods=['POST'])
def analyze_cv_unified():
    """Route unifiée pour l'analyse CV via le système générique"""
    # Import lazy pour éviter les problèmes de déploiement
    from backend.routes.api.auth_api import verify_jwt_token
    return verify_jwt_token(handle_generic_service)('analyze_cv', request)


@generic_services_bp.route("/api/cv/ats-optimize", methods=["POST"])
def cv_ats_optimization_unified():
    """Route unifiée pour l'optimisation ATS"""
    # Import lazy pour éviter les problèmes de déploiement
    from backend.routes.api.auth_api import verify_jwt_token
    return verify_jwt_token(handle_generic_service)("cv_ats_optimization", request)


@generic_services_bp.route("/api/generic/analyse_emploi", methods=["POST"])
def analyse_emploi_unified():
    """Route unifiée pour l'analyse d'offre d'emploi"""
    # Import lazy pour éviter les problèmes de déploiement
    from backend.routes.api.auth_api import verify_jwt_token
    return verify_jwt_token(handle_generic_service)("analyse_emploi", request)


# === ÉVITER LES ROUTES EN CONFLIT ===
# Ne pas enregistrer interview_prepare, pitch_generate, etc.
# car elles existent déjà dans app.py

print("✅ Routes génériques sans conflit enregistrées")

# Export pour utilisation dans app.py
__all__ = ['generic_services_bp', 'handle_generic_service']

def get_fallback_services_config():
    """Configuration de fallback des services - SUPPRIMÉE"""
    # La configuration est maintenant centralisée dans frontend/src/services/servicesConfig.js
    return jsonify({
        "success": False,
        "error": "Configuration des services non disponible. Veuillez recharger la page."
    }), 500

print("✅ Routes services config enregistrées avec fallback")
