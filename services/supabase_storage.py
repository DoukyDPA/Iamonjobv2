"""Supabase storage service - Version Hybride & Corrigée"""
import json
import logging
from datetime import datetime
from typing import Dict, Any, Optional
from supabase import create_client
from flask import session
from config.config_manager import get_config

# Configuration des logs
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class SupabaseStorage:
    def __init__(self):
        url = get_config('SUPABASE_URL')
        key = get_config('SUPABASE_ANON_KEY')

        if not url or not key:
            self.available = False
            self.client = None
            logger.error("❌ Configuration Supabase manquante")
            return

        try:
            self.client = create_client(url, key)
            self.available = True
            # logger.info("✅ Supabase Storage connecté")
        except Exception as e:
            logger.error(f"❌ Erreur connexion Supabase: {e}")
            self.available = False

    def is_available(self) -> bool:
        return hasattr(self, 'available') and self.available

    def get_user_key(self) -> str:
        """
        Récupère l'identifiant utilisateur.
        CORRECTION : Restauration de la logique complète pour ne pas perdre la session.
        """
        try:
            # 1. Essayer depuis Flask request (si injecté par middleware)
            from flask import request
            if hasattr(request, 'current_user') and request.current_user:
                return request.current_user.email
            
            # 2. Vérifier la session Flask (Ordre précis important pour compatibilité)
            if 'user_email' in session and session['user_email']:
                return session['user_email']
            elif 'user_id' in session and session['user_id']:
                # C'était la ligne manquante qui causait la perte de session !
                return session['user_id']
            
            # 3. Générer/Récupérer un ID anonyme
            if 'anonymous_id' not in session:
                session['anonymous_id'] = f"anon_{datetime.now().timestamp()}"
            return session['anonymous_id']
            
        except Exception as e:
            logger.warning(f"⚠️ Erreur user_key fallback: {e}")
            return "anonymous"

    def get_session_data(self) -> Dict[str, Any]:
        """Récupération hybride (JSON + SQL Relationnel)"""
        if not self.is_available():
            return self._default_session_data()

        user_key = self.get_user_key()
        
        try:
            # 1. Récupérer la session
            response = self.client.table('sessions').select('*').eq(
                'user_email', user_key
            ).order('updated_at', desc=True).limit(1).execute()
            
            if response.data and len(response.data) > 0:
                session_row = response.data[0]
                session_id = session_row['id']
                
                # 2. Tenter de récupérer l'historique depuis la table 'messages' (V2)
                try:
                    messages_res = self.client.table('messages')\
                        .select('role, content')\
                        .eq('session_id', session_id)\
                        .order('created_at', asc=True)\
                        .execute()
                    
                    chat_history = messages_res.data if messages_res.data else session_row.get('chat_history', [])
                except:
                    # Fallback si la table messages n'est pas encore utilisée/peuplée
                    chat_history = session_row.get('chat_history', [])

                return {
                    'user_id': user_key,
                    'session_db_id': session_id,
                    'chat_history': chat_history,
                    'documents': session_row.get('documents', {}),
                    'analyses': session_row.get('analyses', {})
                }
            else:
                # Créer nouvelle session si inexistante
                return self._create_new_session(user_key)
                
        except Exception as e:
            logger.error(f"Erreur Supabase get: {e}")
            return self._default_session_data()

    def add_message(self, role: str, content: str) -> bool:
        """Ajoute un message (Compatible V1 et V2)"""
        if not self.is_available(): return False
        user_key = self.get_user_key()
        
        try:
            # Récupérer l'ID de session
            session_data = self.get_session_data()
            session_id = session_data.get('session_db_id')
            
            # 1. Sauvegarde Relationnelle (V2)
            if session_id:
                try:
                    self.client.table('messages').insert({
                        'session_id': session_id,
                        'role': role,
                        'content': content
                    }).execute()
                except Exception as sql_e:
                    logger.warning(f"Erreur insertion message SQL: {sql_e}")

            # 2. Sauvegarde JSON (V1 - Pour compatibilité frontend immédiate)
            # On met à jour le champ JSON pour que le frontend actuel continue de marcher
            current_history = session_data.get('chat_history', [])
            current_history.append({'role': role, 'content': content})
            
            self.client.table('sessions').upsert({
                'user_email': user_key,
                'chat_history': current_history,
                'updated_at': datetime.now().isoformat()
            }, on_conflict='user_email').execute()
            
            return True
        except Exception as e:
            logger.error(f"Erreur add_message: {e}")
            return False

    def save_session_data(self, data: Dict[str, Any]) -> bool:
        """Sauvegarde complète (Pour les documents et analyses)"""
        if not self.is_available(): return False
        user_key = self.get_user_key()
        
        try:
            self.client.table('sessions').upsert({
                'user_email': user_key,
                'chat_history': data.get('chat_history', []),
                'documents': data.get('documents', {}),
                'analyses': data.get('analyses', {}),
                'updated_at': datetime.now().isoformat()
            }, on_conflict='user_email').execute()
            return True
        except Exception as e:
            logger.error(f"Erreur save_session_data: {e}")
            return False

    def _create_new_session(self, user_key: str) -> Dict[str, Any]:
        default_data = self._default_session_data()
        try:
            res = self.client.table('sessions').insert({
                'user_email': user_key,
                'chat_history': [],
                'documents': default_data['documents'],
                'analyses': {}
            }).execute()
            # Retourner avec l'ID fraîchement créé
            if res.data:
                default_data['session_db_id'] = res.data[0]['id']
        except:
            pass
        return default_data

    def _default_session_data(self) -> Dict[str, Any]:
        """Structure par défaut (Restaurée à l'identique pour le frontend)"""
        return {
            'user_id': 'anonymous',
            'chat_history': [],
            'documents': {
                'cv': {'uploaded': False, 'name': None},
                'offre_emploi': {'uploaded': False, 'name': None}
            },
            'analyses': {},
            'created_at': datetime.now().isoformat()
        }

# ==========================================
# FONCTIONS D'INTERFACE (Globales)
# ==========================================

_supabase_storage = None

def init_supabase_service(app):
    global _supabase_storage
    _supabase_storage = SupabaseStorage()
    app.supabase = _supabase_storage.client
    return _supabase_storage

def get_session_data():
    if _supabase_storage:
        return _supabase_storage.get_session_data()
    return {}

def save_session_data(data):
    if _supabase_storage:
        return _supabase_storage.save_session_data(data)
    return False
