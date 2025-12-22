"""Supabase storage service - Version Hybride & Sécurisée"""
import json
import logging
from datetime import datetime
from typing import Dict, Any, Optional
from supabase import create_client
from flask import session
from config.config_manager import get_config

# Configuration des logs
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
            logger.info("✅ Supabase Storage connecté")
        except Exception as e:
            logger.error(f"❌ Erreur connexion Supabase: {e}")
            self.available = False

    def is_available(self) -> bool:
        return hasattr(self, 'available') and self.available

    def get_user_key(self) -> str:
        """Récupère l'identifiant utilisateur (inchangé)"""
        try:
            from flask import request
            if hasattr(request, 'current_user') and request.current_user:
                return request.current_user.email
            if 'user_email' in session and session['user_email']:
                return session['user_email']
            if 'anonymous_id' not in session:
                session['anonymous_id'] = f"anon_{datetime.now().timestamp()}"
            return session['anonymous_id']
        except Exception:
            return "anonymous"

    # ============================================================
    # CŒUR DU SYSTÈME HYBRIDE
    # ============================================================

    def get_session_data(self) -> Dict[str, Any]:
        """
        Récupère les données et les formate pour le frontend existant.
        Combine l'ancien stockage JSON et les nouvelles tables relationnelles.
        """
        if not self.is_available():
            return self._default_session_data()

        user_key = self.get_user_key()

        try:
            # 1. Récupérer la session principale
            response = self.client.table('sessions').select('*').eq(
                'user_email', user_key
            ).order('updated_at', desc=True).limit(1).execute()

            if not response.data:
                return self._create_new_session(user_key)

            session_row = response.data[0]
            session_id = session_row['id']

            # 2. Récupérer l'historique depuis la NOUVELLE table messages
            # Si vide, on fallback sur l'ancien champ JSONB pour compatibilité
            messages_response = self.client.table('messages')\
                .select('role, content')\
                .eq('session_id', session_id)\
                .order('created_at', asc=True)\
                .execute()

            if messages_response.data:
                # Transformation format relationnel -> format frontend
                chat_history = messages_response.data
            else:
                # Fallback ancien système
                chat_history = session_row.get('chat_history', [])

            # 3. Construction de l'objet de réponse (Format attendu par le Frontend)
            return {
                'user_id': user_key,
                'session_db_id': session_id, # Utile pour les futurs appels
                'chat_history': chat_history,
                'documents': session_row.get('documents', {}), # On garde le JSON pour docs pour l'instant
                'analyses': session_row.get('analyses', {})
            }

        except Exception as e:
            logger.error(f"Erreur lecture session: {e}")
            return self._default_session_data()

    def add_message(self, role: str, content: str) -> bool:
        """
        Nouvelle méthode pour ajouter un message de manière performante.
        Ajoute AUSSI au JSON pour garantir la compatibilité totale si besoin.
        """
        if not self.is_available(): return False
        
        user_key = self.get_user_key()
        
        try:
            # 1. Récupérer ou créer la session
            session_data = self.get_session_data()
            session_id = session_data.get('session_db_id')
            
            # Si pas d'ID (cas rare de création), on doit refaire un lookup
            if not session_id:
                # Logique simplifiée de récupération d'ID...
                pass

            # 2. Écrire dans la table relationnelle (Optimisation)
            if session_id:
                self.client.table('messages').insert({
                    'session_id': session_id,
                    'role': role,
                    'content': content
                }).execute()

            # 3. Mettre à jour le JSON (Sécurité Compatibilité)
            # On continue de mettre à jour le JSON pour l'instant
            current_history = session_data.get('chat_history', [])
            current_history.append({'role': role, 'content': content})
            
            self.client.table('sessions').update({
                'chat_history': current_history,
                'updated_at': datetime.now().isoformat()
            }).eq('user_email', user_key).execute()
            
            return True
        except Exception as e:
            logger.error(f"Erreur ajout message: {e}")
            return False

    def save_session_data(self, data: Dict[str, Any]) -> bool:
        """Compatible avec l'ancien système"""
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
            logger.error(f"Erreur save: {e}")
            return False

    def _default_session_data(self) -> Dict[str, Any]:
        return {
            'user_id': 'anonymous',
            'chat_history': [],
            'documents': {'cv': {'uploaded': False}, 'offre_emploi': {'uploaded': False}},
            'analyses': {},
            'created_at': datetime.now().isoformat()
        }

# Initialisation
_supabase_storage = None
def init_supabase_service(app):
    global _supabase_storage
    _supabase_storage = SupabaseStorage()
    app.supabase = _supabase_storage.client
    return _supabase_storage

def get_session_data(): return _supabase_storage.get_session_data() if _supabase_storage else {}
def save_session_data(data): return _supabase_storage.save_session_data(data) if _supabase_storage else False
