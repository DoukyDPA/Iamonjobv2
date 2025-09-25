# backend/routes/api/gdpr_api.py
# API complète pour la gestion des droits RGPD

from flask import Blueprint, request, jsonify, session
from datetime import datetime, timedelta
import json
import logging
from functools import wraps

# Import sécurisé de SupabaseStorage
try:
    from services.supabase_storage import SupabaseStorage
    SUPABASE_AVAILABLE = True
except Exception as e:
    logging.warning(f"SupabaseStorage non disponible: {e}")
    SUPABASE_AVAILABLE = False

# Créer le blueprint
gdpr_api = Blueprint('gdpr_api', __name__)

def require_user_auth(f):
    """Vérifier que l'utilisateur est connecté"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        user_email = session.get('user_email') or session.get('user_id')
        if not user_email:
            return jsonify({"error": "Authentification requise"}), 401
        return f(*args, **kwargs)
    return decorated_function

def require_admin_auth(f):
    """Vérifier que l'utilisateur est admin"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        user_email = session.get('user_email') or session.get('user_id')
        if not user_email:
            return jsonify({"error": "Authentification requise"}), 401
        
        # Vérifier le statut admin dans Supabase
        if not SUPABASE_AVAILABLE:
            return jsonify({"error": "Service Supabase non disponible"}), 503
            
        try:
            supabase = SupabaseStorage()
            response = supabase.client.table('users').select('is_admin').eq('email', user_email).execute()
            if not response.data or not response.data[0].get('is_admin', False):
                return jsonify({"error": "Droits administrateur requis"}), 403
        except Exception as e:
            logging.error(f"Erreur vérification admin: {e}")
            return jsonify({"error": "Erreur de vérification"}), 500
            
        return f(*args, **kwargs)
    return decorated_function

# ====================================
# ENDPOINTS DE TEST
# ====================================

@gdpr_api.route('/gdpr/status', methods=['GET'])
def gdpr_status():
    """Vérifier le statut de l'API GDPR"""
    return jsonify({
        "status": "available",
        "supabase_available": SUPABASE_AVAILABLE,
        "timestamp": datetime.now().isoformat()
    }), 200

# ====================================
# ENDPOINTS UTILISATEUR
# ====================================

@gdpr_api.route('/gdpr/consent', methods=['POST'])
@require_user_auth
def update_consent():
    """Mettre à jour le consentement utilisateur"""
    try:
        if not SUPABASE_AVAILABLE:
            return jsonify({"error": "Service Supabase non disponible"}), 503
            
        data = request.get_json() or {}
        user_email = session.get('user_email') or session.get('user_id')
        
        marketing_consent = data.get('marketing', False)
        analytics_consent = data.get('analytics', False)
        consent_version = data.get('version', '1.0')
        
        supabase = SupabaseStorage()
        
        # Mettre à jour le consentement
        response = supabase.client.table('users').update({
            'marketing_consent': marketing_consent,
            'analytics_consent': analytics_consent,
            'consent_date': datetime.now().isoformat(),
            'consent_version': consent_version
        }).eq('email', user_email).execute()
        
        if response.data:
            logging.info(f"✅ Consentement mis à jour pour {user_email}")
            
            return jsonify({
                "success": True,
                "message": "Consentement mis à jour avec succès",
                "consent": {
                    "marketing": marketing_consent,
                    "analytics": analytics_consent,
                    "date": datetime.now().isoformat(),
                    "version": consent_version
                }
            }), 200
        else:
            return jsonify({"error": "Utilisateur non trouvé"}), 404
        
    except Exception as e:
        logging.error(f"Erreur mise à jour consentement: {e}")
        return jsonify({"error": "Erreur lors de la mise à jour"}), 500

@gdpr_api.route('/gdpr/export', methods=['GET'])
@require_user_auth
def export_user_data():
    """Exporter toutes les données utilisateur (droit de portabilité)"""
    try:
        user_email = session.get('user_email') or session.get('user_id')
        
        supabase = SupabaseStorage()
        
        # Utiliser la fonction SQL pour exporter
        response = supabase.client.rpc('export_user_data_gdpr', {
            'user_email_param': user_email
        }).execute()
        
        if response.data:
            export_data = response.data
            
            logging.info(f"✅ Export RGPD effectué pour {user_email}")
            
            return jsonify({
                "success": True,
                "data": export_data,
                "message": "Export terminé. Ces données vous appartiennent selon le RGPD.",
                "export_info": {
                    "format": "JSON",
                    "date": datetime.now().isoformat(),
                    "gdpr_compliant": True
                }
            }), 200
        else:
            return jsonify({"error": "Aucune donnée trouvée"}), 404
            
    except Exception as e:
        logging.error(f"Erreur export RGPD: {e}")
        return jsonify({"error": f"Erreur lors de l'export: {str(e)}"}), 500

