# app.py - Version Sécurisée et Optimisée
import os
import uuid
import logging
from datetime import datetime
from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS
from flask_login import LoginManager
from backend.routes.api.gdpr_api import register_gdpr_routes

# 1. CONFIGURATION LOGGING (Essentiel pour debug en prod)
logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')
logger = logging.getLogger(__name__)

# 2. INIT FLASK & SÉCURITÉ
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
app = Flask(__name__, static_folder='frontend/build')

# CORS : En production, essayez de restreindre les origines si possible
# ex: origins=["https://mon-app.railway.app"]
CORS(app, origins=["*"]) 

app.secret_key = os.environ.get("FLASK_SECRET_KEY", "dev_secret_key_safe_fallback")
app.config['PERMANENT_SESSION_LIFETIME'] = 86400

# 3. INIT SUPABASE (Via le nouveau service sécurisé)
try:
    from services.supabase_storage import init_supabase_service
    storage_service = init_supabase_service(app)
except Exception as e:
    logger.error(f"❌ Erreur init Supabase: {e}")

# 4. INIT AUTH
login_manager = LoginManager()
login_manager.init_app(app)

@login_manager.user_loader
def load_user(user_id):
    try:
        from models.user import User
        return User.get(user_id)
    except Exception:
        return None

# 5. ENREGISTREMENT DES BLUEPRINTS (Préservation Totale)
def register_all_routes():
    try:
        # API Routes
        from backend.routes.api.auth_api import auth_api
        from backend.routes.api.chat_api import chat_api
        from backend.routes.api.admin_api import admin_api
        from backend.routes.api.partner_jobs_api import partner_jobs_api
        from backend.routes.api.services_api import services_api
        from backend.routes.api.documents_api import documents_api
        from backend.routes.api.data_sync import data_sync_api
        
        # Legacy Routes
        from backend.routes.auth import auth_bp
        from backend.routes.generic_services import generic_services_bp
        from routes.services import services_bp
        from routes.static import static_bp
        from routes.health import health_bp

        # Enregistrements avec gestion d'erreur individuelle
        blueprints = [
            (auth_api, '/api/auth'),
            (auth_bp, '/api/auth'), # Attention doublon préfixe, gardé pour compatibilité
            (chat_api, '/api/chat'),
            (admin_api, '/api/admin'),
            (partner_jobs_api, '/api/partner-jobs'),
            (services_api, '/api/services'),
            (documents_api, '/api/documents'),
            (data_sync_api, '/api/data'),
            (health_bp, '/api/health'),
            (services_bp, None),
            (generic_services_bp, None),
            (static_bp, None)
        ]

        for bp, prefix in blueprints:
            try:
                app.register_blueprint(bp, url_prefix=prefix)
                logger.info(f"✅ Route chargée: {bp.name}")
            except Exception as e:
                logger.warning(f"⚠️ Erreur chargement {getattr(bp, 'name', 'bp')}: {e}")

        # Routes spéciales (fonctions)
        try:
            from routes.documents import register_documents_routes
            register_documents_routes(app)
            register_gdpr_routes(app)
            logger.info("✅ Routes spéciales chargées")
        except Exception as e:
            logger.error(f"❌ Erreur routes spéciales: {e}")

    except Exception as global_e:
        logger.critical(f"❌ Erreur critique chargement routes: {global_e}")

register_all_routes()

# 6. ROUTE PRINCIPALE (SPA React)
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    if path != "" and os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    return send_from_directory(app.static_folder, 'index.html')

if __name__ == '__main__':
    # Chargement Prompts
    try:
        from services.ai_service_prompts import reload_prompts_from_file
        reload_prompts_from_file()
    except: pass

    port = int(os.environ.get('PORT', 8080))
    app.run(host='0.0.0.0', port=port)
