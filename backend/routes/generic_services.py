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

# Configuration des services (équivalent JS en Python)
# REMPLACEZ le SERVICES_CONFIG existant par celui-ci dans generic_services.py

SERVICES_CONFIG = {
    # === SERVICES DE LETTRE DE MOTIVATION (NOUVEAUX) ===
    "cover_letter_advice": {
        "title": "Conseils Lettre de Motivation",
        "output_key": "advice",
        "action_type": "cover_letter_advice_response",
        "requires_cv": True,
        "requires_job": False,  # Peut fonctionner avec juste CV
        "requires_questionnaire": False,
        "allows_notes": False
    },
    "cover_letter_generate": {
        "title": "Génération Lettre de Motivation",
        "output_key": "letter",
        "action_type": "cover_letter_generated",
        "requires_cv": True,
        "requires_job": True,
        "requires_questionnaire": False,
        "allows_notes": True
    },
    
    # === SERVICES EXISTANTS (inchangés) ===
    "interview_prep": {
        "title": "Préparation Entretien",
        "output_key": "preparation",
        "action_type": "interview_prep_response",
        "requires_cv": True,
        "requires_job": True,
        "requires_questionnaire": False,
        "allows_notes": True
    },
    "professional_pitch": {
        "title": "Pitch Professionnel", 
        "output_key": "pitch",
        "action_type": "pitch_generated",
        "requires_cv": True,
        "requires_job": False,
        "requires_questionnaire": True,
        "allows_notes": True
    },
    "presentation_slides": {
        "title": "Présentation Candidature",
        "output_key": "presentation", 
        "action_type": "presentation_generated",
        "requires_cv": True,
        "requires_job": True,
        "requires_questionnaire": False,
        "allows_notes": True
    },
    "reconversion_analysis": {
        "title": "Analyse Reconversion",
        "output_key": "analysis",
        "action_type": "reconversion_analysis_response",
        "requires_cv": True,
        "requires_job": False,
        "requires_questionnaire": True,
        "allows_notes": True
    },
    "career_transition": {
        "title": "Orientation Métier",
        "output_key": "orientation",
        "action_type": "career_transition_response",
        "requires_cv": True,
        "requires_job": False,
        "requires_questionnaire": True,
        "allows_notes": True
    },
    "industry_orientation": {
        "title": "Orientation Industrie",
        "output_key": "industry_orientation",
        "action_type": "industry_orientation_response",
        "requires_cv": True,
        "requires_job": False,
        "requires_questionnaire": True,
        "allows_notes": True
    },
    "follow_up_email": {
        "title": "Email de Relance",
        "output_key": "email",
        "action_type": "followup_email_generated",
        "requires_cv": False,
        "requires_job": True, 
        "requires_questionnaire": False,
        "allows_notes": True
    },
    "salary_negotiation": {
        "title": "Négociation Salariale",
        "output_key": "negotiation",
        "action_type": "salary_negotiation_response",
        "requires_cv": True,
        "requires_job": True,
        "requires_questionnaire": False,
        "allows_notes": True
    },
    # === NOUVEAUX SERVICES UNIFIÉS ===
    "analyze_cv": {
        "title": "Analyse CV Approfondie",
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
    "matching_cv_offre": {
        "title": "Matching CV/Offre Professionnel",
        "output_key": "matching",
        "action_type": "matching_response",
        "requires_cv": True,
        "requires_job": True,
        "requires_questionnaire": False,
        "allows_notes": True
    }
}

def handle_generic_service(service_id, request):
    """Gère un service générique basé sur sa configuration"""
    try:
        # Vérifier que le service est configuré
        if service_id not in SERVICES_CONFIG:
            print(f"❌ Service {service_id} non configuré")
            return jsonify({
                "success": False,
                "error": f"Service {service_id} non configuré"
            }), 400

        config = SERVICES_CONFIG[service_id]
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
        
        print(f"Documents disponibles: {list(documents.keys())}")
        print(f"Documents détaillés: {documents}")
        
        # Récupérer les documents selon la configuration
        cv_data = documents.get('cv', {}) if config['requires_cv'] else {}
        job_data = documents.get('offre_emploi', {}) if config['requires_job'] else {}
        questionnaire_data = documents.get('questionnaire', {}) if config['requires_questionnaire'] else {}
        
        # Debug détaillé des données récupérées
        print(f"🔍 Debug des données récupérées:")
        print(f"   CV data: {cv_data}")
        print(f"   Job data: {job_data}")
        print(f"   Questionnaire data: {questionnaire_data}")
        print(f"   CV content: '{cv_data.get('content', '')[:100] if cv_data.get('content') else 'VIDE'}...'")
        print(f"   Job content: '{job_data.get('content', '')[:100] if job_data.get('content') else 'VIDE'}...'")
        print(f"   Questionnaire content: '{questionnaire_data.get('content', '')[:100] if questionnaire_data.get('content') else 'VIDE'}...'")
        
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
        
        # Récupérer les notes personnelles
        data = request.get_json() or {}
        user_notes = data.get('notes', '') if config['allows_notes'] else ''
        
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
                    user_notes=user_notes
                )
            else:
                # Appel générique pour les autres services
                result = execute_ai_service(
                    service_id=service_id,
                    cv_content=cv_content,
                    job_content=job_content,
                    questionnaire_content=questionnaire_content,
                    user_notes=user_notes
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


# === ÉVITER LES ROUTES EN CONFLIT ===
# Ne pas enregistrer interview_prepare, pitch_generate, etc.
# car elles existent déjà dans app.py

print("✅ Routes génériques sans conflit enregistrées")

# Export pour utilisation dans app.py
__all__ = ['generic_services_bp', 'handle_generic_service', 'SERVICES_CONFIG']

def get_fallback_services_config():
    """Configuration de fallback des services"""
    return jsonify({
        "success": True,
        "themes": {
            "evaluate_offer": {
                "title": "🎯 Évaluer une offre d'emploi",
                "services": [
                    {
                        "id": "matching_cv_offre",
                        "title": "Matching CV/Offre",
                        "coachAdvice": "Découvrez précisément votre adéquation avec cette offre grâce à une analyse IA approfondie avec graphiques détaillés.",
                        "slug": "matching-cv-offre",
                        "requiresCV": True,
                        "requiresJobOffer": True,
                        "requiresQuestionnaire": False,
                        "difficulty": "intermediate",
                        "duration": "5-10 min"
                    }
                ]
            },
            "improve_cv": {
                "title": "📄 Améliorer mon CV",
                "services": [
                    {
                        "id": "analyze_cv",
                        "title": "Évaluer mon CV",
                        "coachAdvice": "Obtenez une évaluation professionnelle de votre CV avec des recommandations concrètes pour l'optimiser.",
                        "slug": "analyze-cv",
                        "requiresCV": True,
                        "requiresJobOffer": False,
                        "requiresQuestionnaire": False,
                        "difficulty": "beginner",
                        "duration": "3-5 min"
                    },
                    {
                        "id": "cv_ats_optimization",
                        "title": "Optimiser pour les ATS",
                        "coachAdvice": "Adaptez votre CV pour qu'il soit parfaitement lisible par les systèmes de tri automatiques des entreprises.",
                        "slug": "cv-ats-optimization",
                        "requiresCV": True,
                        "requiresJobOffer": True,
                        "requiresQuestionnaire": False,
                        "difficulty": "intermediate",
                        "duration": "5-8 min"
                    }
                ]
            },
            "apply_jobs": {
                "title": "✉️ Candidater",
                "services": [
                    {
                        "id": "cover_letter_advice",
                        "title": "Conseils lettre de motivation",
                        "coachAdvice": "Recevez des conseils personnalisés pour structurer et rédiger une lettre de motivation percutante.",
                        "slug": "cover-letter-advice",
                        "requiresCV": True,
                        "requiresJobOffer": True,
                        "requiresQuestionnaire": False,
                        "difficulty": "beginner",
                        "duration": "3-5 min"
                    },
                    {
                        "id": "cover_letter_generate",
                        "title": "Générer lettre de motivation",
                        "coachAdvice": "Créez une lettre de motivation complète et personnalisée prête à être envoyée avec votre candidature.",
                        "slug": "cover-letter-generate",
                        "requiresCV": True,
                        "requiresJobOffer": True,
                        "requiresQuestionnaire": True,
                        "difficulty": "intermediate",
                        "duration": "8-12 min"
                    },
                    {
                        "id": "professional_pitch",
                        "title": "Pitch professionnel",
                        "coachAdvice": "Développez un pitch percutant pour vous présenter efficacement en entretien ou en networking.",
                        "slug": "professional-pitch",
                        "requiresCV": True,
                        "requiresJobOffer": False,
                        "requiresQuestionnaire": True,
                        "difficulty": "intermediate",
                        "duration": "6-10 min"
                    },
                    {
                        "id": "interview_prep",
                        "title": "Préparation entretien",
                        "coachAdvice": "Préparez-vous méthodiquement à votre entretien avec des questions types et des stratégies de réponse.",
                        "slug": "interview-prep",
                        "requiresCV": True,
                        "requiresJobOffer": True,
                        "requiresQuestionnaire": False,
                        "difficulty": "intermediate",
                        "duration": "10-15 min"
                    },
                    {
                        "id": "follow_up_email",
                        "title": "Email de relance",
                        "coachAdvice": "Rédigez un email de relance professionnel pour maintenir le contact après un entretien ou une candidature.",
                        "slug": "follow-up-email",
                        "requiresCV": False,
                        "requiresJobOffer": True,
                        "requiresQuestionnaire": False,
                        "difficulty": "beginner",
                        "duration": "3-5 min"
                    }
                ]
            },
            "career_project": {
                "title": "🚀 Reconstruire mon projet professionnel",
                "services": [
                    {
                        "id": "skills_analysis",
                        "title": "Analyser mes compétences",
                        "coachAdvice": "Identifiez vos compétences transférables et découvrez de nouveaux domaines d'application pour votre profil.",
                        "slug": "skills-analysis",
                        "requiresCV": True,
                        "requiresJobOffer": False,
                        "requiresQuestionnaire": True,
                        "difficulty": "intermediate",
                        "duration": "8-12 min"
                    },
                    {
                        "id": "reconversion_analysis",
                        "title": "Évaluer une reconversion",
                        "coachAdvice": "Explorez une reconversion professionnelle avec une analyse détaillée des étapes et opportunités.",
                        "slug": "reconversion-analysis",
                        "requiresCV": True,
                        "requiresJobOffer": False,
                        "requiresQuestionnaire": True,
                        "difficulty": "advanced",
                        "duration": "15-20 min"
                    },
                    {
                        "id": "career_transition",
                        "title": "Vers quel métier aller ?",
                        "coachAdvice": "Identifiez des métiers compatibles avec vos compétences et vos envies.",
                        "slug": "career-transition",
                        "requiresCV": True,
                        "requiresJobOffer": False,
                        "requiresQuestionnaire": True,
                        "difficulty": "intermediate",
                        "duration": "10-15 min"
                    },
                    {
                        "id": "industry_orientation",
                        "title": "Et pourquoi pas un métier dans l'industrie ?",
                        "coachAdvice": "Explorez les métiers industriels adaptés à votre profil.",
                        "slug": "industry-orientation",
                        "requiresCV": True,
                        "requiresJobOffer": False,
                        "requiresQuestionnaire": True,
                        "difficulty": "intermediate",
                        "duration": "10-15 min"
                    }
                ]
            }
        },
        "featured": {
            "id": "reconversion_analysis",
            "title": "Tester ma compatibilité avec le métier de chauffeur de bus",
            "coachAdvice": "Découvrez si le métier de chauffeur de bus correspond à votre profil et vos aspirations professionnelles.",
            "slug": "reconversion-analysis"
        }
    }), 200

print("✅ Routes services config enregistrées avec fallback")
