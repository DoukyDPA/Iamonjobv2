from flask import Blueprint, jsonify, request
from backend.admin.services_manager import services_manager
from backend.routes.api.auth_api import verify_jwt_token, get_jwt_identity
import logging

services_api = Blueprint('services_api', __name__)

@services_api.route('/config', methods=['GET'])
def get_services_config():
    """Récupérer la configuration complète des services pour le frontend"""
    try:
        # Récupérer tous les services depuis Supabase
        all_services = services_manager.get_all_services()
        
        return jsonify({
            "success": True,
            "services": all_services,
            "count": len(all_services)
        }), 200
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e),
            "services": [],
            "count": 0
        }), 500

@services_api.route('/', methods=['GET'])
def get_services():
    """Récupérer tous les services disponibles"""
    try:
        # Récupérer tous les services depuis Supabase
        all_services = services_manager.get_all_services()
        
        return jsonify({
            "success": True,
            "services": all_services,
            "count": len(all_services)
        }), 200
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e),
            "services": {},
            "count": 0
        }), 500

@services_api.route('/visible', methods=['GET'])
def get_visible_services():
    """Récupérer uniquement les services visibles"""
    try:
        # Récupérer les services visibles depuis Supabase
        visible_services = services_manager.get_visible_services()
        
        return jsonify({
            "success": True,
            "services": visible_services,
            "count": len(visible_services)
        }), 200
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e),
            "services": {},
            "count": 0
        }), 500

@services_api.route('/by-theme', methods=['GET'])
def get_services_by_theme():
    """Récupérer les services groupés par thème"""
    try:
        # Récupérer les services groupés par thème depuis Supabase
        services_by_theme = services_manager.get_services_by_theme()
        
        return jsonify({
            "success": True,
            "themes": services_by_theme,
            "count": sum(len(services) for services in services_by_theme.values())
        }), 200
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e),
            "themes": {},
            "count": 0
        }), 500

@services_api.route('/<service_id>', methods=['GET'])
def get_service(service_id):
    """Récupérer un service spécifique"""
    try:
        # Récupérer un service spécifique depuis Supabase
        service = services_manager.get_service(service_id)
        
        if service:
            return jsonify({
                "success": True,
                "service": service
            }), 200
        else:
            return jsonify({
                "success": False,
                "error": "Service non trouvé"
            }), 404
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@services_api.route('/execute/<service_id>', methods=['POST'])
@verify_jwt_token
def execute_service(service_id):
    """Endpoint générique pour exécuter n'importe quel service"""
    try:
        data = request.get_json()
        user_id = get_jwt_identity()

        # Récupérer le prompt pour ce service
        from backend.admin.ai_prompts_manager import get_all_ai_prompts
        prompts = get_all_ai_prompts()
        
        # Chercher le prompt par service_id ou par titre
        service_prompt = None
        for prompt in prompts.values():
            if prompt.get('service_id') == service_id or prompt.get('title', '').lower() in service_id.lower():
                service_prompt = prompt
                break
        
        if not service_prompt:
            return jsonify({"error": f"Service {service_id} non disponible"}, 500)

        # Appeler le service AI
        from backend.services.ai_service import ai_service
        result = ai_service.process_service_request(
            service_id=service_id,
            user_id=user_id,
            prompt_template=service_prompt.get('prompt', ''),
            input_data=data
        )
        return jsonify({
            "success": True,
            "result": result,
            "service": service_prompt.get('title', service_id)
        })
    except Exception as e:
        logging.error(f"Erreur service {service_id}: %s", e)
        return jsonify({"error": f"Erreur lors du service {service_id}"}, 500)

# Route spécifique pour analyse_emploi (compatibilité)
@services_api.route('/analyse_emploi', methods=['POST'])
@verify_jwt_token
def analyse_emploi():
    """Service: Analyse d'offre d'emploi (route spécifique pour compatibilité)"""
    try:
        data = request.get_json()
        user_id = get_jwt_identity()

        # Récupérer le prompt pour ce service
        from backend.admin.ai_prompts_manager import get_all_ai_prompts
        prompts = get_all_ai_prompts()
        
        # Chercher le prompt analyse_emploi
        service_prompt = None
        for prompt in prompts.values():
            if 'analyse' in prompt.get('title', '').lower() and 'offre' in prompt.get('title', '').lower():
                service_prompt = prompt
                break
        
        if not service_prompt:
            return jsonify({"error": "Service analyse_emploi non disponible"}, 500)

        # Appeler le service AI
        from backend.services.ai_service import ai_service
        result = ai_service.process_service_request(
            service_id='analyse_emploi',
            user_id=user_id,
            prompt_template=service_prompt.get('prompt', ''),
            input_data=data
        )
        return jsonify({
            "success": True,
            "result": result,
            "service": "Analyse d'offre d'emploi"
        })
    except Exception as e:
        logging.error("Erreur service analyse_emploi: %s", e)
        return jsonify({"error": "Erreur lors du service analyse_emploi"}, 500)

# Route spécifique pour follow-up (compatibilité)
@services_api.route('/follow-up/generate', methods=['POST'])
@verify_jwt_token
def follow_up_email():
    """Service: Email de relance (route spécifique pour compatibilité)"""
    try:
        data = request.get_json()
        user_id = get_jwt_identity()

        # Récupérer le prompt pour ce service
        from backend.admin.ai_prompts_manager import get_all_ai_prompts
        prompts = get_all_ai_prompts()
        
        # Chercher le prompt follow_up_email
        service_prompt = None
        for prompt in prompts.values():
            if 'follow' in prompt.get('title', '').lower() or 'relance' in prompt.get('title', '').lower():
                service_prompt = prompt
                break
        
        if not service_prompt:
            return jsonify({"error": "Service follow-up non disponible"}, 500)

        # Appeler le service AI
        from backend.services.ai_service import ai_service
        result = ai_service.process_service_request(
            service_id='follow_up_email',
            user_id=user_id,
            prompt_template=service_prompt.get('prompt', ''),
            input_data=data
        )
        return jsonify({
            "success": True,
            "result": result,
            "service": "Email de relance"
        })
    except Exception as e:
        logging.error("Erreur service follow-up: %s", e)
        return jsonify({"error": "Erreur lors du service follow-up"}, 500)