@gdpr_api.route('/gdpr/delete-account', methods=['POST'])
@require_user_auth
def request_account_deletion():
    """Demander la suppression du compte (droit à l'oubli)"""
    try:
        data = request.get_json() or {}
        user_email = session.get('user_email') or session.get('user_id')
        
        # Vérification de sécurité
        confirmation = data.get('confirmation', '').strip()
        if confirmation.lower() != 'supprimer définitivement':
            return jsonify({
                "error": "Confirmation requise",
                "required": "Vous devez taper exactement 'supprimer définitivement'"
            }), 400
        
        supabase = SupabaseStorage()
        
        # Marquer le compte pour suppression (délai de grâce de 30 jours)
        deletion_date = datetime.now() + timedelta(days=30)
        
        response = supabase.client.table('users').update({
            'account_deletion_requested': True,
            'deletion_scheduled_date': deletion_date.isoformat()
        }).eq('email', user_email).execute()
        
        if response.data:
            logging.warning(f"⚠️ Suppression de compte demandée pour {user_email}")
            
            return jsonify({
                "success": True,
                "message": "Demande de suppression enregistrée",
                "deletion_date": deletion_date.isoformat(),
                "grace_period_days": 30,
                "info": "Vous avez 30 jours pour annuler cette demande en vous reconnectant."
            }), 200
        else:
            return jsonify({"error": "Utilisateur non trouvé"}), 404
        
    except Exception as e:
        logging.error(f"Erreur demande suppression: {e}")
        return jsonify({"error": "Erreur lors de la demande"}), 500

@gdpr_api.route('/gdpr/cancel-deletion', methods=['POST'])
@require_user_auth
def cancel_account_deletion():
    """Annuler la demande de suppression du compte"""
    try:
        user_email = session.get('user_email') or session.get('user_id')
        
        supabase = SupabaseStorage()
        
        # Annuler la demande de suppression
        response = supabase.client.table('users').update({
            'account_deletion_requested': False,
            'deletion_scheduled_date': None
        }).eq('email', user_email).execute()
        
        if response.data:
            logging.info(f"✅ Suppression annulée pour {user_email}")
            
            return jsonify({
                "success": True,
                "message": "Demande de suppression annulée avec succès"
            }), 200
        else:
            return jsonify({"error": "Utilisateur non trouvé"}), 404
        
    except Exception as e:
        logging.error(f"Erreur annulation suppression: {e}")
        return jsonify({"error": "Erreur lors de l'annulation"}), 500

@gdpr_api.route('/gdpr/data-summary', methods=['GET'])
@require_user_auth
def get_data_summary():
    """Résumé des données stockées pour l'utilisateur"""
    try:
        user_email = session.get('user_email') or session.get('user_id')
        
        supabase = SupabaseStorage()
        
        # Récupérer les infos depuis la vue GDPR
        user_response = supabase.client.from_('gdpr_consent_status').select('*').eq('email', user_email).execute()
        
        # Récupérer les statistiques d'usage
        sessions_response = supabase.client.table('sessions').select('created_at, updated_at').eq('user_email', user_email).execute()
        tokens_response = supabase.client.table('token_usage').select('tokens_used').eq('user_email', user_email).execute()
        
        if not user_response.data:
            return jsonify({"error": "Utilisateur non trouvé"}), 404
        
        user_info = user_response.data[0]
        sessions_data = sessions_response.data or []
        tokens_data = tokens_response.data or []
        
        # Calculer les statistiques
        total_sessions = len(sessions_data)
        total_tokens = sum(row.get('tokens_used', 0) for row in tokens_data)
        last_activity = max([s.get('updated_at', '') for s in sessions_data], default=user_info.get('member_since', ''))
        
        summary = {
            "user_info": {
                "email": user_info['email'],
                "member_since": user_info['member_since'],
                "consent_date": user_info['consent_date'],
                "marketing_consent": user_info['marketing_consent'],
                "analytics_consent": user_info['analytics_consent'],
                "deletion_requested": user_info['deletion_requested'],
                "consent_status": user_info['consent_status']
            },
            "data_summary": {
                "total_sessions": total_sessions,
                "tokens_consumed": total_tokens,
                "last_activity": last_activity
            },
            "retention_info": {
                "session_data": "Conservées jusqu'à suppression manuelle ou 3 ans d'inactivité",
                "documents": "Analysés puis supprimés immédiatement après traitement",
                "chat_history": "Conservé avec la session utilisateur",
                "usage_logs": "Conservés 2 ans pour la facturation et l'audit"
            }
        }
        
        return jsonify({
            "success": True,
            "data": summary
        }), 200
        
    except Exception as e:
        logging.error(f"Erreur résumé données: {e}")
        return jsonify({"error": "Erreur lors de la récupération"}), 500

