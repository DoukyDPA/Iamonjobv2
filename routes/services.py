# routes/services.py
"""
Routes pour les services IA
"""

from flask import Blueprint, request, jsonify, session
from datetime import datetime
import os
from services.stateless_manager import StatelessDataManager

services_bp = Blueprint('services', __name__)

@services_bp.route('/api/actions/cover-letter_generate', methods=['POST'])
def action_cover_letter_generate():
    """Action rapide: Générer une lettre de motivation"""
    try:
        data = request.get_json() or {}
        user_notes = data.get('notes', '')
        service_id = data.get('service_id', 'cover_letter_generate')
        
        # Utiliser StatelessDataManager pour la cohérence
        user_data = StatelessDataManager.get_user_data()
        documents = user_data.get('documents', {})
        
        print(f"🔍 === DEBUG {service_id.upper()} ===")
        print(f"Documents disponibles: {list(documents.keys())}")
        
        # Récupérer tous les documents
        cv_data = documents.get('cv', {})
        job_data = documents.get('offre_emploi', {})
        questionnaire_data = documents.get('questionnaire', {})
        
        print(f"CV uploaded: {cv_data.get('uploaded', False)}")
        print(f"Job uploaded: {job_data.get('uploaded', False)}")
        print(f"Questionnaire uploaded: {questionnaire_data.get('uploaded', False)}")
        
        # Vérifier les documents obligatoires
        if not cv_data.get('uploaded') or not job_data.get('uploaded'):
            return jsonify({
                "success": False,
                "error": "CV et offre d'emploi requis pour générer une lettre de motivation"
            }), 400
        
        # Extraire le contenu
        cv_content = cv_data.get('content', '')
        job_content = job_data.get('content', '')
        questionnaire_content = questionnaire_data.get('content', '') if questionnaire_data.get('uploaded') else ''
        
        print(f"CV content length: {len(cv_content)}")
        print(f"Job content length: {len(job_content)}")
        print(f"Questionnaire content length: {len(questionnaire_content)}")
        print(f"User notes: {user_notes}")
        
        # Utiliser execute_ai_service
        try:
            from services.ai_service_prompts import execute_ai_service
            
            print("🤖 Génération de lettre de motivation avec IA...")
            
            # Appeler execute_ai_service avec le bon service_id
            cover_letter = execute_ai_service(
                service_id='cover_letter_generate',
                cv_content=cv_content,
                job_content=job_content, 
                questionnaire_content=questionnaire_content,
                user_notes=user_notes
            )
            
            print(f"✅ Lettre générée: {len(cover_letter)} caractères")
            
        except ImportError as e:
            print(f"❌ Erreur import execute_ai_service: {e}")
            # Fallback si execute_ai_service n'est pas disponible
            cover_letter = f"Erreur : Service IA temporairement indisponible. {str(e)}"
        
        # Sauvegarder dans l'historique
        user_message = {
            "role": "user",
            "content": f"🚀 Service : {service_id}",
            "timestamp": datetime.now().isoformat(),
            "action_type": service_id
        }
        
        ai_message = {
            "role": "assistant", 
            "content": cover_letter,
            "timestamp": datetime.now().isoformat(),
            "action_type": f"{service_id}_response"
        }
        
        # Ajouter à l'historique
        if 'chat_history' not in user_data:
            user_data['chat_history'] = []
        
        user_data['chat_history'].extend([user_message, ai_message])
        
        # Sauvegarder les données utilisateur
        StatelessDataManager.save_user_data(user_data)
        
        return jsonify({
            "success": True,
            "message": "Lettre de motivation générée avec succès",
            "analysis": cover_letter
        }), 200
        
    except Exception as e:
        print(f"❌ Erreur génération lettre: {e}")
        return jsonify({
            "success": False,
            "error": f"Erreur lors de la génération: {str(e)}"
        }), 500

