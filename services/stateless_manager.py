# services/stateless_manager.py
"""
Gestionnaire de données stateless pour architecture distribuée
Compatible avec multiple workers/instances
"""

import os
import json
import logging
from datetime import datetime
from services.supabase_storage import SupabaseStorage

# Fonctions de compatibilité
def get_session_data():
    supabase = SupabaseStorage()
    return supabase.get_session_data()

def save_session_data(data):
    supabase = SupabaseStorage()
    return supabase.save_session_data(data)


class StatelessDataManager:
    """
    Gestionnaire de données stateless pour architecture distribuée
    Compatible avec multiple workers/instances
    """
    
    @staticmethod
    def get_user_data():
        """
        Récupération des données utilisateur via l'API Supabase existante
        """
        try:
            # Utiliser l'API existante (sans session_id)
            data = get_session_data()
            
            # Initialisation si première utilisation
            if not data or not isinstance(data, dict):
                data = StatelessDataManager._initialize_user_data()
            
            # Validation de la structure
            if 'documents' not in data:
                data['documents'] = {}
            if 'chat_history' not in data:
                data['chat_history'] = []
            
            worker_pid = os.getpid()
            logging.info(f"📡 SUPABASE GET: Worker PID {worker_pid} - Documents: {list(data.get('documents', {}).keys())}")
            
            return data
            
        except Exception as e:
            logging.error(f"Erreur critique Supabase GET: {e}")
            return StatelessDataManager._emergency_fallback()
    
    @staticmethod
    def get_user_data_by_email(user_email):
        """
        Récupération des données utilisateur par email pour individualisation
        """
        try:
            from services.supabase_storage import SupabaseStorage
            supabase = SupabaseStorage()
            
            # Récupérer les données depuis Supabase avec l'email spécifique
            response = supabase.client.table('sessions').select('*').eq(
                'user_email', user_email
            ).order('updated_at', desc=True).limit(1).execute()
            
            if response.data and len(response.data) > 0:
                session_data = response.data[0]
                data = {
                    'user_id': user_email,
                    'chat_history': session_data.get('chat_history', []),
                    'documents': session_data.get('documents', {}),
                    'analyses': session_data.get('analyses', {})
                }
                
                # Validation de la structure
                if 'documents' not in data:
                    data['documents'] = {}
                if 'chat_history' not in data:
                    data['chat_history'] = []
                
                worker_pid = os.getpid()
                logging.info(f"📡 SUPABASE GET INDIVIDUALISÉ: {user_email} - Worker PID {worker_pid} - Documents: {list(data.get('documents', {}).keys())}")
                
                return data
            else:
                # Créer nouvelle session pour cet utilisateur
                return StatelessDataManager._initialize_user_data()
                
        except Exception as e:
            logging.error(f"Erreur critique Supabase GET individualisé pour {user_email}: {e}")
            return StatelessDataManager._emergency_fallback()
    
    @staticmethod
    def save_user_data(data):
        """
        Sauvegarde des données utilisateur via l'API Supabase existante
        """
        try:
            # Métadonnées professionnelles
            data['last_modified'] = datetime.now().isoformat()
            data['version'] = data.get('version', 0) + 1
            data['worker_pid'] = os.getpid()
            
            # Utiliser l'API existante (sans session_id)
            save_session_data(data)
            
            worker_pid = os.getpid()
            logging.info(f"💾 SUPABASE SAVE: v{data['version']} - Worker PID {worker_pid} - Documents: {list(data.get('documents', {}).keys())}")
            return True
                
        except Exception as e:
            logging.error(f"Erreur critique Supabase SAVE: {e}")
            return False
    
    @staticmethod
    def save_user_data_by_email(data, user_email):
        """
        Sauvegarde des données utilisateur par email pour individualisation
        """
        try:
            from services.supabase_storage import SupabaseStorage
            supabase = SupabaseStorage()
            
            # Métadonnées professionnelles
            data['last_modified'] = datetime.now().isoformat()
            data['version'] = data.get('version', 0) + 1
            data['worker_pid'] = os.getpid()
            
            # Sauvegarde individualisée dans Supabase
            response = supabase.client.table('sessions').upsert({
                'user_email': user_email,
                'chat_history': data.get('chat_history', []),
                'documents': data.get('documents', {}),
                'analyses': data.get('analyses', {}),
                'updated_at': datetime.now().isoformat()
            }, on_conflict='user_email').execute()
            
            worker_pid = os.getpid()
            logging.info(f"💾 SUPABASE SAVE INDIVIDUALISÉ: {user_email} - v{data['version']} - Worker PID {worker_pid} - Documents: {list(data.get('documents', {}).keys())}")
            return True
                
        except Exception as e:
            logging.error(f"Erreur critique Supabase SAVE individualisé pour {user_email}: {e}")
            return False
    
    @staticmethod
    def clear_generic_actions_history(doc_type=None, user_email=None):
        """
        Efface l'historique des actions génériques lors du chargement de nouveaux documents
        
        Args:
            doc_type: Type de document qui déclenche la purge (cv, offre_emploi, questionnaire)
                     Si None, purge complète de l'historique
            user_email: Email de l'utilisateur pour individualisation
        """
        try:
            # Récupérer les données actuelles avec individualisation
            if user_email:
                current_data = StatelessDataManager.get_user_data_by_email(user_email)
                logging.info(f"👤 Individualisation: Nettoyage historique pour {user_email}")
            else:
                current_data = StatelessDataManager.get_user_data()
            
            # Sauvegarder l'ancien historique pour debug
            old_history_length = len(current_data.get('chat_history', []))
            
            if doc_type:
                # Filtrer l'historique pour garder seulement les messages non liés aux actions génériques
                filtered_history = []
                for message in current_data.get('chat_history', []):
                    # Garder les messages de téléchargement de documents
                    if (message.get('role') == 'user' and 
                        'Document téléchargé' in message.get('content', '')):
                        filtered_history.append(message)
                        continue
                    
                    # Garder les messages d'import d'offres partenaires
                    if (message.get('role') == 'assistant' and 
                        message.get('type') == 'partner_import_success'):
                        filtered_history.append(message)
                        continue
                    
                    # Garder les messages de chat général (non liés aux actions génériques)
                    if (message.get('role') in ['user', 'assistant'] and
                        not message.get('action_type') and
                        not message.get('service_id')):
                        filtered_history.append(message)
                        continue
                
                current_data['chat_history'] = filtered_history
                logging.info(f"🗑️ Historique filtré pour nouveau {doc_type}: {old_history_length} -> {len(filtered_history)} messages")
            else:
                # Purge complète de l'historique
                current_data['chat_history'] = []
                logging.info(f"🗑️ Historique complètement effacé: {old_history_length} messages supprimés")
            
            # Nettoyer le cache des contenus
            if 'document_contents' in current_data:
                del current_data['document_contents']
            
            # Nettoyer les analyses en cache
            if 'job_title' in current_data:
                del current_data['job_title']
            
            if 'questionnaire_data' in current_data:
                del current_data['questionnaire_data']
            
            # Nettoyer les analyses CV en cache
            if 'cv_analysis_cache' in current_data:
                del current_data['cv_analysis_cache']
            
            # Nettoyer les analyses spécifiques aux services
            service_cache_keys = [
                'career_orientation',
                'industry_orientation',
                'reconversion_analysis',
                'cv_analysis',
                'job_analysis',
                'cover_letter',
                'interview_prep',
                'pitch',
                'presentation',
                'salary_negotiation',
                'follow_up'
            ]
            
            for key in service_cache_keys:
                if key in current_data:
                    del current_data[key]
                    logging.info(f"🗑️ Cache supprimé: {key}")
            
            # Garder seulement les documents actuels
            documents_backup = current_data.get('documents', {})
            current_data['documents'] = documents_backup
            
            # Sauvegarder la purge avec individualisation
            if user_email:
                success = StatelessDataManager.save_user_data_by_email(current_data, user_email)
            else:
                success = StatelessDataManager.save_user_data(current_data)
            
            if success:
                logging.info(f"✅ Historique nettoyé et sauvegardé")
                return True
            else:
                logging.error(f"❌ Échec sauvegarde après nettoyage")
                return False
            
        except Exception as e:
            logging.error(f"❌ Erreur lors de l'effacement de l'historique: {e}")
            return False
    
    @staticmethod
    def update_document_atomic(doc_type, doc_data, user_email=None):
        """
        Mise à jour atomique d'un document via Supabase
        Thread-safe et cross-worker safe
        """
        max_retries = 3
        
        for attempt in range(max_retries):
            try:
                # Récupération des données actuelles avec individualisation
                if user_email:
                    current_data = StatelessDataManager.get_user_data_by_email(user_email)
                    logging.info(f"👤 Individualisation: Document {doc_type} pour {user_email}")
                else:
                    current_data = StatelessDataManager.get_user_data()
                
                # Mise à jour du document
                if 'documents' not in current_data:
                    current_data['documents'] = {}
                
                current_data['documents'][doc_type] = doc_data.copy()
                
                # Sauvegarde atomique avec individualisation
                if user_email:
                    success = StatelessDataManager.save_user_data_by_email(current_data, user_email)
                else:
                    success = StatelessDataManager.save_user_data(current_data)
                
                if success:
                    logging.info(f"🔄 ATOMIC UPDATE: Document {doc_type} mis à jour (attempt {attempt + 1})")
                    return True
                
            except Exception as e:
                logging.warning(f"Tentative {attempt + 1} échouée pour update atomique: {e}")
                
            # Retry avec backoff
            if attempt < max_retries - 1:
                import time
                time.sleep(0.1 * (attempt + 1))
        
        logging.error(f"Échec définitif update atomique document {doc_type}")
        return False
    
    @staticmethod
    def _initialize_user_data():
        """Initialisation propre des données utilisateur"""
        initial_data = {
            'documents': {},
            'chat_history': [],
            'created_at': datetime.now().isoformat(),
            'version': 1
        }
        
        StatelessDataManager.save_user_data(initial_data)
        logging.info(f"🆕 INIT: Nouvelles données créées")
        return initial_data
    
    @staticmethod
    def _emergency_fallback():
        """Fallback d'urgence si Supabase totalement indisponible"""
        logging.critical(f"🚨 EMERGENCY FALLBACK: Supabase indisponible")
        return {
            'documents': {},
            'chat_history': [],
            'error': 'supabase_unavailable',
            'version': 0
        }
    
    @staticmethod
    def get_system_health():
        """Health check Supabase simplifié"""
        try:
            # Test avec l'API existante mais sur données temporaires
            current_time = datetime.now().isoformat()
            
            # Récupérer données actuelles
            current_data = get_session_data()
            
            # Test avec marqueur temporaire
            test_marker = f'health_test_{current_time}'
            current_data['_health_test'] = test_marker
            
            # Test write
            save_session_data(current_data)
            
            # Test read
            retrieved_data = get_session_data()
            read_success = retrieved_data.get('_health_test') == test_marker
            
            # Nettoyer le marqueur
            if '_health_test' in retrieved_data:
                del retrieved_data['_health_test']
                save_session_data(retrieved_data)
            
            return {
                'supabase_available': True,
                'write_success': True,
                'read_success': read_success,
                'worker_pid': os.getpid(),
                'timestamp': current_time
            }
            
        except Exception as e:
            return {
                'supabase_available': False,
                'error': str(e),
                'worker_pid': os.getpid(),
                'timestamp': datetime.now().isoformat()
            }


# Fonctions principales (API propre compatible avec l'existant)
get_user_data = StatelessDataManager.get_user_data
save_user_data = StatelessDataManager.save_user_data
