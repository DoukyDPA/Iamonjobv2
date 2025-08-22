#!/usr/bin/env python3
"""
API d'authentification avec gestion des sessions Supabase
"""

import jwt
import datetime
import os
import logging
from functools import wraps
from flask import Blueprint, request, jsonify, session
from flask_login import login_user, logout_user, current_user, login_required
from werkzeug.security import check_password_hash, generate_password_hash
from models.user import User

# Configuration du logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Création du blueprint
auth_api = Blueprint('auth_api', __name__)

# Fonctions de compatibilité
def link_session_to_user(user_id, user_email):
    from services.supabase_storage import SupabaseStorage
    supabase = SupabaseStorage()
    session_data = supabase.get_session_data()
    session_data['user_id'] = user_id
    session_data['user_email'] = user_email
    return supabase.save_session_data(session_data)

def get_session_data():
    from services.supabase_storage import SupabaseStorage
    supabase = SupabaseStorage()
    return supabase.get_session_data()

def save_session_data(data):
    from services.supabase_storage import SupabaseStorage
    supabase = SupabaseStorage()
    return supabase.save_session_data(data)

# Configuration JWT
def generate_token(user_id):
    """Génère un token JWT pour l'utilisateur"""
    payload = {
        'user_id': str(user_id),
        'exp': datetime.datetime.utcnow() + datetime.timedelta(days=1),
        'iat': datetime.datetime.utcnow()
    }
    secret_key = os.environ.get('FLASK_SECRET_KEY') or 'dev_secret_key'
    return jwt.encode(payload, secret_key, algorithm='HS256')

def verify_jwt_token(f):
    """Décorateur pour vérifier les tokens JWT au lieu de Flask-Login"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            print("=== DEBUG JWT TOKEN START ===")
            
            # Récupérer le token depuis les headers
            auth_header = request.headers.get('Authorization')
            print(f"1. Auth header: {auth_header}")
            if not auth_header:
                print("2. Pas d'auth header")
                return jsonify({"error": "Token d'authentification manquant"}), 401
            
            # Extraire le token (format: "Bearer <token>")
            if auth_header.startswith('Bearer '):
                token = auth_header[7:]
            else:
                token = auth_header
            
            print(f"3. Token extrait: {token[:50]}...")
            if not token:
                print("4. Token vide")
                return jsonify({"error": "Token invalide"}), 401
            
            # Vérifier le token
            secret_key = os.environ.get('FLASK_SECRET_KEY') or 'dev_secret_key'
            print(f"5. Secret key: {secret_key}")
            payload = jwt.decode(token, secret_key, algorithms=['HS256'])
            print(f"6. Payload décodé: {payload}")
            
            # Extraire l'ID utilisateur
            user_id = payload.get('user_id')
            print(f"7. User ID extrait: {user_id}")
            if not user_id:
                print("8. Pas d'user_id dans le payload")
                return jsonify({"error": "Token invalide - ID utilisateur manquant"}), 401
            
            # Récupérer l'utilisateur depuis la base
            print(f"9. Appel User.get({user_id})")
            user = User.get(user_id)
            print(f"10. User récupéré: {user}")
            if not user:
                print("11. User non trouvé")
                return jsonify({"error": "Utilisateur non trouvé"}), 401
            
            # Ajouter l'utilisateur à la requête pour compatibilité
            request.current_user = user
            print("12. SUCCESS - Token valide")
            
            return f(*args, **kwargs)
            
        except jwt.ExpiredSignatureError as e:
            print(f"ERROR: Token expiré: {e}")
            return jsonify({"error": "Token expiré"}), 401
        except jwt.InvalidTokenError as e:
            print(f"ERROR: Token invalide: {e}")
            return jsonify({"error": "Token invalide"}), 401
        except Exception as e:
            print(f"ERROR: Exception générale: {e}")
            import traceback
            traceback.print_exc()
            logging.error(f"Erreur lors de la vérification du token: {e}")
            return jsonify({"error": "Erreur d'authentification"}), 500
        finally:
            print("=== DEBUG JWT TOKEN END ===")
    
    return decorated_function

@auth_api.route('/register', methods=['GET'])
def register_form():
    """Affiche le formulaire d'inscription"""
    return '''
    <!DOCTYPE html>
    <html lang="fr">
    <head>
        <meta charset="UTF-8">
        <title>Inscription - IAMONJOB</title>
        <style>
            body { font-family: Arial; background: linear-gradient(135deg, #0a6b79, #27a2b4); color: white; padding: 20px; }
            .container { max-width: 400px; margin: 50px auto; background: rgba(255,255,255,0.1); padding: 30px; border-radius: 15px; }
            input { width: 100%; padding: 12px; margin: 10px 0; border: none; border-radius: 8px; box-sizing: border-box; }
            button { width: 100%; padding: 12px; background: #0a6b79; color: white; border: none; border-radius: 8px; cursor: pointer; }
            button:hover { background: #085a66; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🚀 Inscription IAMONJOB</h1>
            <form method="POST" action="/api/auth/register">
                <input type="email" name="email" placeholder="Email" required>
                <input type="password" name="password" placeholder="Mot de passe" required>
                <input type="password" name="confirm_password" placeholder="Confirmer le mot de passe" required>
                <div style="margin: 15px 0;">
                    <label>
                        <input type="checkbox" name="data_consent" required>
                        J'accepte le traitement de mes données
                    </label>
                </div>
                <button type="submit">S'inscrire</button>
            </form>
            <div style="margin-top: 20px; text-align: center;">
                <a href="/" style="color: white;">← Retour à l'accueil</a>
            </div>
        </div>
    </body>
    </html>
    '''