# ====================================
# ENDPOINTS ADMIN
# ====================================

@gdpr_api.route('/admin/gdpr/pending-deletions', methods=['GET'])
@require_admin_auth
def get_pending_deletions():
    """Récupérer les comptes en attente de suppression"""
    try:
        supabase = SupabaseStorage()
        
        response = supabase.client.table('users').select(
            'email, deletion_scheduled_date, created_at'
        ).eq('account_deletion_requested', True).execute()
        
        pending = []
        for user in response.data:
            if user['deletion_scheduled_date']:
                deletion_date = datetime.fromisoformat(user['deletion_scheduled_date'].replace('Z', '+00:00'))
                days_remaining = (deletion_date - datetime.now()).days
                
                pending.append({
                    "email": user['email'],
                    "deletion_date": user['deletion_scheduled_date'],
                    "days_remaining": max(0, days_remaining),
                    "member_since": user['created_at']
                })
        
        return jsonify({
            "success": True,
            "pending_deletions": pending,
            "total": len(pending)
        }), 200
        
    except Exception as e:
        logging.error(f"Erreur récupération suppressions: {e}")
        return jsonify({"error": "Erreur serveur"}), 500

@gdpr_api.route('/admin/gdpr/execute-deletion/<user_email>', methods=['DELETE'])
@require_admin_auth
def execute_user_deletion(user_email):
    """Exécuter la suppression définitive d'un utilisateur"""
    try:
        supabase = SupabaseStorage()
        
        # Utiliser la fonction SQL de suppression
        response = supabase.client.rpc('delete_user_data_gdpr', {
            'user_email_param': user_email
        }).execute()
        
        if response.data:
            logging.warning(f"🗑️ SUPPRESSION GDPR EXÉCUTÉE pour {user_email}")
            
            return jsonify({
                "success": True,
                "message": f"Utilisateur {user_email} supprimé définitivement",
                "deletion_timestamp": datetime.now().isoformat()
            }), 200
        else:
            return jsonify({"error": "Échec de la suppression"}), 500
            
    except Exception as e:
        logging.error(f"Erreur exécution suppression: {e}")
        return jsonify({"error": "Erreur lors de la suppression"}), 500

@gdpr_api.route('/admin/gdpr/purge-old-data', methods=['POST'])
@require_admin_auth
def purge_old_data():
    """Purger les anciennes données selon la politique de rétention"""
    try:
        supabase = SupabaseStorage()
        
        # Utiliser la fonction SQL de purge
        response = supabase.client.rpc('purge_old_data').execute()
        
        if response.data is not None:
            purged_count = response.data
            
            logging.info(f"🧹 Purge automatique: {purged_count} enregistrements supprimés")
            
            return jsonify({
                "success": True,
                "message": f"Purge terminée: {purged_count} enregistrements supprimés",
                "purge_timestamp": datetime.now().isoformat()
            }), 200
        else:
            return jsonify({"error": "Échec de la purge"}), 500
            
    except Exception as e:
        logging.error(f"Erreur purge automatique: {e}")
        return jsonify({"error": "Erreur lors de la purge"}), 500

@gdpr_api.route('/admin/gdpr/stats', methods=['GET'])
@require_admin_auth
def get_gdpr_stats():
    """Statistiques RGPD pour l'administration"""
    try:
        supabase = SupabaseStorage()
        
        # Statistiques du consentement
        consent_stats = supabase.client.from_('gdpr_consent_status').select('consent_status').execute()
        
        # Compter par statut
        stats = {}
        for record in consent_stats.data:
            status = record['consent_status']
            stats[status] = stats.get(status, 0) + 1
        
        # Logs récents
        recent_exports = supabase.client.table('export_logs').select('*').order('created_at', desc=True).limit(10).execute()
        recent_deletions = supabase.client.table('deletion_logs').select('*').order('created_at', desc=True).limit(10).execute()
        
        return jsonify({
            "success": True,
            "consent_stats": stats,
            "recent_exports": recent_exports.data,
            "recent_deletions": recent_deletions.data,
            "generated_at": datetime.now().isoformat()
        }), 200
        
    except Exception as e:
        logging.error(f"Erreur stats RGPD: {e}")
        return jsonify({"error": "Erreur lors de la récupération des statistiques"}), 500

# ====================================
# FONCTION D'ENREGISTREMENT
# ====================================

def register_gdpr_routes(app):
    """Enregistrer les routes GDPR dans l'application Flask"""
    app.register_blueprint(gdpr_api, url_prefix='/api')
    logging.info("✅ Routes GDPR enregistrées")
    
    # Ajouter les headers CORS si nécessaire
    @gdpr_api.after_request
    def after_request(response):
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
        response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
        return response
