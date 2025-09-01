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
        # Fallback avec configuration locale - SUPPRIMÉE
        # La configuration est maintenant centralisée dans frontend/src/services/servicesConfig.js
        return jsonify({
            "success": False,
            "error": "Configuration des services non disponible. Veuillez recharger la page."
        }), 500
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