@auth_api.route('/register', methods=['POST'])
def register():
    """Inscription d'un nouvel utilisateur"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({"error": "Données manquantes"}), 400
            
        email = data.get('email')
        password = data.get('password')
        confirm_password = data.get('confirm_password')
        data_consent = data.get('data_consent', False)
        force_register = data.get('force_register', False)  # Option temporaire
        
        if not email or not password or not confirm_password:
            return jsonify({"error": "Tous les champs sont requis"}), 400

        if password != confirm_password:
            return jsonify({"error": "Les mots de passe ne correspondent pas"}), 400
            
        if not data_consent:
            return jsonify({"error": "Vous devez accepter les conditions de traitement des données"}), 400

        # Vérifier si l'email existe déjà avant de tenter la création
        print(f"🔍 DEBUG: Vérification email existant: {email}")
        existing_user = User.get_by_email(email)
        print(f"🔍 DEBUG: Résultat get_by_email: {existing_user}")
        
        if existing_user and not force_register:
            print(f"❌ DEBUG: Email déjà utilisé - ID: {existing_user.id}, Email: {existing_user.email}")
            # Vérifier directement dans la base pour confirmation
            from services.supabase_storage import SupabaseStorage
            supabase = SupabaseStorage()
            try:
                direct_check = supabase.client.table('users').select('*').eq('email', email).execute()
                print(f"🔍 DEBUG: Vérification directe Supabase: {direct_check.data}")
            except Exception as e:
                print(f"⚠️ DEBUG: Erreur vérification directe: {e}")
            
            return jsonify({
                "error": "Cette adresse email est déjà utilisée",
                "details": f"Un compte existe déjà avec cette adresse email (ID: {existing_user.id}). Veuillez vous connecter ou utiliser une autre adresse.",
                "force_register_available": True
            }), 409

        # Si force_register est activé, supprimer l'utilisateur existant
        if existing_user and force_register:
            print(f"⚠️ DEBUG: Force register activé, suppression de l'utilisateur existant: {existing_user.id}")
            try:
                from services.supabase_storage import SupabaseStorage
                supabase = SupabaseStorage()
                
                # Supprimer l'utilisateur existant
                delete_response = supabase.client.table('users').delete().eq('id', existing_user.id).execute()
                print(f"🔧 DEBUG: Suppression utilisateur existant: {delete_response.data}")
                
                # Supprimer les sessions associées
                session_delete = supabase.client.table('sessions').delete().eq('user_email', email).execute()
                print(f"🔧 DEBUG: Suppression sessions: {session_delete.data}")
                
            except Exception as e:
                print(f"❌ DEBUG: Erreur lors de la suppression: {e}")

        # Créer l'utilisateur avec debug
        print(f"✅ DEBUG: Email disponible, création de l'utilisateur: {email}")
        user = User.create(email, password)
        print(f"✅ DEBUG: Utilisateur créé: {user}, type={type(user)}")
        
        if user:
            # Créer une session persistante dans Supabase
            user_id = str(user.id)
            
            # Créer une session dans la table sessions (sans user_id, seulement user_email)
            from services.supabase_storage import SupabaseStorage
            supabase = SupabaseStorage()
            
            session_data = {
                'user_email': email,
                'chat_history': [],
                'documents': {},
                'analyses': {},
                'created_at': datetime.datetime.utcnow().isoformat(),
                'updated_at': datetime.datetime.utcnow().isoformat()
            }
            
            try:
                response = supabase.client.table('sessions').insert(session_data).execute()
                if response.data:
                    logging.info(f"✅ Session créée dans Supabase pour l'utilisateur: {email}")
                else:
                    logging.warning(f"⚠️ Impossible de créer la session Supabase pour: {email}")
            except Exception as e:
                logging.error(f"❌ Erreur création session Supabase: {e}")
            
            # Générer un token JWT
            token = generate_token(user.id)
            
            return jsonify({
                "success": True,
                "message": "Inscription réussie" + (" (utilisateur existant remplacé)" if force_register else ""),
                "token": token,
                "user": {
                    "id": user.id,
                    "email": user.email
                },
                "session_created": True
            }), 201
        else:
            # Ce cas ne devrait plus arriver grâce à la vérification préalable
            return jsonify({
                "error": "Erreur lors de la création de l'utilisateur",
                "details": "Une erreur inattendue s'est produite. Veuillez réessayer."
            }), 500

    except Exception as e:
        logging.error(f"Erreur lors de l'inscription: {str(e)}")
        return jsonify({
            "error": "Erreur serveur lors de l'inscription",
            "details": "Une erreur inattendue s'est produite. Veuillez réessayer plus tard."
        }), 500

@auth_api.route('/login', methods=['GET'])
def login_form():
    return jsonify({"error": "Veuillez vous connecter via l'interface prévue."}), 401

@auth_api.route('/login', methods=['POST'])
def login():
    """Connexion d'un utilisateur avec liaison des données"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({"error": "Données manquantes"}), 400
            
        email = data.get('email')
        password = data.get('password')
        
        if not email or not password:
            return jsonify({"error": "Email et mot de passe requis"}), 400

        # Authentifier l'utilisateur normal
        user = User.authenticate(email, password)
        if user:
            # Connexion Flask-Login (pour compatibilité)
            login_user(user)
            
            # IMPORTANT: Récupérer les données individualisées de l'utilisateur
            user_id = str(user.id)
            
            # Sauvegarder l'identifiant dans la session Flask
            session['user_id'] = user_id
            session['user_email'] = email
            session.permanent = True  # Rendre la session persistante
            
            # Récupérer les données de session de l'utilisateur depuis Supabase
            from services.supabase_storage import SupabaseStorage
            supabase = SupabaseStorage()
            
            user_data = {}
            try:
                response = supabase.client.table('sessions').select('*').eq('user_email', email).execute()
                if response.data and len(response.data) > 0:
                    user_data = response.data[0]
                    logging.info(f"✅ Données utilisateur récupérées depuis Supabase: {email}")
                else:
                    # Créer une session si elle n'existe pas
                    session_data = {
                        'user_email': email,
                        'chat_history': [],
                        'documents': {},
                        'analyses': {},
                        'created_at': datetime.datetime.utcnow().isoformat(),
                        'updated_at': datetime.datetime.utcnow().isoformat()
                    }
                    response = supabase.client.table('sessions').insert(session_data).execute()
                    if response.data:
                        user_data = response.data[0]
                        logging.info(f"✅ Nouvelle session créée pour l'utilisateur: {email}")
            except Exception as e:
                logging.error(f"❌ Erreur récupération données utilisateur: {e}")
            
            # Générer un token JWT
            token = generate_token(user.id)
            
            return jsonify({
                "success": True,
                "message": "Connexion réussie",
                "token": token,
                "user": {
                    "id": user.id,
                    "email": user.email,
                    "is_admin": user.is_admin
                },
                "user_data": {
                    "chat_history": user_data.get('chat_history', []),
                    "documents": user_data.get('documents', {}),
                    "analyses": user_data.get('analyses', {})
                },
                "has_history": len(user_data.get('chat_history', [])) > 0
            }), 200
        else:
            return jsonify({"error": "Email ou mot de passe incorrect"}), 401

    except Exception as e:
        logging.error(f"Erreur lors de la connexion: {e}")
        return jsonify({"error": f"Erreur lors de la connexion: {str(e)}"}), 500

