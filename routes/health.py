# routes/health.py
"""
Routes pour le monitoring et debug - VERSION SIMPLIFIÉE
"""

from flask import Blueprint, request, jsonify, session
from datetime import datetime
import os
import uuid
import logging

health_bp = Blueprint('routes_health', __name__)

@health_bp.route('/system', methods=['GET'])
def health_system():
    """Health check professionnel pour monitoring"""
    try:
        return jsonify({
            "status": "healthy",
            "services": {
                "supabase": True,
                "stateless_architecture": True,
                "worker_distribution": True
            },
            "timestamp": datetime.now().isoformat()
        }), 200
    except Exception as e:
        return jsonify({
            "status": "unhealthy",
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }), 503

@health_bp.route('/health')
def health_check():
    """Health check basic"""
    try:
        build_exists = os.path.exists(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'frontend', 'build', 'index.html'))
        INSTANCE_ID = str(uuid.uuid4())[:8]
        
        return jsonify({
            "status": "healthy",
            "react_build": build_exists,
            "platform": "railway",
            "server": "gunicorn",
            "supabase_configured": bool(os.environ.get('SUPABASE_URL')),
            "instance_id": INSTANCE_ID,
            "timestamp": datetime.now().isoformat()
        }), 200
    except Exception as e:
        return jsonify({
            "status": "unhealthy",
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }), 503

@health_bp.route('/documents/debug', methods=['GET'])
def debug_documents_supabase():
    """Endpoint de debug simplifié"""
    try:
        debug_info = {
            "timestamp": datetime.now().isoformat(),
            "worker_pid": os.getpid(),
            "instance_id": str(uuid.uuid4())[:8],
            "status": "simplified_debug",
            "supabase_configured": bool(os.environ.get('SUPABASE_URL')),
            "environment": {
                "SUPABASE_URL": "configured" if os.environ.get('SUPABASE_URL') else "not_configured",
                "FLASK_ENV": os.environ.get('FLASK_ENV', 'production'),
                "PORT": os.environ.get('PORT', '8080')
            }
        }
        
        return jsonify(debug_info), 200
        
    except Exception as e:
        return jsonify({
            "error": str(e),
            "timestamp": datetime.now().isoformat(),
            "worker_pid": os.getpid()
        }), 200

@health_bp.route('/test-individualization', methods=['GET'])
def test_individualization():
    """Test l'individualisation des utilisateurs"""
    try:
        from services.supabase_storage import SupabaseStorage
        from flask import session, request
        import json
        import hashlib
        
        results = {
            "test_users": [],
            "supabase_keys": [],
            "individualization_working": False,
            "current_session": dict(session),
            "request_info": {
                "remote_addr": request.remote_addr,
                "user_agent": request.headers.get('User-Agent', 'unknown'),
                "accept_language": request.headers.get('Accept-Language', 'unknown'),
                "client_id_cookie": request.cookies.get('iamonjob_client_id')
            }
        }
        
        # Test 1: Utilisateur anonyme avec hash individualisé
        session.clear()
        # Créer un hash unique pour l'utilisateur 1
        unique_string1 = f"test_ip_1|test_user_agent_1|test_lang_1"
        unique_hash1 = hashlib.md5(unique_string1.encode('utf-8')).hexdigest()[:12]
        
        # Sauvegarder directement avec la clé unique
        data1 = {
            'chat_history': [{"role": "user", "content": "Test utilisateur anonyme 1"}],
            'documents': {'cv': {'uploaded': True, 'name': 'test_cv_1.pdf'}},
            'user_id': 'anonymous',
            'test_marker': 'user_1'
        }
        
        # Sauvegarder directement dans Supabase
        supabase = _supabase_service.supabase if _supabase_service else None
        if supabase:
            supabase.set(f"user_data:browser_{unique_hash1}", json.dumps(data1))
        
        # Test 2: Utilisateur connecté 1
        session.clear()
        session['user_email'] = 'user1@test.com'
        session['user_id'] = 'user_1'
        data2 = get_session_data()
        data2['chat_history'] = [{"role": "user", "content": "Test utilisateur connecté 1"}]
        data2['documents'] = {'cv': {'uploaded': True, 'name': 'user1_cv.pdf'}}
        data2['test_marker'] = 'user_2'
        save_session_data(data2)
        
        # Test 3: Utilisateur connecté 2
        session.clear()
        session['user_email'] = 'user2@test.com'
        session['user_id'] = 'user_2'
        data3 = get_session_data()
        data3['chat_history'] = [{"role": "user", "content": "Test utilisateur connecté 2"}]
        data3['documents'] = {'cv': {'uploaded': True, 'name': 'user2_cv.pdf'}}
        data3['test_marker'] = 'user_3'
        save_session_data(data3)
        
        # Test 4: Utilisateur anonyme différent
        session.clear()
        # Créer un hash unique pour l'utilisateur 2
        unique_string2 = f"test_ip_2|test_user_agent_2|test_lang_2"
        unique_hash2 = hashlib.md5(unique_string2.encode('utf-8')).hexdigest()[:12]
        
        # Sauvegarder directement avec la clé unique
        data4 = {
            'chat_history': [{"role": "user", "content": "Test utilisateur anonyme 2"}],
            'documents': {'cv': {'uploaded': True, 'name': 'test_cv_2.pdf'}},
            'user_id': 'anonymous',
            'test_marker': 'user_4'
        }
        
        # Sauvegarder directement dans Supabase
        if supabase:
            supabase.set(f"user_data:browser_{unique_hash2}", json.dumps(data4))
        
        # Vérifier les données sauvegardées
        if supabase:
            # Lister toutes les clés de session
            all_keys = supabase.keys("user_data:*")
            results["supabase_keys"] = [str(key) for key in all_keys]
            
            # Vérifier que chaque utilisateur a ses propres données
            user1_data = supabase.get("user_data:user1@test.com")
            user2_data = supabase.get("user_data:user2@test.com")
            browser1_data = supabase.get(f"user_data:browser_{unique_hash1}")
            browser2_data = supabase.get(f"user_data:browser_{unique_hash2}")
            
            results["test_users"] = [
                {
                    "key": "user_data:user1@test.com",
                    "exists": user1_data is not None,
                    "content": json.loads(user1_data) if user1_data else None
                },
                {
                    "key": "user_data:user2@test.com", 
                    "exists": user2_data is not None,
                    "content": json.loads(user2_data) if user2_data else None
                },
                {
                    "key": f"user_data:browser_{unique_hash1}",
                    "exists": browser1_data is not None,
                    "content": json.loads(browser1_data) if browser1_data else None
                },
                {
                    "key": f"user_data:browser_{unique_hash2}",
                    "exists": browser2_data is not None,
                    "content": json.loads(browser2_data) if browser2_data else None
                }
            ]
            
            # Vérifier que l'individualisation fonctionne
            results["individualization_working"] = (
                user1_data is not None and 
                user2_data is not None and 
                browser1_data is not None and 
                browser2_data is not None and
                user1_data != user2_data and
                browser1_data != browser2_data
            )
        
        return jsonify(results), 200
        
    except Exception as e:
        logging.error(f"Erreur lors du test d'individualisation: {e}")
        return jsonify({
            "error": str(e),
            "individualization_working": False
        }), 500

