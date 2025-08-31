from flask import Blueprint, jsonify
from backend.admin.services_manager import services_manager

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
