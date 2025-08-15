# services/supabase_storage.py
import os
import json
import logging
from datetime import datetime
from typing import Dict, Any, Optional
from supabase import create_client, Client
from flask import session

class SupabaseStorage:
    """
    Service Supabase - Compatible avec votre code existant
    """
    
    def __init__(self):
        url = os.getenv('SUPABASE_URL')
        key = os.getenv('SUPABASE_ANON_KEY')
        
        if not url or not key:
            raise ValueError("⚠️ SUPABASE_URL et SUPABASE_ANON_KEY requis dans les variables d'environnement")
        
        self.client: Client = create_client(url, key)
        self.cache = {}  # Cache local 1 minute
        logging.info("✅ Supabase Storage initialisé")
    
    def get_user_key(self) -> str:
        """Compatible avec votre système actuel"""
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
        user_key = self.get_user_key()
        
        try:
            # Upsert (update ou insert)
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