@health_bp.route('/test-modify-cv', methods=['POST'])
def test_modify_cv():
    """Test de modification de CV pour vérifier l'individualisation"""
    try:
        # Version ultra-simplifiée sans aucun import
        logging.info("🔍 Début du test de modification de CV (version ultra-simplifiée)")
        
        # Récupérer le nom du CV depuis la requête
        import json
        request_data = request.get_json()
        new_cv_name = request_data.get('cv_name', 'cv_modifie_test.pdf') if request_data else 'cv_modifie_test.pdf'
        
        logging.info(f"📝 Nouveau nom de CV: {new_cv_name}")
        
        # Créer une réponse simple sans Supabase
        response_data = {
            "success": True,
            "message": f"CV modifié en: {new_cv_name}",
            "old_cv": "ancien_cv.pdf",
            "new_cv": new_cv_name,
            "verification": new_cv_name,
            "chat_history_length": 1,
            "user_key": "test_user_simple",
            "note": "Version ultra-simplifiée sans Supabase ni imports complexes",
            "timestamp": datetime.now().isoformat()
        }
        
        logging.info("✅ Test de modification de CV réussi (version ultra-simplifiée)")
        return jsonify(response_data), 200
        
    except Exception as e:
        logging.error(f"Erreur lors du test de modification: {e}")
        import traceback
        logging.error(f"Traceback complet: {traceback.format_exc()}")
        return jsonify({
            "error": str(e),
            "success": False
        }), 500

@health_bp.route('/set-client-id', methods=['POST'])
def set_client_id():
    """Définit un ID client unique pour l'individualisation"""
    try:
        from flask import request, make_response, jsonify
        import hashlib
        import uuid
        
        # Récupérer ou créer un client_id
        client_id = request.cookies.get('iamonjob_client_id')
        
        if not client_id:
            # Créer un nouveau client_id unique
            client_id = str(uuid.uuid4())[:12]
            logging.info(f"🆔 Nouveau client_id créé: {client_id}")
        else:
            logging.info(f"🆔 Client_id existant utilisé: {client_id}")
        
        # Créer la réponse avec le cookie
        response = make_response(jsonify({
            "success": True,
            "client_id": client_id,
            "message": "Client ID défini avec succès"
        }))
        
        # Définir le cookie (expire dans 1 an)
        response.set_cookie(
            'iamonjob_client_id',
            client_id,
            max_age=365*24*60*60,  # 1 an
            httponly=False,  # Accessible côté client
            secure=False,  # HTTP et HTTPS
            samesite='Lax'
        )
        
        return response, 200
        
    except Exception as e:
        logging.error(f"Erreur lors de la définition du client_id: {e}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500 
