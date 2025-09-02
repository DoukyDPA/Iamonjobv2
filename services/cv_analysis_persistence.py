# services/cv_analysis_persistence.py
import json
import logging
import hashlib
from datetime import datetime
from services.stateless_manager import StatelessDataManager
# Import supprimé - utilise maintenant le système Mistral via ai_service_prompts

class CVAnalysisPersistence:
    @staticmethod
    def clear_cache(user_email=None):
        """Efface le cache d'analyse CV"""
        try:
            user_data = StatelessDataManager.get_user_data()
            if 'cv_analysis_cache' in user_data:
                del user_data['cv_analysis_cache']
                StatelessDataManager.save_user_data(user_data)
                logging.info("🗑️ Cache CV effacé")
                return True
        except Exception as e:
            logging.error(f"❌ Erreur effacement cache CV: {e}")
            return False
    
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
            
            # Utiliser directement Mistral pour éviter la récursion
            from services.ai_service_mistral import analyze_cv_with_ai
            analysis_result = analyze_cv_with_ai(cv_content)
            
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
            # En cas d'erreur, utiliser directement Mistral
            from services.ai_service_mistral import analyze_cv_with_ai
            analysis_result = analyze_cv_with_ai(cv_content)
            return {
                'success': True,
                'analysis': analysis_result,
                'cached': False,
                'error': str(e)
            } 
