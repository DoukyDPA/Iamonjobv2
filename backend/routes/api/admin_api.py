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

# === GESTION DES SERVICES ===
@admin_api.route('/services', methods=['GET'])
@verify_jwt_token
def get_services_config():
    """Liste tous les services avec leur configuration"""
    try:
        # Essayer d'abord Supabase
        try:
            from backend.admin.supabase_services_manager import supabase_services_manager
            services = supabase_services_manager.get_all_services()
            
            # Organiser par thèmes
            themes = {}
            for service in services.values():
                theme = service.get('theme', 'other')
                if theme not in themes:
                    themes[theme] = []
                themes[theme]['services'].append(service)
            
            featured = supabase_services_manager.get_featured_service()
            
            return jsonify({
                "success": True,
                "services": services,
                "themes": themes,
                "featured": featured
            })
            
        except Exception as e:
            logging.warning(f"Supabase non disponible, fallback vers services_manager: {e}")
            from backend.admin.services_manager import get_services_for_admin
            return get_services_for_admin()
            
    except Exception as e:
        logging.error(f"Erreur lors de la récupération des services: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

@admin_api.route('/services/init-defaults', methods=['POST'])
@verify_jwt_token
def init_default_services():
    """Initialise les services par défaut depuis la configuration locale"""
    try:
        from backend.admin.supabase_services_manager import supabase_services_manager
        
        # Récupérer la configuration par défaut
        default_services = supabase_services_manager._get_default_config()
        
        # Initialiser chaque service dans Supabase
        initialized_count = 0
        for service_id, service_config in default_services.items():
            try:
                # Vérifier si le service existe déjà
                existing_service = supabase_services_manager.get_service_by_id(service_id)
                if not existing_service:
                    # Créer le service avec la configuration par défaut
                    success = supabase_services_manager.create_service(
                        service_id=service_id,
                        title=service_config['title'],
                        coach_advice=service_config['coach_advice'],
                        theme=service_config['theme'],
                        visible=service_config['visible'],
                        requires_cv=service_config['requires_cv'],
                        requires_job_offer=service_config['requires_job_offer'],
                        requires_questionnaire=service_config['requires_questionnaire'],
                        difficulty=service_config['difficulty'],
                        duration_minutes=service_config['duration_minutes'],
                        slug=service_config['slug']
                    )
                    if success:
                        initialized_count += 1
                        logging.info(f"✅ Service {service_id} initialisé")
                    else:
                        logging.warning(f"⚠️ Échec initialisation service {service_id}")
                else:
                    logging.info(f"ℹ️ Service {service_id} existe déjà")
                    
            except Exception as service_error:
                logging.error(f"❌ Erreur initialisation service {service_id}: {service_error}")
                continue
        
        return jsonify({
            "success": True,
            "message": f"{initialized_count} services initialisés avec succès",
            "initialized_count": initialized_count
        })
        
    except Exception as e:
        logging.error(f"Erreur lors de l'initialisation des services: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

@admin_api.route('/services/<service_id>/visibility', methods=['POST'])
@verify_jwt_token
def toggle_service_visibility(service_id):
    """Active/désactive un service"""
    try:
        data = request.get_json()
        visible = data.get('visible', True)
        
        # Essayer d'abord le nouveau manager Supabase
        try:
            from backend.admin.supabase_services_manager import toggle_service_visibility_admin
            success = toggle_service_visibility_admin(service_id, visible)
        except ImportError:
            # Fallback vers l'ancien manager
            from backend.admin.services_manager import toggle_service_visibility_admin
            success = toggle_service_visibility_admin(service_id, visible)
        
        return jsonify({"success": success, "service_id": service_id, "visible": visible})
    except Exception as e:
        logging.error(f"Erreur lors du changement de visibilité: {e}")
        return jsonify({"error": f"Erreur: {str(e)}"}), 500

@admin_api.route('/services/<service_id>/theme', methods=['PUT'])
@verify_jwt_token
def update_service_theme(service_id):
    """Change le thème d'un service"""
    try:
        data = request.get_json()
        theme = data.get('theme')
        
        if not theme:
            return jsonify({"error": "Thème manquant"}), 400
        
        # Essayer d'abord le nouveau manager Supabase
        try:
            from backend.admin.supabase_services_manager import update_service_theme_admin
            success = update_service_theme_admin(service_id, theme)
            if success:
                logging.info(f"Service {service_id} déplacé vers le thème {theme} (Supabase)")
            else:
                logging.warning(f"Service {service_id} non trouvé ou erreur Supabase")
        except ImportError:
            # Fallback vers l'ancien manager
            try:
                from backend.admin.services_manager import services_manager
                if service_id in services_manager.services_config:
                    services_manager.services_config[service_id]['theme'] = theme
                    success = True
                    logging.info(f"Service {service_id} déplacé vers le thème {theme} (ancien manager)")
                else:
                    success = False
            except Exception as fallback_error:
                logging.error(f"Erreur fallback ancien manager: {fallback_error}")
                return jsonify({"error": "Aucun gestionnaire disponible"}), 500
        
        if success:
            # Récupérer les données mises à jour
            try:
                from backend.admin.supabase_services_manager import supabase_services_manager
                updated_service = supabase_services_manager.get_all_services().get(service_id)
                if updated_service:
                    return jsonify({
                        "success": True, 
                        "service_id": service_id, 
                        "theme": theme,
                        "updated_service": updated_service
                    })
                else:
                    return jsonify({"success": True, "service_id": service_id, "theme": theme})
            except Exception as e:
                logging.warning(f"Impossible de récupérer le service mis à jour: {e}")
                return jsonify({"success": True, "service_id": service_id, "theme": theme})
        else:
            return jsonify({"success": False, "error": "Service non trouvé ou erreur de mise à jour"})
    except Exception as e:
        logging.error(f"Erreur lors du changement de thème: {e}")
        return jsonify({"error": f"Erreur: {str(e)}"}), 500

@admin_api.route('/services/<service_id>/requirements', methods=['PUT'])
@verify_jwt_token
def update_service_requirements(service_id):
    """Met à jour les documents requis d'un service"""
    try:
        data = request.get_json()
        requirements = {
            'requires_cv': data.get('requires_cv', False),
            'requires_job_offer': data.get('requires_job_offer', False),
            'requires_questionnaire': data.get('requires_questionnaire', False)
        }
        
        # Essayer d'abord le nouveau manager Supabase
        try:
            from backend.admin.supabase_services_manager import update_service_requirements_admin
            success = update_service_requirements_admin(service_id, requirements)
            if success:
                logging.info(f"Exigences du service {service_id} mises à jour (Supabase)")
            else:
                logging.warning(f"Service {service_id} non trouvé ou erreur Supabase")
        except ImportError:
            # Fallback vers l'ancien manager
            try:
                from backend.admin.services_manager import services_manager
                if service_id in services_manager.services_config:
                    services_manager.services_config[service_id].update(requirements)
                    success = True
                    logging.info(f"Exigences du service {service_id} mises à jour (ancien manager)")
                else:
                    success = False
            except Exception as fallback_error:
                logging.error(f"Erreur fallback ancien manager: {fallback_error}")
                return jsonify({"error": "Aucun gestionnaire disponible"}), 500
        
        if success:
            # Récupérer les données mises à jour
            try:
                from backend.admin.supabase_services_manager import supabase_services_manager
                updated_service = supabase_services_manager.get_all_services().get(service_id)
                if updated_service:
                    return jsonify({
                        "success": True, 
                        "service_id": service_id, 
                        "requirements": requirements,
                        "updated_service": updated_service
                    })
                else:
                    return jsonify({"success": True, "service_id": service_id, "requirements": requirements})
            except Exception as e:
                logging.warning(f"Impossible de récupérer le service mis à jour: {e}")
                return jsonify({"success": True, "service_id": service_id, "requirements": requirements})
        else:
            return jsonify({"success": False, "error": "Service non trouvé ou erreur de mise à jour"})
    except Exception as e:
        logging.error(f"Erreur lors de la mise à jour des exigences: {e}")
        return jsonify({"error": f"Erreur: {str(e)}"}), 500

@admin_api.route('/services/<service_id>/feature', methods=['POST'])
@verify_jwt_token
def set_featured_service(service_id):
    """Met un service en avant"""
    try:
        data = request.get_json()
        featured_title = data.get('featured_title')
        duration_days = data.get('duration_days', 30)
        
        from backend.admin.services_manager import set_featured_service_admin
        success = set_featured_service_admin(service_id, featured_title, duration_days)
        
        return jsonify({"success": success, "service_id": service_id, "featured": True})
    except Exception as e:
        logging.error(f"Erreur lors de la mise en avant: {e}")
        return jsonify({"error": f"Erreur: {str(e)}"}), 500

@admin_api.route('/services/featured', methods=['DELETE'])
@verify_jwt_token
def clear_featured_service():
    """Retire la mise en avant"""
    try:
        from backend.admin.services_manager import clear_featured_service_admin
        success = clear_featured_service_admin()
        return jsonify({"success": success, "featured": None})
    except Exception as e:
        logging.error(f"Erreur lors de la suppression de la mise en avant: {e}")
        return jsonify({"error": f"Erreur: {str(e)}"}), 500

@admin_api.route('/services', methods=['POST'])
@verify_jwt_token
def add_new_service():
    """Ajoute un nouveau service"""
    try:
        data = request.get_json()
        
        from backend.admin.services_manager import add_new_service_admin
        success = add_new_service_admin(data)
        
        return jsonify({"success": success, "service": data if success else None})
    except Exception as e:
        logging.error(f"Erreur lors de l'ajout du service: {e}")
        return jsonify({"error": f"Erreur: {str(e)}"}), 500

# === GESTION DES PROMPTS ===
@admin_api.route('/prompts', methods=['GET'])
@verify_jwt_token
def list_prompts():
    """Liste tous les prompts disponibles"""
    try:
        from services.ai_service_prompts import AI_PROMPTS
        return jsonify({"success": True, "prompts": AI_PROMPTS})
    except Exception as e:
        logging.error(f"Erreur lors de la récupération des prompts: {e}")
        return jsonify({"error": f"Erreur: {str(e)}"}), 500

@admin_api.route('/prompts/<service_id>', methods=['GET', 'PUT'])
@verify_jwt_token
def handle_prompt(service_id):
    """Récupère ou met à jour le prompt d'un service"""
    try:
        from services.ai_service_prompts import get_prompt, update_prompt
        
        if request.method == 'GET':
            prompt_entry = get_prompt(service_id)
            if prompt_entry:
                # Retourner le texte du prompt, pas l'objet complet
                prompt_text = prompt_entry.get("prompt", "")
                return jsonify({"success": True, "prompt": prompt_text})
            return jsonify({"success": False, "error": "Service inconnu"}), 404

        data = request.get_json() or {}
        new_prompt = data.get('prompt')
        if new_prompt is None:
            return jsonify({"success": False, "error": "Champ 'prompt' manquant"}), 400
        
        # Mettre à jour le prompt
        if update_prompt(service_id, new_prompt):
            return jsonify({
                "success": True, 
                "service_id": service_id, 
                "prompt": new_prompt,
                "message": "Prompt mis à jour et sauvegardé avec succès"
            })
        return jsonify({"success": False, "error": "Service inconnu"}), 404
        
    except Exception as e:
        logging.error(f"Erreur lors de la gestion du prompt {service_id}: {e}")
        return jsonify({"error": f"Erreur: {str(e)}"}), 500

@admin_api.route('/prompts/reload', methods=['POST'])
@verify_jwt_token
def reload_prompts():
    """Recharge les prompts depuis le fichier"""
    try:
        from services.ai_service_prompts import reload_prompts_from_file
        success = reload_prompts_from_file()
        return jsonify({"success": True, "message": "Prompts rechargés" if success else "Erreur lors du rechargement"})
    except Exception as e:
        logging.error(f"Erreur lors du rechargement des prompts: {e}")
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

        print(f"🔍 Calcul tokens pour {user_email}...")

        # Récupérer tous les tokens utilisés pour cet utilisateur
        token_resp = supabase.client.table('token_usage').select('*').eq('user_email', user_email).execute()
        
        print(f"📊 Réponse token_usage: {len(token_resp.data or [])} enregistrements")

        used_monthly = 0
        used_daily = 0
        total_used = 0
        
        if token_resp.data:
            from datetime import datetime, timezone
            now = datetime.now(timezone.utc)
            today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
            month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            
            print(f"📅 Périodes: aujourd'hui depuis {today_start}, mois depuis {month_start}")
            
            for row in token_resp.data:
                tokens = int(row.get('tokens_used') or 0)
                created_at_str = row.get('created_at')
                
                print(f"   📝 Ligne: {tokens} tokens, créé le {created_at_str}")
                
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
                            print(f"      ✅ Ajouté au quotidien: {tokens} tokens")
                        
                        # Vérifier si c'est ce mois
                        if created_at >= month_start:
                            used_monthly += tokens
                            print(f"      ✅ Ajouté au mensuel: {tokens} tokens")
                            
                    except Exception as parse_error:
                        logging.warning(f"Erreur parsing date pour {user_email}: {parse_error}")
                        # En cas d'erreur, ajouter quand même au total
                        total_used += tokens

        print(f"📊 Totaux calculés: quotidien={used_daily}, mensuel={used_monthly}, total={total_used}")

        # Récupérer les limites depuis user_token_limits
        limits_resp = supabase.client.table('user_token_limits').select('*').eq('user_email', user_email).execute()
        
        daily_limit = 1000  # Valeur par défaut
        monthly_limit = 10000  # Valeur par défaut
        
        if limits_resp.data:
            limits = limits_resp.data[0]
            daily_limit = int(limits.get('daily_limit') or 1000)
            monthly_limit = int(limits.get('monthly_limit') or 10000)
            print(f"📋 Limites trouvées: quotidienne={daily_limit}, mensuelle={monthly_limit}")
        else:
            print(f"📋 Aucune limite trouvée, utilisation des valeurs par défaut")

        result = {
            'daily_tokens': daily_limit,
            'monthly_tokens': monthly_limit,
            'used_daily': used_daily,
            'used_monthly': used_monthly,
            'total_used': total_used,
            'last_reset': None,
        }
        
        print(f"🎯 Résultat final: {result}")
        return result
        
    except Exception as e:
        logging.warning(f"Token usage indisponible pour {user_email}: {e}")
        print(f"❌ Erreur calcul tokens pour {user_email}: {e}")
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
    """Récupère les statistiques de tous les partenaires (admin seulement)"""
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
    """Récupère les statistiques d'un partenaire spécifique (admin seulement)"""
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


@admin_api.route('/partners/<partner_id>/offers', methods=['GET'])
def get_partner_offers(partner_id):
    """Récupère les métiers d'un partenaire (accès public)"""
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
        logging.error(f"Erreur récupération métiers partenaire: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@admin_api.route('/partners/<partner_id>/offers', methods=['POST'])
@verify_jwt_token
def create_partner_offer(partner_id):
    """Crée un nouveau métier pour un partenaire (admin seulement)"""
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
        
        logging.info(f"Tentative création métier: {offer_data}")
        
        response = supabase.client.table('partner_offers').insert(offer_data).execute()
        
        if response.data:
            logging.info(f"✅ Métier créé avec succès: {response.data[0]}")
            return jsonify({
                "success": True,
                "offer": response.data[0]
            }), 201
        else:
            logging.error(f"❌ Échec création métier: pas de données retournées")
            return jsonify({"success": False, "error": "Erreur lors de la création"}), 500
        
    except Exception as e:
        logging.error(f"❌ Erreur création métier partenaire: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

@admin_api.route('/partners/<partner_id>/offers/<offer_id>', methods=['PUT'])
@verify_jwt_token
def update_partner_offer(partner_id, offer_id):
    """Met à jour un métier existant d'un partenaire (admin seulement)"""
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
        
        # Vérifier que le métier existe et appartient au partenaire
        offer_response = supabase.client.table('partner_offers').select('*').eq('id', offer_id).eq('partner_id', partner_id).execute()
        if not offer_response.data:
            return jsonify({"success": False, "error": "Métier non trouvé"}), 404
        
        update_data = {
            'title': data['title'],
            'description': data['description'],
            'offer_type': data['offer_type'],
            'url': data.get('url'),
            'is_active': data.get('is_active', True),
            'updated_at': datetime.now().isoformat()
        }
        
        logging.info(f"Tentative mise à jour métier {offer_id}: {update_data}")
        
        response = supabase.client.table('partner_offers').update(update_data).eq('id', offer_id).execute()
        
        if response.data:
            logging.info(f"✅ Métier mis à jour avec succès: {response.data[0]}")
            return jsonify({
                "success": True,
                "offer": response.data[0]
            }), 200
        else:
            logging.error(f"❌ Échec mise à jour métier: pas de données retournées")
            return jsonify({"success": False, "error": "Erreur lors de la mise à jour"}), 500
        
    except Exception as e:
        logging.error(f"❌ Erreur mise à jour métier partenaire: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@admin_api.route('/partners/<partner_id>/offers/<offer_id>', methods=['DELETE'])
@verify_jwt_token
def delete_partner_offer(partner_id, offer_id):
    """Supprime un métier spécifique d'un partenaire (admin seulement)"""
    try:
        from services.supabase_storage import SupabaseStorage
        
        supabase = SupabaseStorage()
        if not supabase.is_available():
            return jsonify({"success": False, "error": "Supabase indisponible"}), 503
        
        # Vérifier que le métier existe et appartient au partenaire
        offer_response = supabase.client.table('partner_offers').select('*').eq('id', offer_id).eq('partner_id', partner_id).execute()
        if not offer_response.data:
            return jsonify({"success": False, "error": "Métier non trouvé"}), 404
        
        offer = offer_response.data[0]
        
        logging.info(f"Tentative suppression métier {offer_id}: {offer}")
        
        # Supprimer le métier
        response = supabase.client.table('partner_offers').delete().eq('id', offer_id).execute()
        
        if response.data:
            logging.info(f"✅ Métier supprimé avec succès: {response.data[0]}")
            return jsonify({
                "success": True,
                "deleted_offer": response.data[0]
            }), 200
        else:
            logging.error(f"❌ Échec suppression métier: pas de données retournées")
            return jsonify({"success": False, "error": "Erreur lors de la suppression"}), 500
        
    except Exception as e:
        logging.error(f"❌ Erreur suppression métier partenaire: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@admin_api.route('/partners/<partner_id>/connections', methods=['GET'])
@verify_jwt_token
def get_partner_connections(partner_id):
    """Récupère les statistiques de connexions d'un partenaire (admin seulement)"""
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

@admin_api.route('/partners/<partner_id>', methods=['DELETE'])
@verify_jwt_token
def delete_partner(partner_id):
    """Supprimer un partenaire et tous ses métiers associés"""
    try:
        from services.supabase_storage import SupabaseStorage
        
        supabase = SupabaseStorage()
        if not supabase.is_available():
            return jsonify({"success": False, "error": "Supabase indisponible"}), 503
        
        # Vérifier que le partenaire existe
        partner_response = supabase.client.table('partners').select('*').eq('id', partner_id).execute()
        if not partner_response.data:
            return jsonify({"success": False, "error": "Partenaire non trouvé"}), 404
        
        partner = partner_response.data[0]
        
        # Supprimer d'abord tous les métiers associés
        offers_response = supabase.client.table('partner_offers').delete().eq('partner_id', partner_id).execute()
        print(f"🗑️ Métiers supprimés pour le partenaire {partner_id}: {len(offers_response.data or [])}")
        
        # Supprimer les connexions associées
        connections_response = supabase.client.table('partner_offer_tests').delete().eq('partner_id', partner_id).execute()
        print(f"🗑️ Connexions supprimées pour le partenaire {partner_id}: {len(connections_response.data or [])}")
        
        # Supprimer le partenaire
        partner_response = supabase.client.table('partners').delete().eq('id', partner_id).execute()
        
        if partner_response.data:
            return jsonify({
                "success": True,
                "message": "Partenaire et métiers associés supprimés avec succès",
                "deleted_partner": partner_response.data[0]
            }), 200
        else:
            return jsonify({"success": False, "error": "Erreur lors de la suppression du partenaire"}), 500
            
    except Exception as e:
        logging.error(f"Erreur suppression partenaire {partner_id}: {e}")
        return jsonify({"success": False, "error": f"Erreur serveur: {str(e)}"}), 500

# ====================================
# GESTION DES PROMPTS IA
# ====================================

@admin_api.route('/prompts', methods=['GET'])
@verify_jwt_token
def get_all_prompts():
    """Récupère tous les prompts pour l'administration"""
    try:
        from services.ai_service_prompts import get_all_prompts
        
        prompts = get_all_prompts()
        
        if prompts:
            return jsonify({
                "success": True,
                "prompts": prompts
            }), 200
        else:
            return jsonify({
                "success": False,
                "error": "Aucun prompt trouvé"
            }), 404
            
    except Exception as e:
        logging.error(f"Erreur lors de la récupération des prompts: {e}")
        return jsonify({
            "success": False,
            "error": f"Erreur serveur: {str(e)}"
        }), 500

@admin_api.route('/prompts/<service_id>', methods=['GET'])
@verify_jwt_token
def get_prompt(service_id):
    """Récupère un prompt spécifique"""
    try:
        from services.ai_service_prompts import get_prompt
        
        prompt = get_prompt(service_id)
        
        if prompt:
            return jsonify({
                "success": True,
                "prompt": prompt
            }), 200
        else:
            return jsonify({
                "success": False,
                "error": f"Prompt non trouvé pour le service: {service_id}"
            }), 404
            
    except Exception as e:
        logging.error(f"Erreur lors de la récupération du prompt {service_id}: {e}")
        return jsonify({
            "success": False,
            "error": f"Erreur serveur: {str(e)}"
        }), 500

@admin_api.route('/prompts/<service_id>', methods=['PUT'])
@verify_jwt_token
def update_prompt(service_id):
    """Met à jour un prompt"""
    try:
        data = request.get_json()
        if not data or 'prompt' not in data:
            return jsonify({
                "success": False,
                "error": "Contenu du prompt manquant"
            }), 400
        
        new_prompt = data['prompt']
        
        from services.ai_service_prompts import update_prompt
        
        success = update_prompt(service_id, new_prompt)
        
        if success:
            return jsonify({
                "success": True,
                "message": f"Prompt mis à jour avec succès pour {service_id}"
            }), 200
        else:
            return jsonify({
                "success": False,
                "error": f"Impossible de mettre à jour le prompt pour {service_id}"
            }), 500
            
    except Exception as e:
        logging.error(f"Erreur lors de la mise à jour du prompt {service_id}: {e}")
        return jsonify({
            "success": False,
            "error": f"Erreur serveur: {str(e)}"
        }), 500

# ====================================
# GESTION COMPLÈTE DES PARTENAIRES (CRUD)
# ====================================

@admin_api.route('/partners', methods=['GET', 'POST', 'PUT', 'DELETE'])
def admin_partners():
    """Administration des partenaires - CRUD complet"""
    try:
        from services.supabase_storage import SupabaseStorage
        
        supabase = SupabaseStorage()
        if not supabase.is_available():
            return jsonify({"success": False, "error": "Supabase indisponible"}), 503
        
        if request.method == 'GET':
            # Récupérer tous les partenaires (accès public)
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
