from flask import Blueprint, jsonify

services_api = Blueprint('services_api', __name__)

@services_api.route('/', methods=['GET'])
def get_services():
    """Récupérer les services disponibles"""
    services = [
        {
            "id": "cover-letter",
            "name": "Génération de lettre de motivation",
            "description": "Créez des lettres de motivation personnalisées",
            "enabled": True
        },
        {
            "id": "cv-analysis",
            "name": "Analyse de CV",
            "description": "Analysez et améliorez votre CV",
            "enabled": True
        },
        {
            "id": "interview-prep",
            "name": "Préparation d'entretien",
            "description": "Préparez-vous pour vos entretiens",
            "enabled": True
        }
    ]
    
    return jsonify({
        "success": True,
        "services": services,
        "count": len(services)
    }), 200
