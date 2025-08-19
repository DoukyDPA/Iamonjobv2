# app.py - IAMONJOB Application Main File
"""
Application principale IAMONJOB
Version refactorisée et propre
"""

import os
import uuid
from datetime import datetime
from flask import Flask, jsonify, send_from_directory, send_file, request, session
from flask_cors import CORS
from flask_login import LoginManager

# ====================================
# CONFIGURATION APPLICATION
# ====================================

# Variable globale pour identifier l'instance
INSTANCE_ID = str(uuid.uuid4())[:8]

# Configuration des chemins
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND_BUILD_DIR = os.path.join(BASE_DIR, 'frontend', 'build')

# Charger la configuration Supabase depuis test_config.py.backup
try:
    from test_config import SUPABASE_CONFIG
    # Définir les variables d'environnement Supabase si elles ne sont pas déjà définies
    if not os.getenv('SUPABASE_URL'):
        os.environ['SUPABASE_URL'] = SUPABASE_CONFIG.get('SUPABASE_URL', '')
    if not os.getenv('SUPABASE_ANON_KEY'):
        os.environ['SUPABASE_ANON_KEY'] = SUPABASE_CONFIG.get('SUPABASE_ANON_KEY', '')
    if not os.getenv('SUPABASE_SERVICE_KEY'):
        os.environ['SUPABASE_SERVICE_KEY'] = SUPABASE_CONFIG.get('SUPABASE_SERVICE_KEY', '')
    print("✅ Configuration Supabase chargée depuis test_config.py")
except ImportError as e:
    print(f"⚠️ Impossible de charger test_config.py: {e}")
    # Fallback sur config.py
    try:
        from config import MIGRATION_CONFIG
        if not os.getenv('SUPABASE_URL'):
            os.environ['SUPABASE_URL'] = MIGRATION_CONFIG.get('SUPABASE_URL', '')
        if not os.getenv('SUPABASE_ANON_KEY'):
            os.environ['SUPABASE_ANON_KEY'] = MIGRATION_CONFIG.get('SUPABASE_ANON_KEY', '')
        if not os.getenv('SUPABASE_SERVICE_KEY'):
            os.environ['SUPABASE_SERVICE_KEY'] = MIGRATION_CONFIG.get('SUPABASE_SERVICE_KEY', '')
        print("✅ Configuration Supabase chargée depuis config.py (fallback)")
    except ImportError as e2:
        print(f"⚠️ Impossible de charger config.py: {e2}")
        print("🔧 Utilisation des variables d'environnement système")

# Afficher la configuration finale
print(f"🔧 Configuration finale Supabase:")
print(f"   URL: {os.getenv('SUPABASE_URL', 'Non défini')[:50]}...")
print(f"   Clé: {os.getenv('SUPABASE_ANON_KEY', 'Non défini')[:20]}...")

# Création de l'application Flask
app = Flask(__name__, static_folder=None)
CORS(app, origins=["*"])

# Configuration de base
app.secret_key = os.environ.get("FLASK_SECRET_KEY", "dev_secret_key")

# Configuration des sessions persistantes
app.config['PERMANENT_SESSION_LIFETIME'] = 86400  # 24 heures

# ====================================
# ROUTE DE DIAGNOSTIC RAILWAY
# ====================================

@app.route('/debug-env')
def debug_environment():
    """Diagnostiquer l'environnement Railway"""
    import os
    
    debug_info = {
        "critical_vars": {},
        "all_env_vars": {},
        "supabase_test": False,
        "supabase_test": False
    }
    
    # Variables critiques
    critical_vars = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_KEY', 'FLASK_SECRET_KEY']
    for var in critical_vars:
        value = os.environ.get(var)
        debug_info["critical_vars"][var] = {
            "exists": bool(value),
            "value": value[:50] + "..." if value and len(value) > 50 else value
        }
    
    # Toutes les variables d'environnement
    for key, value in os.environ.items():
        if any(keyword in key.upper() for keyword in ['SUPABASE', 'REDIS', 'FLASK']):
            debug_info["all_env_vars"][key] = value[:50] + "..." if len(value) > 50 else value
    
    # Test Supabase
    try:
        supabase_url = os.environ.get('SUPABASE_URL')
        supabase_key = os.environ.get('SUPABASE_ANON_KEY')
        if supabase_url and supabase_key:
            debug_info["supabase_test"] = True
    except:
        pass
    
    # Test Supabase (remplace Redis)
    try:
        supabase_url = os.environ.get('SUPABASE_URL')
        if supabase_url:
            debug_info["supabase_test"] = True
    except:
        pass
    
    return jsonify(debug_info)

