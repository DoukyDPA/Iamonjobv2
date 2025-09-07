from flask import Blueprint, jsonify, request
from backend.admin.services_manager import services_manager
from backend.routes.api.auth_api import verify_jwt_token
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
    """Récupérer les services groupés par thème avec descriptions"""
    try:
        # Utiliser le même manager que l'admin pour récupérer les descriptions
        try:
            from backend.admin.supabase_services_manager import supabase_services_manager
            services_by_theme = supabase_services_manager.get_services_by_theme()
            
            return jsonify({
                "success": True,
                "themes": services_by_theme,
                "count": sum(len(services) for services in services_by_theme.values())
            }), 200
        except ImportError:
            # Fallback vers l'ancien manager
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
        # Utiliser le système générique existant
        from backend.routes.generic_services import handle_generic_service
        return handle_generic_service(service_id, request)
        
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
        
        # Récupérer l'email de l'utilisateur depuis le token JWT
        user_email = None
        try:
            auth_header = request.headers.get('Authorization')
            if auth_header and auth_header.startswith('Bearer '):
                token = auth_header.split(' ')[1]
                import jwt
                from config.app_config import JWT_SECRET_KEY
                payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=['HS256'])
                user_email = payload.get('email')
        except Exception as e:
            print(f"⚠️ Erreur récupération email utilisateur: {e}")

        # Récupérer le prompt pour ce service depuis Supabase
        from services.ai_service_prompts import get_prompt
        service_prompt = get_prompt('analyse_emploi')
        
        if not service_prompt:
            return jsonify({"error": "Service analyse_emploi non disponible"}, 500)

        # Appeler le service AI via le système unifié
        from services.ai_service_prompts import execute_ai_service
        
        # Récupérer les documents de l'utilisateur
        from services.stateless_manager import StatelessDataManager
        user_data = StatelessDataManager.get_user_data_by_email(user_email) if user_email else StatelessDataManager.get_user_data()
        documents = user_data.get('documents', {})
        
        print(f"🔍 Debug analyse_emploi:")
        print(f"   User email: {user_email}")
        print(f"   Documents disponibles: {list(documents.keys())}")
        print(f"   CV content length: {len(documents.get('cv', {}).get('content', ''))}")
        print(f"   Job content length: {len(documents.get('offre_emploi', {}).get('content', ''))}")
        
        cv_content = documents.get('cv', {}).get('content', '')
        job_content = documents.get('offre_emploi', {}).get('content', '')
        questionnaire_content = documents.get('questionnaire', {}).get('content', '')
        
        result = execute_ai_service(
            service_id='analyse_emploi',
            cv_content=cv_content,
            job_content=job_content,
            questionnaire_content=questionnaire_content,
            user_notes=data.get('notes', '')
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
        user_id = request.headers.get("Authorization", "").split(" ")[-1] if request.headers.get("Authorization") else None

        # Récupérer le prompt pour ce service depuis Supabase
        from services.ai_service_prompts import get_prompt
        service_prompt = get_prompt('follow_up_email')
        
        if not service_prompt:
            return jsonify({"error": "Service follow-up non disponible"}, 500)

        # Appeler le service AI via le système unifié
        from services.ai_service_prompts import execute_ai_service
        
        # Récupérer les documents de l'utilisateur
        from services.stateless_manager import StatelessDataManager
        user_data = StatelessDataManager.get_user_data_by_email(user_email) if user_email else StatelessDataManager.get_user_data()
        documents = user_data.get('documents', {})
        
        cv_content = documents.get('cv', {}).get('content', '')
        job_content = documents.get('offre_emploi', {}).get('content', '')
        questionnaire_content = documents.get('questionnaire', {}).get('content', '')
        
        result = execute_ai_service(
            service_id='follow_up_email',
            cv_content=cv_content,
            job_content=job_content,
            questionnaire_content=questionnaire_content,
            user_notes=data.get('notes', '')
        )
        return jsonify({
            "success": True,
            "result": result,
            "service": "Email de relance"
        })
    except Exception as e:
        logging.error("Erreur service follow-up: %s", e)
        return jsonify({"error": "Erreur lors du service follow-up"}, 500)

