"""Supabase storage service using environment configuration."""

import json
import logging
from datetime import datetime
from typing import Dict, Any, Optional

from supabase import create_client, Client
from flask import session

from config.config_manager import get_config

class SupabaseStorage:
    """
    Service Supabase - Compatible avec votre code existant
    """
    
    def __init__(self):
        """Initialise le client Supabase à partir du ConfigManager."""
        url = get_config('SUPABASE_URL')
        key = get_config('SUPABASE_ANON_KEY')

        logging.info("🔧 Initialisation Supabase via ConfigManager")
        if url and key:
            logging.info("✅ Variables Supabase détectées")
        else:
            logging.warning("⚠️ Variables Supabase manquantes")

        if not url or not key:
            self.available = False
            self.client = None
            self.cache = {}
            logging.error("❌ SUPABASE_URL et SUPABASE_ANON_KEY manquants - mode dégradé")
            return

        try:
            self.client = create_client(url, key)
            self.cache = {}  # Cache local 1 minute
            self.available = True
            logging.info("✅ Supabase Storage initialisé avec succès")

            # Test de connexion
            try:
                response = self.client.table('partners').select('id').limit(1).execute()
                logging.info("✅ Test de connexion Supabase réussi")
            except Exception as test_error:
                logging.warning(f"⚠️ Test de connexion échoué: {test_error}")
                # Ne pas marquer comme indisponible pour un test échoué

        except Exception as e:
            logging.error(f"❌ Erreur init Supabase: {e}")
            self.available = False
            self.client = None
    
    def is_available(self) -> bool:
        """Vérifie si Supabase est disponible"""
        return hasattr(self, 'available') and self.available
    
    def get_user_key(self) -> str:
        """Récupère la clé utilisateur depuis le token JWT ou la session"""
        try:
            # Essayer de récupérer depuis Flask request (si disponible)
            from flask import request
            if hasattr(request, 'current_user') and request.current_user:
                return request.current_user.email
            
            # Fallback sur la session Flask (pour compatibilité)
            if 'user_email' in session and session['user_email']:
                return session['user_email']
            elif 'user_id' in session and session['user_id']:
                return session['user_id']
            else:
                # Générer un ID unique pour les anonymes
                if 'anonymous_id' not in session:
                    session['anonymous_id'] = f"anon_{datetime.now().timestamp()}"
                return session['anonymous_id']
        except Exception as e:
            logging.warning(f"Erreur lors de la récupération de la clé utilisateur: {e}")
            # Fallback sur la session Flask
            if 'user_email' in session and session['user_email']:
                return session['user_email']
            elif 'user_id' in session and session['user_id']:
                return session['user_id']
            else:
                # Générer un ID unique pour les anonymes
                if 'anonymous_id' not in session:
                    session['anonymous_id'] = f"anon_{datetime.now().timestamp()}"
                return session['anonymous_id']
    
    def get_session_data(self) -> Dict[str, Any]:
        """
        Récupération des données de session
        API identique pour compatibilité
        """
        if not self.is_available():
            logging.warning("Supabase non disponible - retour données par défaut")
            return self._default_session_data()
            
        user_key = self.get_user_key()
        
        try:
            # Chercher la session
            response = self.client.table('sessions').select('*').eq(
                'user_email', user_key
            ).order('updated_at', desc=True).limit(1).execute()
            
            if response.data and len(response.data) > 0:
                session_data = response.data[0]
                return {
                    'user_id': user_key,
                    'chat_history': session_data.get('chat_history', []),
                    'documents': session_data.get('documents', {}),
                    'analyses': session_data.get('analyses', {})
                }
            else:
                # Créer nouvelle session
                return self._create_new_session(user_key)
                
        except Exception as e:
            logging.error(f"Erreur Supabase get: {e}")
            return self._default_session_data()
    
    def save_session_data(self, data: Dict[str, Any]) -> bool:
        """
        Sauvegarde des données de session
        API identique pour compatibilité
        """
        if not self.is_available():
            logging.warning("Supabase non disponible - sauvegarde impossible")
            return False
            
        user_key = self.get_user_key()
        
        try:
            # Upsert (update ou insert) - utiliser la colonne unique user_email
            response = self.client.table('sessions').upsert({
                'user_email': user_key,
                'chat_history': data.get('chat_history', []),
                'documents': data.get('documents', {}),
                'analyses': data.get('analyses', {}),
                'updated_at': datetime.now().isoformat()
            }, on_conflict='user_email').execute()
            
            logging.info(f"✅ Session sauvegardée pour {user_key}")
            return True
            
        except Exception as e:
            logging.error(f"❌ Erreur Supabase save: {e}")
            return False
    
    # ====================================
    # MÉTHODES DE COMPATIBILITÉ
    # ====================================
    
    def get(self, key: str) -> Optional[str]:
        """
        Récupère une valeur par clé
        Compatible avec l'ancien système
        """
        try:
            # Analyser la clé pour déterminer le type de données
            if key.startswith('user_data:'):
                # Données utilisateur - utiliser la session
                return json.dumps(self.get_session_data())
            elif key == 'partner_companies':
                # Partenaires - récupérer depuis la table partners
                response = self.client.table('partners').select('*').execute()
                if response.data:
                    return json.dumps(response.data)
                return None
            else:
                # Clé générique - chercher dans sessions
                response = self.client.table('sessions').select('*').eq('user_email', key).execute()
                if response.data:
                    return json.dumps(response.data[0])
                return None
                
        except Exception as e:
            logging.error(f"Erreur Supabase get({key}): {e}")
            return None
    
    def set(self, key: str, value: str) -> bool:
        """
        Définit une valeur par clé
        Compatible avec l'ancien système
        """
        try:
            if key.startswith('user_data:'):
                # Données utilisateur - sauvegarder dans sessions
                data = json.loads(value) if isinstance(value, str) else value
                return self.save_session_data(data)
            elif key == 'partner_companies':
                # Partenaires - sauvegarder dans table partners
                partners_data = json.loads(value) if isinstance(value, str) else value
                response = self.client.table('partners').upsert(partners_data).execute()
                return True
            else:
                # Clé générique - sauvegarder dans sessions
                data = json.loads(value) if isinstance(value, str) else value
                return self.save_session_data(data)
                
        except Exception as e:
            logging.error(f"Erreur Supabase set({key}): {e}")
            return False
    
    def keys(self, pattern: str) -> list:
        """
        Liste les clés selon un pattern
        Compatible avec l'ancien système
        """
        try:
            if pattern == 'user_data:*':
                # Lister toutes les sessions utilisateur
                response = self.client.table('sessions').select('user_email').execute()
                return [f"user_data:{row['user_email']}" for row in response.data] if response.data else []
            elif pattern == 'partner_companies':
                # Clé unique pour partenaires
                return ['partner_companies']
            else:
                # Pattern générique
                return []
                
        except Exception as e:
            logging.error(f"Erreur Supabase keys({pattern}): {e}")
            return []
    
    def _create_new_session(self, user_key: str) -> Dict[str, Any]:
        """Créer une nouvelle session"""
        default_data = self._default_session_data()
        
        try:
            self.client.table('sessions').insert({
                'user_email': user_key,
                'chat_history': [],
                'documents': default_data['documents'],
                'analyses': {}
            }).execute()
        except:
            pass  # Peut déjà exister
        
        return default_data
    
    def _default_session_data(self) -> Dict[str, Any]:
        """Structure par défaut des données"""
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
    
    # Méthodes additionnelles pour tokens
    def get_user_tokens(self, user_email: str, date: str = None) -> int:
        """Récupérer l'usage de tokens"""
        if not date:
            date = datetime.now().date().isoformat()
        
        try:
            response = self.client.table('token_usage').select('tokens_used').eq(
                'user_email', user_email
            ).eq('date', date).execute()
            
            if response.data:
                return response.data[0]['tokens_used']
            return 0
        except:
            return 0
    
    def update_user_tokens(self, user_email: str, tokens: int) -> bool:
        """Mettre à jour l'usage de tokens"""
        date = datetime.now().date().isoformat()
        
        try:
            # Upsert avec addition
            current = self.get_user_tokens(user_email, date)
            
            self.client.table('token_usage').upsert({
                'user_email': user_email,
                'date': date,
                'tokens_used': current + tokens
            }, on_conflict='user_email,date').execute()
            
            return True
        except:
            return False

# Instance globale du service
_supabase_storage = None

def init_supabase_service(app):
    """Initialiser le service Supabase"""
    global _supabase_storage
    
    try:
        _supabase_storage = SupabaseStorage()
        
        # Exposer le client Supabase dans l'application Flask
        app.supabase = _supabase_storage.client
        
        app.logger.info("✅ Supabase service initialisé")
        return _supabase_storage
    except Exception as e:
        app.logger.error(f"❌ Erreur init Supabase: {e}")
        return None

def get_session_data():
    """API compatible avec votre code existant"""
    if _supabase_storage:
        return _supabase_storage.get_session_data()
    return {}

def save_session_data(data):
    """API compatible avec votre code existant"""
    if _supabase_storage:
        return _supabase_storage.save_session_data(data)
    return False