@auth_api.route('/logout', methods=['POST'])
@verify_jwt_token
def logout():
    """Déconnexion d'un utilisateur"""
    try:
        # Sauvegarder les données avant la déconnexion
        user_email = request.current_user.email
        
        # Sauvegarder dans Supabase
        from services.supabase_storage import SupabaseStorage
        supabase = SupabaseStorage()
        
        # Récupérer les données actuelles
        response = supabase.client.table('sessions').select('*').eq('user_email', user_email).execute()
        if response.data and len(response.data) > 0:
            current_data = response.data[0]
            # Ici on pourrait sauvegarder des données finales si nécessaire
        
        return jsonify({
            "success": True,
            "message": "Déconnexion réussie"
        }), 200
    except Exception as e:
        logging.error(f"Erreur lors de la déconnexion: {e}")
        return jsonify({"error": f"Erreur lors de la déconnexion: {str(e)}"}), 500

@auth_api.route('/me', methods=['GET'])
@verify_jwt_token
def get_current_user():
    """Récupère les informations de l'utilisateur connecté"""
    try:
        return jsonify({
            "user": {
                "id": request.current_user.id,
                "email": request.current_user.email
            }
        }), 200
    except Exception as e:
        return jsonify({"error": f"Erreur lors de la récupération des données utilisateur: {str(e)}"}), 500

