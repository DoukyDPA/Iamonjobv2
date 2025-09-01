# routes/services.py
"""Routes pour les services IA"""

from flask import Blueprint, request, jsonify
from backend.routes.api.auth_api import verify_jwt_token
from backend.routes.generic_services import handle_generic_service

services_bp = Blueprint('services', __name__)

@services_bp.route('/api/actions/cover-letter_generate', methods=['POST'])
@verify_jwt_token
def action_cover_letter_generate():
    """Action rapide: Générer une lettre de motivation"""
    return handle_generic_service('cover_letter_generate', request)

@services_bp.route('/api/cover-letter/advice', methods=['POST'])
@verify_jwt_token
def cover_letter_advice():
    """Conseils pour lettre de motivation"""
    return handle_generic_service('cover_letter_advice', request)

@services_bp.route('/api/cover-letter/generate', methods=['POST'])
@verify_jwt_token
def cover_letter_generate():
    """Génération lettre de motivation (endpoint alternatif)"""
    return handle_generic_service('cover_letter_generate', request)

@services_bp.route('/api/interview/prepare', methods=['POST'])
@verify_jwt_token
def interview_prepare():
    """Préparation entretien"""
    return handle_generic_service('interview_prep', request)

@services_bp.route('/api/pitch/generate', methods=['POST'])
@verify_jwt_token
def pitch_generate():
    """Génération pitch professionnel"""
    return handle_generic_service('professional_pitch', request)

@services_bp.route('/api/presentation/generate', methods=['POST'])
@verify_jwt_token
def presentation_generate():
    """Génération slides présentation"""
    return handle_generic_service('presentation_slides', request)

@services_bp.route('/api/reconversion/analyze', methods=['POST'])
@verify_jwt_token
def reconversion_analyze():
    """Analyse reconversion"""
    return handle_generic_service('reconversion_analysis', request)

@services_bp.route('/api/career/orientation', methods=['POST'])
@verify_jwt_token
def career_orientation():
    """Orientation métier"""
    return handle_generic_service('career_transition', request)

@services_bp.route('/api/industry/orientation', methods=['POST'])
@verify_jwt_token
def industry_orientation():
    """Orientation industrie"""
    return handle_generic_service('industry_orientation', request)

@services_bp.route('/api/followup/generate', methods=['POST'])
@verify_jwt_token
def followup_generate():
    """Génération email de relance"""
    return handle_generic_service('follow_up_email', request)

@services_bp.route('/api/salary/prepare', methods=['POST'])
@verify_jwt_token
def salary_prepare():
    """Préparation négociation salaire"""
    return handle_generic_service('salary_negotiation', request)

@services_bp.route('/api/skills/analyze', methods=['POST'])
@verify_jwt_token
def skills_analyze():
    """Analyse des compétences"""
    return handle_generic_service('skills_analysis', request)

@services_bp.route('/api/actions/compatibility', methods=['POST'])
def matching_cv_offre_analysis():
    """Route pour l'analyse de compatibilité (utilise le système générique)"""
    try:
        data = request.get_json() or {}
        service_id = data.get('service_id', 'matching_cv_offre')
        print(f"🎯 Route compatibility appelée avec service_id: {service_id}")
        return handle_generic_service(service_id, request)
    except Exception as e:
        print(f"❌ Erreur route compatibility: {e}")
        return jsonify({
            "success": False,
            "error": f"Erreur lors de l'analyse de compatibilité: {str(e)}",
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
            "error": "Erreur lors de la récupération de la configuration des services",
        }), 500


def register_services_routes(app):
    """Enregistre les routes de services dans l'application Flask"""
    app.register_blueprint(services_bp)
    # Les routes IA sont gérées par generic_services.py