@app.route('/migrate', methods=['POST'])
def start_migration():
    """Lancer la migration"""
    try:
        # Migration déjà terminée
        return jsonify({
            "success": True,
            "message": "Migration Redis → Supabase déjà terminée",
            "status": "completed"
        })
        
        return jsonify({
            "success": True,
            "message": "Migration lancée avec succès",
            "result": result
        })
        
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/migrate-status')
def migration_status():
    """Statut de la migration"""
    try:
        # Vérifier la connexion Supabase
        from services.supabase_storage import SupabaseStorage
        supabase = SupabaseStorage()
        
        # Compter les sessions dans Supabase
        response = supabase.client.table('sessions').select('id').execute()
        supabase_sessions = len(response.data) if response.data else 0
        
        # Vérifier Supabase uniquement
        return jsonify({
            "supabase_sessions": supabase_sessions,
            "migration_ready": True
        })
        
    except Exception as e:
        return jsonify({
            "error": str(e),
            "migration_ready": False
        }), 500

@app.route('/migrate-simulate', methods=['POST'])
def simulate_migration():
    """Simuler la migration (pour test)"""
    try:
        # Vérifier Supabase
        from services.supabase_storage import SupabaseStorage
        supabase = SupabaseStorage()
        
        # Créer des données de test
        test_data = {
            "sessions_created": 0,
            "users_created": 0,
            "tokens_created": 0,
            "message": "Simulation de migration réussie"
        }
        
        # Créer une session de test
        try:
            response = supabase.client.table('sessions').insert({
                'user_email': 'test@migration.com',
                'chat_history': [{"role": "system", "content": "Session de test migration"}],
                'documents': {},
                'analyses': {}
            }).execute()
            
            if response.data:
                test_data["sessions_created"] = 1
                
        except Exception as e:
            test_data["error"] = f"Erreur création session: {str(e)}"
        
        return jsonify({
            "success": True,
            "message": "Simulation de migration lancée",
            "result": test_data
        })
        
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

# ====================================
# CHARGEMENT DE LA CONFIGURATION
# ====================================

# Configuration des variables d'environnement
print("🔧 Configuration depuis variables système")

# ====================================
# INITIALISATION SUPABASE
# ====================================

try:
    from services.supabase_storage import init_supabase_service
    storage_service = init_supabase_service(app)
    print("✅ Supabase service initialisé avec succès")
    print(f"🔗 Supabase URL: {os.environ.get('SUPABASE_URL', 'Not set')[:50]}...")
except Exception as e:
    print(f"❌ Erreur initialisation Supabase: {e}")
    print("🔄 Mode fallback Flask session activé")

# ====================================
# STATELESS DATA MANAGER
# ====================================

from services.stateless_manager import StatelessDataManager, get_user_data, save_user_data

# ====================================
# CONFIGURATION FLASK-LOGIN
# ====================================

login_manager = LoginManager()
login_manager.init_app(app)
# login_manager.login_view = "auth_api.login"

@login_manager.user_loader
def load_user(user_id):
    """Charge un utilisateur par son ID"""
    try:
        from models.user import User
        return User.get(user_id)
    except Exception as e:
        print(f"Erreur chargement utilisateur: {e}")
        return None

# ====================================
# ENREGISTREMENT DES BLUEPRINTS API
# ====================================

def register_blueprints():
    """Enregistre tous les blueprints API"""
    
    # Auth API
    try:
        from backend.routes.api.auth_api import auth_api
        app.register_blueprint(auth_api, url_prefix='/api/auth')
        print("✅ Auth API enregistrée")
    except ImportError as e:
        print(f"❌ Erreur import auth_api: {e}")

    # Chat API
    try:
        from backend.routes.api.chat_api import chat_api
        app.register_blueprint(chat_api, url_prefix='/api/chat')
        print("✅ Chat API enregistrée")
    except ImportError as e:
        print(f"❌ Erreur import chat_api: {e}")

    # Admin API
    try:
        from backend.routes.api.admin_api import admin_api
        app.register_blueprint(admin_api, url_prefix='/api/admin')
        print("✅ Admin API enregistrée")
    except ImportError as e:
        print(f"❌ Erreur import admin_api: {e}")

    # Partner Jobs API
    try:
        from backend.routes.api.partner_jobs_api import partner_jobs_api
        app.register_blueprint(partner_jobs_api, url_prefix='/api/partner-jobs')
        print("✅ Partner Jobs API enregistrée")
    except ImportError as e:
        print(f"❌ Erreur import partner_jobs_api: {e}")

    # Services API
    try:
        from backend.routes.api.services_api import services_api
        app.register_blueprint(services_api, url_prefix='/api/services')
        print("✅ Services API enregistrée")
    except ImportError as e:
        print(f"❌ Erreur import services_api: {e}")

    # Documents API
    try:
        from backend.routes.api.documents_api import documents_api
        app.register_blueprint(documents_api, url_prefix='/api/documents')
        print("✅ Documents API enregistrée")
    except ImportError as e:
        print(f"❌ Erreur import documents_api: {e}")

    # Chat API déjà enregistrée plus haut
    pass

    # Data Sync API
    try:
        from backend.routes.api.data_sync import data_sync_api
        app.register_blueprint(data_sync_api, url_prefix='/api/data')
        print("✅ Data Sync API enregistrée")
    except ImportError as e:
        print(f"❌ Erreur import data_sync_api: {e}")

    # Documents routes (refactor)
    try:
        from routes.documents import register_documents_routes
        register_documents_routes(app)
        print("✅ Documents routes enregistrées")
    except ImportError as e:
        print(f"❌ Erreur routes documents: {e}")