@auth_api.route('/verify-token', methods=['POST'])
def verify_token():
    """Vérifie la validité d'un token JWT avec debug complet"""
    try:
        # 1. Récupérer les données brutes
        print("=== DEBUG VERIFY TOKEN START ===")
        
        data = request.get_json()
        print(f"1. Data reçue: {data}, type: {type(data)}")
        
        if not data:
            print("2. Pas de données JSON")
            return jsonify({"success": False, "error": "Pas de données JSON"}), 400
        
        # 2. Extraire le token
        token = data.get('token')
        print(f"3. Token extrait: {token}, type: {type(token)}")
        
        if token is None:
            print("4. Token est None")
            return jsonify({"success": False, "error": "Token manquant"}), 400
        
        # 3. Vérifier que c'est une string
        if not isinstance(token, str):
            print(f"5. Token n'est pas une string, conversion: {token} -> {str(token)}")
            token = str(token)
        
        if token == "None" or token == "null" or not token.strip():
            print("6. Token est vide ou null")
            return jsonify({"success": False, "error": "Token vide ou invalide"}), 400
        
        print(f"7. Token final à décoder: '{token}' (longueur: {len(token)})")
        
        # 4. Décoder le token
        secret_key = os.environ.get('FLASK_SECRET_KEY') or 'dev_secret_key'
        print(f"8. Secret key: {secret_key[:10]}...")
        
        payload = jwt.decode(token, secret_key, algorithms=['HS256'])
        print(f"9. Payload décodé: {payload}")
        
        user_id = payload.get('user_id')
        print(f"10. User ID: {user_id}")
        
        # 5. Récupérer l'utilisateur
        user = User.get(user_id)
        print(f"11. User trouvé: {user}")
        
        if user:
            print("12. SUCCESS - Token valide")
            return jsonify({
                "success": True,
                "valid": True,
                "user": {
                    "id": user.id,
                    "email": user.email,
                    "is_admin": user.is_admin
                }
            }), 200
        else:
            print("13. User non trouvé")
            return jsonify({"success": False, "error": "Utilisateur non trouvé"}), 404
            
    except jwt.ExpiredSignatureError as e:
        print(f"ERROR: Token expiré: {e}")
        return jsonify({"success": False, "error": "Token expiré"}), 401
    except jwt.InvalidTokenError as e:
        print(f"ERROR: Token invalide: {e}")
        return jsonify({"success": False, "error": f"Token invalide: {str(e)}"}), 401
    except Exception as e:
        print(f"ERROR: Exception générale: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "error": f"Erreur de vérification: {str(e)}"}), 500
    finally:
        print("=== DEBUG VERIFY TOKEN END ===")

@auth_api.route('/check-session', methods=['GET'])
def check_session():
    """Vérifier si l'utilisateur est connecté et récupérer ses données"""
    try:
        user_id = session.get('user_id')
        user_email = session.get('user_email')
        
        if user_id and user_id != 'anonymous':
            # Récupérer les données de l'utilisateur
            user_data = get_session_data()
            
            return jsonify({
                'authenticated': True,
                'user': {
                    'id': user_id,
                    'email': user_email
                },
                'has_data': {
                    'chat_history': len(user_data.get('chat_history', [])) > 0,
                    'cv': user_data.get('documents', {}).get('cv', False),
                    'offre_emploi': user_data.get('documents', {}).get('offre_emploi', False)
                }
            }), 200
        else:
            return jsonify({
                'authenticated': False,
                'user': None
            }), 200
            
    except Exception as e:
        logging.error(f"Erreur lors de la vérification de session: {e}")
        return jsonify({'error': str(e)}), 500

@auth_api.route('/save-user-data', methods=['POST'])
@verify_jwt_token
def save_user_data():
    """Sauvegarde les données de l'utilisateur connecté"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "Données manquantes"}), 400
        
        user_email = request.current_user.email
        user_id = str(request.current_user.id)
        
        # Sauvegarder dans Supabase
        from services.supabase_storage import SupabaseStorage
        supabase = SupabaseStorage()
        
        update_data = {
            'chat_history': data.get('chat_history', []),
            'documents': data.get('documents', {}),
            'analyses': data.get('analyses', {}),
            'updated_at': datetime.datetime.utcnow().isoformat()
        }
        
        response = supabase.client.table('sessions').update(update_data).eq('user_email', user_email).execute()
        
        if response.data:
            return jsonify({
                "success": True,
                "message": "Données sauvegardées avec succès"
            }), 200
        else:
            return jsonify({"error": "Erreur lors de la sauvegarde"}), 500
            
    except Exception as e:
        logging.error(f"Erreur lors de la sauvegarde des données: {e}")
        return jsonify({"error": f"Erreur lors de la sauvegarde: {str(e)}"}), 500

@auth_api.route('/get-user-data', methods=['GET'])
@verify_jwt_token
def get_user_data():
    """Récupère les données de l'utilisateur connecté"""
    try:
        user_email = request.current_user.email
        
        # Récupérer depuis Supabase
        from services.supabase_storage import SupabaseStorage
        supabase = SupabaseStorage()
        
        response = supabase.client.table('sessions').select('*').eq('user_email', user_email).execute()
        
        if response.data and len(response.data) > 0:
            user_data = response.data[0]
            return jsonify({
                "success": True,
                "user_data": {
                    "chat_history": user_data.get('chat_history', []),
                    "documents": user_data.get('documents', {}),
                    "analyses": user_data.get('analyses', {})
                }
            }), 200
        else:
            return jsonify({
                "success": True,
                "user_data": {
                    "chat_history": [],
                    "documents": {},
                    "analyses": {}
                }
            }), 200
            
    except Exception as e:
        logging.error(f"Erreur lors de la récupération des données: {e}")
        return jsonify({"error": f"Erreur lors de la récupération: {str(e)}"}), 500

@auth_api.route('/debug/users', methods=['GET'])
def debug_users():
    """Endpoint de debug pour vérifier les utilisateurs dans la base"""
    try:
        from services.supabase_storage import SupabaseStorage
        supabase = SupabaseStorage()
        
        # Récupérer tous les utilisateurs
        response = supabase.client.table('users').select('*').execute()
        
        if response.data:
            users_info = []
            for user in response.data:
                users_info.append({
                    'id': user.get('id'),
                    'email': user.get('email'),
                    'is_admin': user.get('is_admin', False),
                    'created_at': user.get('created_at')
                })
            
            return jsonify({
                "success": True,
                "total_users": len(users_info),
                "users": users_info
            }), 200
        else:
            return jsonify({
                "success": False,
                "error": "Aucun utilisateur trouvé"
            }), 404
            
    except Exception as e:
        return jsonify({
            "success": False,
            "error": f"Erreur lors de la récupération des utilisateurs: {str(e)}"
        }), 500

@auth_api.route('/debug/check-email/<email>', methods=['GET'])
def debug_check_email(email):
    """Endpoint de debug pour vérifier un email spécifique"""
    try:
        from services.supabase_storage import SupabaseStorage
        supabase = SupabaseStorage()
        
        print(f"🔍 DEBUG: Vérification email: {email}")
        
        # Vérifier l'email directement
        response = supabase.client.table('users').select('*').eq('email', email).execute()
        print(f"🔍 DEBUG: Réponse Supabase brute: {response}")
        print(f"🔍 DEBUG: Données: {response.data}")
        
        if response.data and len(response.data) > 0:
            user_data = response.data[0]
            print(f"✅ DEBUG: Utilisateur trouvé: {user_data}")
            return jsonify({
                "success": True,
                "email_exists": True,
                "user": {
                    'id': user_data.get('id'),
                    'email': user_data.get('email'),
                    'is_admin': user_data.get('is_admin', False),
                    'created_at': user_data.get('created_at')
                }
            }), 200
        else:
            print(f"❌ DEBUG: Aucun utilisateur trouvé pour {email}")
            return jsonify({
                "success": True,
                "email_exists": False,
                "message": f"L'email {email} n'existe pas dans la base"
            }), 200
            
    except Exception as e:
        print(f"❌ DEBUG: Erreur: {e}")
        return jsonify({
            "success": False,
            "error": f"Erreur lors de la vérification de l'email: {str(e)}"
        }), 500