@services_bp.route('/api/cover-letter/advice', methods=['POST'])
def cover_letter_advice():
    """Conseils pour lettre de motivation"""
    try:
        data = request.get_json() or {}
        user_notes = data.get('notes', '')
        service_id = data.get('service_id', 'cover_letter_advice')
        
        # Utiliser StatelessDataManager pour la cohérence
        user_data = StatelessDataManager.get_user_data()
        documents = user_data.get('documents', {})
        
        print(f"🔍 === DEBUG {service_id.upper()} ===")
        print(f"Documents disponibles: {list(documents.keys())}")
        
        # Récupérer tous les documents
        cv_data = documents.get('cv', {})
        job_data = documents.get('offre_emploi', {})
        questionnaire_data = documents.get('questionnaire', {})
        
        # Vérifier qu'au moins un document est disponible
        # Accepte les documents existants même si 'uploaded' est False
        if not cv_data and not job_data:
            return jsonify({
                "success": False,
                "error": "CV ou offre d'emploi requis pour générer des conseils"
            }), 400
        
        # Extraire le contenu
        cv_content = cv_data.get('content', '')
        job_content = job_data.get('content', '')
        questionnaire_content = questionnaire_data.get('content', '') if questionnaire_data.get('uploaded') else ''
        
        # Utiliser execute_ai_service
        try:
            from services.ai_service_prompts import execute_ai_service
            
            print("🤖 Génération de conseils lettre de motivation avec IA...")
            
            # Appeler execute_ai_service avec le bon service_id
            advice = execute_ai_service(
                service_id='cover_letter_advice',
                cv_content=cv_content,
                job_content=job_content, 
                questionnaire_content=questionnaire_content,
                user_notes=user_notes
            )
            
            print(f"✅ Conseils générés: {len(advice)} caractères")
            
        except ImportError as e:
            print(f"❌ Erreur import execute_ai_service: {e}")
            # Fallback si execute_ai_service n'est pas disponible
            advice = f"Erreur : Service IA temporairement indisponible. {str(e)}"
        
        # Sauvegarder dans l'historique
        user_message = {
            "role": "user",
            "content": f"🚀 Service : {service_id}",
            "timestamp": datetime.now().isoformat(),
            "action_type": service_id
        }
        
        ai_message = {
            "role": "assistant", 
            "content": advice,
            "timestamp": datetime.now().isoformat(),
            "action_type": f"{service_id}_response"
        }
        
        # Ajouter à l'historique
        if 'chat_history' not in user_data:
            user_data['chat_history'] = []
        
        user_data['chat_history'].extend([user_message, ai_message])
        
        # Sauvegarder les données utilisateur
        StatelessDataManager.save_user_data(user_data)
        
        return jsonify({
            "success": True,
            "message": "Conseils lettre de motivation générés avec succès",
            "analysis": advice
        }), 200
        
    except Exception as e:
        print(f"❌ Erreur génération conseils: {e}")
        return jsonify({
            "success": False,
            "error": f"Erreur lors de la génération des conseils: {str(e)}"
        }), 500

@services_bp.route('/api/cover-letter/generate', methods=['POST'])
def cover_letter_generate():
    """Génération lettre de motivation (endpoint alternatif)"""
    return action_cover_letter_generate()

@services_bp.route('/api/interview/prepare', methods=['POST'])
@verify_jwt_token
def interview_prepare():
    """Préparation entretien"""
    return handle_service_request('interview_prep')

@services_bp.route('/api/pitch/generate', methods=['POST'])
@verify_jwt_token
def pitch_generate():
    """Génération pitch professionnel"""
    return handle_service_request('professional_pitch')

@services_bp.route('/api/presentation/generate', methods=['POST'])
@verify_jwt_token
def presentation_generate():
    """Génération slides présentation"""
    return handle_service_request('presentation_slides')

@services_bp.route('/api/reconversion/analyze', methods=['POST'])
@verify_jwt_token
def reconversion_analyze():
    """Analyse reconversion"""
    return handle_service_request('reconversion_analysis')

@services_bp.route('/api/career/orientation', methods=['POST'])
@verify_jwt_token
def career_orientation():
    """Orientation métier"""
    return handle_service_request('career_transition')

@services_bp.route('/api/industry/orientation', methods=['POST'])
@verify_jwt_token
def industry_orientation():
    """Orientation industrie"""
    return handle_service_request('industry_orientation')

@services_bp.route('/api/followup/generate', methods=['POST'])
@verify_jwt_token
def followup_generate():
    """Génération email de relance"""
    return handle_service_request('follow_up_email')

@services_bp.route('/api/salary/prepare', methods=['POST'])
@verify_jwt_token
def salary_prepare():
    """Préparation négociation salaire"""
    return handle_service_request('salary_negotiation')

