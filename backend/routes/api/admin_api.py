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
    
    Utilise les colonnes: user_email (TEXT), created_at (TIMESTAMPTZ), tokens_used (INT)
    """
    try:
        from services.supabase_storage import SupabaseStorage
        supabase = SupabaseStorage()
        if not supabase.is_available():
            raise RuntimeError("Supabase indisponible")

        # Récupérer tous les tokens utilisés pour cet utilisateur
        token_resp = supabase.client.table('token_usage') \
            .select('tokens_used,created_at') \
            .eq('user_email', user_email) \
            .execute()

        used_monthly = 0
        used_daily = 0
        total_used = 0
        
        if token_resp.data:
            from datetime import datetime, timezone
            now = datetime.now(timezone.utc)
            today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
            month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            
            for row in token_resp.data:
                tokens = int(row.get('tokens_used') or 0)
                created_at_str = row.get('created_at')
                
                if created_at_str:
                    try:
                        # Parser la date de création
                        if isinstance(created_at_str, str):
                            created_at = datetime.fromisoformat(created_at_str.replace('Z', '+00:00'))
                        else:
                            created_at = created_at_str
                        
                        # Ajouter au total
                        total_used += tokens
                        
                        # Vérifier si c'est aujourd'hui
                        if created_at >= today_start:
                            used_daily += tokens
                        
                        # Vérifier si c'est ce mois
                        if created_at >= month_start:
                            used_monthly += tokens
                            
                    except Exception as parse_error:
                        logging.warning(f"Erreur parsing date pour {user_email}: {parse_error}")
                        # En cas d'erreur, ajouter quand même au total
                        total_used += tokens

        # Récupérer les limites depuis user_token_limits
        limits_resp = supabase.client.table('user_token_limits') \
            .select('daily_limit,monthly_limit') \
            .eq('user_email', user_email) \
            .execute()
        
        daily_limit = 1000  # Valeur par défaut
        monthly_limit = 10000  # Valeur par défaut
        
        if limits_resp.data:
            limits = limits_resp.data[0]
            daily_limit = int(limits.get('daily_limit') or 1000)
            monthly_limit = int(limits.get('monthly_limit') or 10000)

        return {
            'daily_tokens': daily_limit,
            'monthly_tokens': monthly_limit,
            'used_daily': used_daily,
            'used_monthly': used_monthly,
            'total_used': total_used,
            'last_reset': None,
        }
        
    except Exception as e:
        logging.warning(f"Token usage indisponible pour {user_email}: {e}")
        return {
            'daily_tokens': 1000,
            'monthly_tokens': 10000,
            'used_daily': 0,
            'used_monthly': 0,
            'total_used': 0,
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


@admin_api.route('/partners/stats', methods=['GET'])
@verify_jwt_token
def get_partners_stats():
    """Récupère les statistiques de tous les partenaires"""
    try:
        from services.partner_offer_service import partner_offer_service
        
        days = request.args.get('days', 30, type=int)
        stats = partner_offer_service.get_all_partners_stats(days)
        
        return jsonify({
            "success": True,
            "stats": stats,
            "period_days": days
        }), 200
        
    except Exception as e:
        logging.error(f"Erreur récupération stats partenaires: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@admin_api.route('/partners/<int:partner_id>/stats', methods=['GET'])
@verify_jwt_token
def get_partner_stats(partner_id):
    """Récupère les statistiques d'un partenaire spécifique"""
    try:
        from services.partner_offer_service import partner_offer_service
        
        days = request.args.get('days', 30, type=int)
        stats = partner_offer_service.get_partner_offer_stats(partner_id, days)
        
        if not stats['partner_id']:
            return jsonify({"success": False, "error": "Partenaire non trouvé"}), 404
        
        return jsonify({
            "success": True,
            "stats": stats
        }), 200
        
    except Exception as e:
        logging.error(f"Erreur récupération stats partenaire: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@admin_api.route('/partners/<int:partner_id>/offers', methods=['GET'])
@verify_jwt_token
def get_partner_offers(partner_id):
    """Récupère les offres d'un partenaire"""
    try:
        from services.supabase_storage import SupabaseStorage
        
        supabase = SupabaseStorage()
        if not supabase.is_available():
            return jsonify({"success": False, "error": "Supabase indisponible"}), 503
        
        response = supabase.client.table('partner_offers') \
            .select('*') \
            .eq('partner_id', partner_id) \
            .eq('is_active', True) \
            .execute()
        
        offers = response.data if response.data else []
        
        return jsonify({
            "success": True,
            "partner_id": partner_id,
            "offers": offers
        }), 200
        
    except Exception as e:
        logging.error(f"Erreur récupération offres partenaire: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@admin_api.route('/partners/<int:partner_id>/offers', methods=['POST'])
@verify_jwt_token
def create_partner_offer(partner_id):
    """Crée une nouvelle offre pour un partenaire"""
    try:
        data = request.get_json() or {}
        
        required_fields = ['title', 'description', 'offer_type']
        for field in required_fields:
            if not data.get(field):
                return jsonify({"success": False, "error": f"Champ requis: {field}"}), 400
        
        from services.supabase_storage import SupabaseStorage
        
        supabase = SupabaseStorage()
        if not supabase.is_available():
            return jsonify({"success": False, "error": "Supabase indisponible"}), 503
        
        offer_data = {
            'partner_id': partner_id,
            'title': data['title'],
            'description': data['description'],
            'offer_type': data['offer_type'],
            'url': data.get('url'),
            'is_active': True
        }
        
        response = supabase.client.table('partner_offers').insert(offer_data).execute()
        
        if response.data:
            return jsonify({
                "success": True,
                "offer": response.data[0]
            }), 201
        else:
            return jsonify({"success": False, "error": "Erreur lors de la création"}), 500
        
    except Exception as e:
        logging.error(f"Erreur création offre partenaire: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

@admin_api.route('/partners/<partner_id>/connections', methods=['GET'])
@verify_jwt_token
def get_partner_connections(partner_id):
    """Récupère les statistiques de connexions d'un partenaire"""
    try:
        from services.partner_connection_service import get_partner_stats
        
        days = request.args.get('days', 30, type=int)
        stats = get_partner_stats(partner_id, days)
        
        if 'error' in stats:
            return jsonify({"success": False, "error": stats['error']}), 500
        
        return jsonify({
            "success": True,
            "stats": stats
        }), 200
        
    except Exception as e:
        logging.error(f"Erreur récupération connexions partenaire: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

# ====================================
# GESTION COMPLÈTE DES PARTENAIRES (CRUD)
# ====================================

@admin_api.route('/partners', methods=['GET', 'POST', 'PUT', 'DELETE'])
@verify_jwt_token
def admin_partners():
    """Administration des partenaires - CRUD complet"""
    try:
        from services.supabase_storage import SupabaseStorage
        
        supabase = SupabaseStorage()
        if not supabase.is_available():
            return jsonify({"success": False, "error": "Supabase indisponible"}), 503
        
        if request.method == 'GET':
            # Récupérer tous les partenaires
            response = supabase.client.table('partners').select('*').execute()
            return jsonify({
                "success": True,
                "partners": response.data if response.data else []
            }), 200
        
        elif request.method == 'POST':
            # Créer un nouveau partenaire
            data = request.get_json()
            if not data:
                return jsonify({"success": False, "error": "Données manquantes"}), 400
            
            required_fields = ['name', 'contact_email']
            for field in required_fields:
                if not data.get(field):
                    return jsonify({"success": False, "error": f"Champ requis: {field}"}), 400
            
            partner_data = {
                'name': data.get('name'),
                'description': data.get('description'),
                'website': data.get('website'),
                'logo_url': data.get('logo_url'),
                'contact_email': data.get('contact_email'),
                'status': data.get('status', 'active')
            }
            
            response = supabase.client.table('partners').insert(partner_data).execute()
            
            if response.data:
                return jsonify({
                    "success": True,
                    "message": "Partenaire créé avec succès",
                    "partner": response.data[0]
                }), 201
            else:
                return jsonify({"success": False, "error": "Erreur lors de la création"}), 500
        
        elif request.method == 'PUT':
            # Mettre à jour un partenaire existant
            data = request.get_json()
            if not data or not data.get('id'):
                return jsonify({"success": False, "error": "ID et données manquants"}), 400
            
            partner_id = data['id']
            update_data = {
                'name': data.get('name'),
                'description': data.get('description'),
                'website': data.get('website'),
                'logo_url': data.get('logo_url'),
                'contact_email': data.get('contact_email'),
                'status': data.get('status')
            }
            
            # Supprimer les champs vides
            update_data = {k: v for k, v in update_data.items() if v is not None}
            
            response = supabase.client.table('partners').update(update_data).eq('id', partner_id).execute()
            
            if response.data:
                return jsonify({
                    "success": True,
                    "message": "Partenaire mis à jour avec succès",
                    "partner": response.data[0]
                }), 200
            else:
                return jsonify({"success": False, "error": "Erreur lors de la mise à jour"}), 500
        
        elif request.method == 'DELETE':
            # Supprimer un partenaire
            data = request.get_json()
            if not data or not data.get('id'):
                return jsonify({"success": False, "error": "ID manquant"}), 400
            
            partner_id = data['id']
            response = supabase.client.table('partners').delete().eq('id', partner_id).execute()
            
            if response.data:
                return jsonify({
                    "success": True,
                    "message": "Partenaire supprimé avec succès",
                    "deleted_partner": response.data[0]
                }), 200
            else:
                return jsonify({"success": False, "error": "Erreur lors de la suppression"}), 500
                
    except Exception as e:
        logging.error(f"Erreur administration partenaires: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