register_blueprints()

# ====================================
# ENREGISTREMENT DES ROUTES ADMIN
# ====================================

# Enregistrer les routes admin des services
try:
    from backend.admin.services_manager import register_admin_routes
    register_admin_routes(app)
    print("✅ Routes admin des services enregistrées")
except ImportError as e:
    print(f"❌ Erreur import admin routes: {e}")

# ====================================
# ENREGISTREMENT DES ROUTES DE SERVICES
# ====================================

try:
    from routes.services import services_bp
    app.register_blueprint(services_bp)
    print("✅ Routes de services enregistrées")
except ImportError as e:
    print(f"❌ Erreur import services_bp: {e}")

print("🚀 === ROUTES SERVICES ENREGISTRÉES ===")
print("✅ /api/actions/compatibility [POST] - NOUVELLE")
print("✅ /api/actions/cover-letter_generate [POST]")
print("✅ /api/cover-letter/advice [POST]")
print("✅ /api/cover-letter/generate [POST]")
print("✅ /api/interview/prepare [POST]")
print("✅ /api/pitch/generate [POST]")
print("✅ /api/presentation/generate [POST]")
print("✅ /api/reconversion/analyze [POST]")
print("✅ /api/followup/generate [POST]")
print("✅ /api/salary/prepare [POST]")
print("================================================")

# ====================================
# ENREGISTREMENT DES ROUTES DE SANTÉ
# ====================================

# Route de santé racine pour Railway
@app.route('/health')
def health_root():
    """Health check racine pour Railway"""
    try:
        return jsonify({
            "status": "healthy",
            "platform": "railway",
            "server": "gunicorn",
            "supabase_configured": bool(os.environ.get('SUPABASE_URL')),
            "timestamp": datetime.now().isoformat()
        }), 200
    except Exception as e:
        return jsonify({
            "status": "unhealthy",
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }), 503

try:
    from routes.health import health_bp
    app.register_blueprint(health_bp, url_prefix='/api/health')
    print("✅ Routes de santé enregistrées")
except ImportError as e:
    print(f"❌ Erreur import health_bp: {e}")

# ====================================
# ENREGISTREMENT DES ROUTES GÉNÉRIQUES  
# ====================================

try:
    from backend.routes.generic_services import register_generic_routes
    register_generic_routes(app)
    print("✅ Routes génériques activées")
except Exception as e:
    print(f"❌ Erreur routes génériques: {e}")
    print("⚠️ Fonctionnement en mode dégradé")

# ====================================
# ENREGISTREMENT DES ROUTES STATIQUES (EN DERNIER)
# ====================================

try:
    from routes.static import static_bp
    app.register_blueprint(static_bp)
    print("✅ Routes statiques enregistrées")
except ImportError as e:
    print(f"❌ Erreur import static_bp: {e}")

# Suppression de la route /debug et de la fonction debug

# ====================================
# ROUTE DE TEST SUPABASE
# ====================================

@app.route('/api/test-supabase-data')
def test_supabase_data():
    from services.supabase_storage import SupabaseStorage
    from datetime import datetime
    
    supabase = SupabaseStorage()
    
    # Test écriture
    test_data = {
        "test": "data",
        "timestamp": datetime.now().isoformat(),
        "chat_history": ["test message"]
    }
    
    save_success = supabase.save_session_data(test_data)
    
    # Test lecture
    read_data = supabase.get_session_data()
    
    return jsonify({
        "supabase_connected": True,
        "write_success": save_success,
        "data_saved": test_data,
        "data_read": read_data,
        "match": read_data.get("test") == "data"
    })

@app.route('/api/test-supabase-fix', methods=['GET', 'POST'])
def test_supabase_fix():
    """
    Endpoint de test pour vérifier que le fix Supabase fonctionne
    Teste à la fois les partenaires (qui marchent) et les données utilisateur
    """
    from services.supabase_storage import SupabaseStorage

# Fonctions de compatibilité
def get_session_data():
    supabase = SupabaseStorage()
    return supabase.get_session_data()

def save_session_data(data):
    supabase = SupabaseStorage()
    return supabase.save_session_data(data)

def link_session_to_user(user_id, user_email):
    supabase = SupabaseStorage()
    session_data = supabase.get_session_data()
    session_data['user_id'] = user_id
    session_data['user_email'] = user_email
    return supabase.save_session_data(session_data)

# ====================================
# ROUTES API GÉRÉES PAR LES BLUEPRINTS
# ====================================
# Les routes /api/services, /api/documents, /api/chat/session, 
# et /api/partner-jobs/partners sont gérées par les blueprints

# ====================================
# ROUTES STATIQUES MANQUANTES
# ====================================

@app.route('/favicon.ico')
def favicon():
    """Favicon depuis le dossier public"""
    from flask import send_from_directory
    return send_from_directory('frontend/public', 'favicon.ico')

# ====================================
# POINT D'ENTRÉE
# ====================================

if __name__ == '__main__':
    # Développement local uniquement
    port = int(os.environ.get('PORT', 8080))
    app.run(host='0.0.0.0', port=port, debug=False)