def handle_service_request(service_id):
    """Fonction générique pour gérer les requêtes de service"""
    try:
        data = request.get_json() or {}
        user_notes = data.get('notes', '')
        
        # ✅ CORRIGÉ : Utiliser l'utilisateur connecté pour l'individualisation
        # Maintenant que toutes les routes ont @verify_jwt_token, on a accès à request.current_user
        user_email = request.current_user.email
        print(f"👤 Individualisation: Service {service_id} pour {user_email}")
        
        # Utiliser StatelessDataManager avec individualisation
        user_data = StatelessDataManager.get_user_data_by_email(user_email)
        
        documents = user_data.get('documents', {})
        
        print(f"🔍 === DEBUG {service_id.upper()} ===")
        print(f"Documents disponibles: {list(documents.keys())}")
        print(f"Documents détaillés: {documents}")
        
        # Récupérer tous les documents
        cv_data = documents.get('cv', {})
        job_data = documents.get('offre_emploi', {})
        questionnaire_data = documents.get('questionnaire', {})
        
        # Vérifier les documents obligatoires (selon le service)
        if service_id in ['presentation_slides', 'reconversion_analysis', 'follow_up_email', 'salary_negotiation']:
            if not cv_data.get('uploaded'):
                return jsonify({
                    "success": False,
                    "error": f"CV requis pour {service_id}"
                }), 400
        elif service_id in ['interview_prep']:
            if not cv_data.get('uploaded') or not job_data.get('uploaded'):
                return jsonify({
                    "success": False,
                    "error": "CV et offre d'emploi requis pour préparer l'entretien"
                }), 400
        elif service_id in ['professional_pitch']:
            if not cv_data.get('uploaded'):
                return jsonify({
                    "success": False,
                    "error": "CV requis pour générer un pitch professionnel"
                }), 400
        
        # Extraire le contenu
        cv_content = cv_data.get('content', '')
        job_content = job_data.get('content', '')
        questionnaire_content = questionnaire_data.get('content', '') if questionnaire_data.get('uploaded') else ''
        
        # Utiliser execute_ai_service
        try:
            from services.ai_service_prompts import execute_ai_service
            
            print(f"🤖 Génération {service_id} avec IA...")
            
            # Appeler execute_ai_service avec le bon service_id
            result = execute_ai_service(
                service_id=service_id,
                cv_content=cv_content,
                job_content=job_content, 
                questionnaire_content=questionnaire_content,
                user_notes=user_notes
            )
            
            print(f"✅ {service_id} généré: {len(result)} caractères")
            
        except ImportError as e:
            print(f"❌ Erreur import execute_ai_service: {e}")
            # Fallback si execute_ai_service n'est pas disponible
            result = f"Erreur : Service IA temporairement indisponible. {str(e)}"
        
        # Sauvegarder dans l'historique
        user_message = {
            "role": "user",
            "content": f"🚀 Service : {service_id}",
            "timestamp": datetime.now().isoformat(),
            "action_type": service_id
        }
        
        ai_message = {
            "role": "assistant", 
            "content": result,
            "timestamp": datetime.now().isoformat(),
            "action_type": f"{service_id}_response"
        }
        
        # Ajouter à l'historique
        if 'chat_history' not in user_data:
            user_data['chat_history'] = []
        
        user_data['chat_history'].extend([user_message, ai_message])
        
        # Sauvegarder les données utilisateur
        StatelessDataManager.save_user_data(user_data)
        
        return jsonify({
            "success": True,
            "message": f"{service_id} généré avec succès",
            "analysis": result
        }), 200
        
    except Exception as e:
        print(f"❌ Erreur génération {service_id}: {e}")
        return jsonify({
            "success": False,
            "error": f"Erreur lors de la génération: {str(e)}"
        }), 500

@services_bp.route('/api/actions/compatibility', methods=['POST'])
def matching_cv_offre_analysis():
    """Route pour l'analyse de compatibilité (utilise le système générique)"""
    try:
        from backend.routes.generic_services import handle_generic_service
        
        # Récupérer le service_id depuis la requête
        data = request.get_json() or {}
        service_id = data.get('service_id', 'matching_cv_offre')
        
        print(f"🎯 Route compatibility appelée avec service_id: {service_id}")
        
        # Utiliser le handler générique
        return handle_generic_service(service_id, request)
        
    except ImportError as e:
        print(f"❌ Erreur import generic_services: {e}")
        return jsonify({
            "success": False,
            "error": "Service temporairement indisponible"
        }), 503
    except Exception as e:
        print(f"❌ Erreur route compatibility: {e}")
        return jsonify({
            "success": False,
            "error": f"Erreur lors de l'analyse de compatibilité: {str(e)}"
        }), 500

