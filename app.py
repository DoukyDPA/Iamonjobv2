#!/usr/bin/env python3
"""
Application Flask principale pour IAMONJOB
"""

from flask import Flask, jsonify
from flask_cors import CORS
import os
import logging

# Configuration du logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def create_app():
    """Crée et configure l'application Flask"""
    app = Flask(__name__)
    
    # Configuration CORS
    CORS(app, origins=['*'], supports_credentials=True)
    
    # Configuration de base
    app.config['SECRET_KEY'] = os.environ.get('FLASK_SECRET_KEY', 'dev_secret_key')
    app.config['DEBUG'] = os.environ.get('FLASK_DEBUG', 'True').lower() == 'true'
    
    # Enregistrer les blueprints des API
    from routes.api.auth_api import auth_api
    from routes.api.admin_api import admin_api
    from routes.api.partner_jobs_api import partner_jobs_api
    from routes.api.chat_api import chat_api
    from routes.api.data_sync import data_sync_api
    from routes.api.documents_api import documents_api
    from routes.api.services_api import services_api
    
    app.register_blueprint(auth_api, url_prefix='/api/auth')
    app.register_blueprint(admin_api, url_prefix='/api/admin')
    app.register_blueprint(partner_jobs_api, url_prefix='/api/partners')
    app.register_blueprint(chat_api, url_prefix='/api/chat')
    app.register_blueprint(data_sync_api, url_prefix='/api/data-sync')
    app.register_blueprint(documents_api, url_prefix='/api/documents')
    app.register_blueprint(services_api, url_prefix='/api/services')
    
    # Route de test
    @app.route('/')
    def home():
        return jsonify({
            "message": "IAMONJOB API Backend",
            "status": "running",
            "version": "1.0.0"
        })
    
    # Route de santé
    @app.route('/health')
    def health():
        return jsonify({
            "status": "healthy",
            "timestamp": "2024-01-01T00:00:00Z"
        })
    
    # Gestionnaire d'erreurs 404
    @app.errorhandler(404)
    def not_found(error):
        return jsonify({
            "error": "Endpoint non trouvé",
            "message": "L'endpoint demandé n'existe pas"
        }), 404
    
    # Gestionnaire d'erreurs 500
    @app.errorhandler(500)
    def internal_error(error):
        return jsonify({
            "error": "Erreur interne du serveur",
            "message": "Une erreur s'est produite côté serveur"
        }), 500
    
    logger.info("✅ Application Flask créée avec succès")
    return app

if __name__ == '__main__':
    app = create_app()
    port = int(os.environ.get('PORT', 5000))
    logger.info(f"🚀 Démarrage du serveur sur le port {port}")
    app.run(host='0.0.0.0', port=port, debug=app.config['DEBUG'])
