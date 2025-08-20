"""
Routes API pour l'administration
"""
from flask import Blueprint, request, jsonify, send_from_directory
import logging
import os
import jwt
from functools import wraps
from datetime import datetime, date

admin_api = Blueprint('admin_api', __name__)

def verify_jwt_token(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            auth_header = request.headers.get('Authorization')
            if not auth_header:
                return jsonify({"error": "Token d'authentification manquant"}), 401
            if auth_header.startswith('Bearer '):
                token = auth_header[7:]
            else:
                token = auth_header
            if not token:
                return jsonify({"error": "Token invalide"}), 401
            secret_key = os.environ.get('FLASK_SECRET_KEY') or 'dev_secret_key'
            payload = jwt.decode(token, secret_key, algorithms=['HS256'])
            user_id = payload.get('user_id')
            if not user_id:
                return jsonify({"error": "Token invalide - ID utilisateur manquant"}), 401
            from models.user import User
            user = User.get(user_id)
            if not user:
                return jsonify({"error": "Utilisateur non trouvé"}), 401
            if not user.is_admin:
                return jsonify({"error": "Droits administrateur requis"}), 403
            request.current_user = user
            return f(*args, **kwargs)
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Token expiré"}), 401
        except jwt.InvalidTokenError:
            return jsonify({"error": "Token invalide"}), 401
        except Exception as e:
            logging.error(f"Erreur lors de la vérification du token: {e}")
            return jsonify({"error": "Erreur d'authentification"}), 500
    return decorated_function

@admin_api.route('/status', methods=['GET'])
@verify_jwt_token
def admin_status():
    """Statut basique de l'administration"""
    try:
        return jsonify({
            "success": True,
            "message": "Interface admin disponible",
            "user": request.current_user.email
        }), 200
        
    except Exception as e:
        logging.error(f"Erreur admin status: {e}")
        return jsonify({"error": f"Erreur: {str(e)}"}), 500

@admin_api.route('/health', methods=['GET'])
def admin_health():
    """Vérification de santé pour l'admin"""
    return jsonify({
        "status": "healthy",
        "service": "admin_api"
    }), 200

@admin_api.route('/interface', methods=['GET'])
def admin_interface():
    """Sert l'interface d'administration HTML"""
    try:
        # Chemin vers le fichier HTML
        html_file = os.path.join(os.path.dirname(__file__), '..', '..', '..', 'simple_admin_interface.html')
        
        if os.path.exists(html_file):
            with open(html_file, 'r', encoding='utf-8') as f:
                html_content = f.read()
            
            return html_content, 200, {'Content-Type': 'text/html'}
        else:
            return jsonify({
                "error": "Interface admin non trouvée"
            }), 404
            
    except Exception as e:
        logging.error(f"Erreur lors du chargement de l'interface admin: {e}")
        return jsonify({
            "error": "Erreur serveur"
        }), 500


def _compute_user_token_usage(user_email: str) -> dict:
    """Calcule l'usage quotidien et mensuel des tokens pour un utilisateur via la table token_usage.

    La table attend les colonnes: user_email (TEXT), date (DATE), tokens_used (INT)
    """
    try:
        from services.supabase_storage import SupabaseStorage
        supabase = SupabaseStorage()
        if not supabase.is_available():
            raise RuntimeError("Supabase indisponible")

        today_str = date.today().isoformat()
        month_start_str = date.today().replace(day=1).isoformat()

        # Récupération mensuelle, on additionne côté serveur applicatif
        monthly_resp = supabase.client.table('token_usage') \
            .select('tokens_used,date') \
            .eq('user_email', user_email) \
            .gte('date', month_start_str) \
            .lte('date', today_str) \
            .execute()

        used_monthly = 0
        used_daily = 0
        if monthly_resp.data:
            for row in monthly_resp.data:
                used_monthly += int(row.get('tokens_used') or 0)
                if str(row.get('date')) == today_str:
                    used_daily += int(row.get('tokens_used') or 0)

        return {
            'daily_tokens': 1000,
            'monthly_tokens': 10000,
            'used_daily': used_daily,
            'used_monthly': used_monthly,
            'last_reset': None,
        }
    except Exception as e:
        logging.warning(f"Token usage indisponible pour {user_email}: {e}")
        return {
            'daily_tokens': 1000,
            'monthly_tokens': 10000,
            'used_daily': 0,
            'used_monthly': 0,
            'last_reset': None,
        }

@admin_api.route('/users', methods=['GET'])
@verify_jwt_token
def list_users():
    """Liste tous les utilisateurs et leur consommation de tokens (agrégée)"""
    try:
        from models.user import User
        
        # Récupérer tous les utilisateurs
        all_users = User.list_all()
        logging.info(f"Nombre d'utilisateurs trouvés: {len(all_users)}")
        
        users_info = []
        for user in all_users:
            users_info.append({
                "id": user.id,
                "email": user.email,
                "is_admin": user.is_admin,
                "tokens": _compute_user_token_usage(user.email)
            })

        logging.info(f"Utilisateurs traités: {len(users_info)}")
        return jsonify({"success": True, "users": users_info}), 200
    except Exception as e:
        logging.error(f"Erreur liste utilisateurs: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@admin_api.route('/users/<user_id>/admin', methods=['POST'])
@verify_jwt_token
def set_user_admin(user_id):
    """Met à jour le statut administrateur d'un utilisateur"""
    try:
        data = request.get_json() or {}
        is_admin = bool(data.get('is_admin', True))
        from models.user import User
        if User.set_admin_status(user_id, is_admin):
            return jsonify({"success": True, "user_id": user_id, "is_admin": is_admin})
        return jsonify({"success": False, "error": "Utilisateur inconnu"}), 404
    except Exception as e:
        logging.error(f"Erreur mise à jour admin: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@admin_api.route('/users/<user_id>/tokens', methods=['GET'])
@verify_jwt_token
def get_user_tokens(user_id):
    """Récupère l'utilisation de tokens d'un utilisateur"""
    try:
        from models.user import User
        user = User.get(user_id)
        if not user:
            return jsonify({"success": False, "error": "Utilisateur non trouvé"}), 404
        tokens = _compute_user_token_usage(user.email)
        return jsonify({"success": True, "tokens": tokens}), 200
    except Exception as e:
        logging.error(f"Erreur récupération tokens: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@admin_api.route('/users/<user_id>/tokens/reset', methods=['POST'])
@verify_jwt_token
def reset_user_tokens_api(user_id):
    """Réinitialise les compteurs de tokens d'un utilisateur"""
    try:
        from models.user import User
        from services.supabase_storage import SupabaseStorage
        user = User.get(user_id)
        if not user:
            return jsonify({"success": False, "error": "Utilisateur non trouvé"}), 404

        supabase = SupabaseStorage()
        if not supabase.is_available():
            return jsonify({"success": False, "error": "Supabase indisponible"}), 503

        month_start_str = date.today().replace(day=1).isoformat()
        today_str = date.today().isoformat()

        # Supprimer les lignes d'usage pour le mois courant afin de repartir à zéro
        try:
            supabase.client.table('token_usage') \
                .delete() \
                .eq('user_email', user.email) \
                .gte('date', month_start_str) \
                .lte('date', today_str) \
                .execute()
        except Exception as e:
            logging.warning(f"Reset tokens - suppression échouée pour {user.email}: {e}")

        return jsonify({
            "success": True,
            "message": "Tokens réinitialisés",
            "daily_limit": 1000,
            "monthly_limit": 10000
        }), 200
    except Exception as e:
        logging.error(f"Erreur reset tokens: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@admin_api.route('/users/<user_id>', methods=['DELETE'])
@verify_jwt_token
def delete_user(user_id):
    """Supprime un utilisateur"""
    try:
        from models.user import User
        
        # Vérifier que l'utilisateur existe
        user = User.get(user_id)
        if not user:
            return jsonify({"success": False, "error": "Utilisateur non trouvé"}), 404
        
        # Supprimer l'utilisateur
        if User.delete(user_id):
            logging.info(f"Utilisateur {user_id} supprimé avec succès")
            return jsonify({"success": True, "message": "Utilisateur supprimé"})
        else:
            return jsonify({"success": False, "error": "Erreur lors de la suppression"}), 500
            
    except Exception as e:
        logging.error(f"Erreur suppression utilisateur: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