@services_bp.route('/api/services/config', methods=['GET'])
def get_services_config():
    """Endpoint public pour récupérer la configuration des services"""
    try:
        from backend.admin.services_manager import services_manager
        
        return jsonify({
            "success": True,
            "themes": services_manager.get_services_by_theme(),
            "featured": services_manager.get_featured_service()
        })
        
    except ImportError as e:
        print(f"❌ Erreur import services_manager: {e}")
        # Fallback avec configuration locale
        return jsonify({
            "success": True,
            "themes": {
                "evaluate_offer": {
                    "title": "🎯 Évaluer une offre d'emploi",
                    "services": [
                        {
                            "id": "matching_cv_offre",
                            "title": "Matching CV/Offre",
                            "coach_advice": "Découvrez précisément votre adéquation avec cette offre grâce à une analyse IA approfondie avec graphiques détaillés.",
                            "slug": "matching-cv-offre",
                            "requires_cv": True,
                            "requires_job_offer": True,
                            "difficulty": "intermediate",
                            "duration_minutes": 8
                        }
                    ]
                },
                "improve_cv": {
                    "title": "📄 Améliorer mon CV",
                    "services": [
                        {
                            "id": "analyze_cv",
                            "title": "Évaluer mon CV",
                            "coach_advice": "Obtenez une évaluation professionnelle de votre CV avec des recommandations concrètes pour l'optimiser.",
                            "slug": "analyze-cv",
                            "requires_cv": True,
                            "requires_job_offer": False,
                            "difficulty": "beginner",
                            "duration_minutes": 5
                        },
                        {
                            "id": "cv_ats_optimization",
                            "title": "Optimiser pour les ATS",
                            "coach_advice": "Adaptez votre CV pour qu'il soit parfaitement lisible par les systèmes de tri automatiques des entreprises.",
                            "slug": "cv-ats-optimization",
                            "requires_cv": True,
                            "requires_job_offer": True,
                            "difficulty": "intermediate",
                            "duration_minutes": 7
                        }
                    ]
                },
                "apply_jobs": {
                    "title": "✉️ Candidater",
                    "services": [
                        {
                            "id": "cover_letter_advice",
                            "title": "Conseils lettre de motivation",
                            "coach_advice": "Recevez des conseils personnalisés pour structurer et rédiger une lettre de motivation percutante.",
                            "slug": "cover-letter-advice",
                            "requires_cv": True,
                            "requires_job_offer": True,
                            "difficulty": "beginner",
                            "duration_minutes": 4
                        },
                        {
                            "id": "professional_pitch",
                            "title": "Pitch professionnel",
                            "coach_advice": "Développez un pitch percutant pour vous présenter efficacement en entretien ou en networking.",
                            "slug": "professional-pitch",
                            "requires_cv": True,
                            "requires_job_offer": False,
                            "difficulty": "intermediate",
                            "duration_minutes": 8
                        }
                    ]
                },
                "career_project": {
                    "title": "🚀 Reconstruire mon projet professionnel",
                    "services": [
                        {
                            "id": "reconversion_analysis",
                            "title": "Évaluer une reconversion",
                            "coach_advice": "Explorez une reconversion professionnelle avec une analyse détaillée des étapes et opportunités.",
                            "slug": "reconversion-analysis",
                            "requires_cv": True,
                            "requires_job_offer": False,
                            "difficulty": "advanced",
                            "duration_minutes": 15
                        },
                        {
                            "id": "career_transition",
                            "title": "Vers quel métier aller ?",
                            "coach_advice": "Identifiez des métiers compatibles avec vos compétences et vos envies.",
                            "slug": "career-transition",
                            "requires_cv": True,
                            "requires_job_offer": False,
                            "difficulty": "intermediate",
                            "duration_minutes": 12
                        }
                    ]
                }
            },
            "featured": None
        })
        
    except Exception as e:
        print(f"❌ Erreur endpoint services config: {e}")
        return jsonify({
            "success": False,
            "error": "Erreur lors de la récupération de la configuration des services"
        }), 500

def register_services_routes(app):
    """Enregistre les routes de services dans l'application Flask"""
    app.register_blueprint(services_bp) 
