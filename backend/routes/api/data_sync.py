"""
API de synchronisation des données entre localStorage et Supabase
Force l'utilisation de Supabase comme source de vérité
"""
import logging
from flask import Blueprint, request, jsonify, session
from services.supabase_storage import SupabaseStorage

# Fonctions de compatibilité
def get_session_data():
    try:
        supabase = SupabaseStorage()
        return supabase.get_session_data()
    except Exception as e:
        logging.warning(f"Impossible d'accéder à Supabase: {e}")
        return {}

def save_session_data(data):
    try:
        supabase = SupabaseStorage()
        return supabase.save_session_data(data)
    except Exception as e:
        logging.warning(f"Impossible de sauvegarder sur Supabase: {e}")
        return False

def migrate_from_localStorage():
    # Migration depuis localStorage vers Supabase
    try:
        supabase = SupabaseStorage()
        # Logique de migration si nécessaire
        return True
    except Exception as e:
        logging.warning(f"Impossible de migrer vers Supabase: {e}")
        return False
import logging
import json

data_sync_api = Blueprint('data_sync', __name__)

@data_sync_api.route('/sync/push', methods=['POST'])
def push_to_supabase():
    """
    Pousse les données du localStorage vers Supabase
    Appelé au chargement de la page
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'success': False, 'error': 'Pas de données'}), 400
        
        # Récupérer les données localStorage envoyées par le frontend
        local_storage_data = data.get('localStorage_data', {})
        
        if local_storage_data:
            # Migrer vers Supabase
            success = migrate_from_localStorage(local_storage_data)
            
            if success:
                logging.info("✅ Synchronisation localStorage -> Supabase réussie")
                return jsonify({
                    'success': True,
                    'message': 'Données synchronisées avec le serveur'
                }), 200
            else:
                return jsonify({
                    'success': False,
                    'error': 'Échec de la synchronisation'
                }), 500
        
        return jsonify({
            'success': True,
            'message': 'Pas de données à synchroniser'
        }), 200
        
    except Exception as e:
        logging.error(f"Erreur sync push: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@data_sync_api.route('/sync/pull', methods=['GET'])
def pull_from_supabase():
    """
    Récupère les données depuis Supabase
    Pour remplacer le localStorage
    """
    try:
        # Récupérer depuis Supabase
        supabase_data = get_session_data()
        
        return jsonify({
            'success': True,
            'data': supabase_data,
            'source': 'supabase'
        }), 200
        
    except Exception as e:
        logging.error(f"Erreur sync pull: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@data_sync_api.route('/sync/check', methods=['GET'])
def check_sync_status():
    """
    Vérifie l'état de synchronisation
    """
    try:
        # Utiliser nos fonctions sécurisées au lieu d'instancier directement
        try:
            # Test simple de disponibilité
            current_data = get_session_data()
            supabase_available = True
            supabase_status = "connected"
        except Exception as data_error:
            logging.warning(f"Supabase non disponible: {data_error}")
            supabase_available = False
            supabase_status = "not_configured"
            current_data = {}
        
        return jsonify({
            'success': True,
            'supabase': {
                'available': supabase_available,
                'status': supabase_status
            },
            'data': {
                'has_history': len(current_data.get('chat_history', [])) > 0,
                'documents': current_data.get('documents', {}),
                'message_count': len(current_data.get('chat_history', []))
            }
        }), 200
        
    except Exception as e:
        logging.error(f"Erreur check sync: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@data_sync_api.route('/sync/force-supabase', methods=['POST'])
def force_supabase_usage():
    """
    Force l'utilisation de Supabase et désactive le localStorage
    """
    try:
        # Marquer dans la session qu'on veut forcer Supabase
        session['force_supabase'] = True
        session['disable_localStorage'] = True
        session.permanent = True
        
        return jsonify({
            'success': True,
            'message': 'Supabase forcé, localStorage désactivé'
        }), 200
        
    except Exception as e:
        logging.error(f"Erreur force supabase: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

# À ajouter dans app.py:
# from backend.routes.api.data_sync import data_sync_api
# app.register_blueprint(data_sync_api, url_prefix='/api/data') 
