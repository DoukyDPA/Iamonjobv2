# services/cv_analysis_persistence.py
import json
import logging
import hashlib
from datetime import datetime
from services.stateless_manager import StatelessDataManager
from services.ai_service import get_or_create_cv_analysis

class CVAnalysisPersistence:
    @staticmethod
    def get_persistent_analysis(cv_content: str, force_new: bool = False):
        try:
            user_data = StatelessDataManager.get_user_data()
            cv_hash = hashlib.md5(cv_content.encode()).hexdigest()[:12]
            existing = user_data.get('cv_analysis_cache')
            
            if existing and not force_new and existing.get('cv_hash') == cv_hash:
                logging.info("📄 Analyse CV cache trouvée")
                return {
                    'success': True,
                    'analysis': existing['analysis'],
                    'cached': True,
                    'timestamp': existing['timestamp']
                }
            
            # Utiliser la fonction existante
            analysis_result = get_or_create_cv_analysis(cv_content)
            
            # Sauvegarder en cache
            cache_data = {
                'analysis': analysis_result,
                'cv_hash': cv_hash,
                'timestamp': datetime.now().isoformat()
            }
            user_data['cv_analysis_cache'] = cache_data
            StatelessDataManager.save_user_data(user_data)
            
            return {
                'success': True,
                'analysis': analysis_result,
                'cached': False,
                'timestamp': cache_data['timestamp']
            }
            
        except Exception as e:
            logging.error(f"Erreur persistance: {e}")
            return {
                'success': True,
                'analysis': get_or_create_cv_analysis(cv_content),
                'cached': False,
                'error': str(e)
            } 
