#!/usr/bin/env python3
"""
Service de nettoyage automatique des anciennes analyses
"""
import logging
from typing import Dict, Any, Optional
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

class DataCleanupService:
    """Service de nettoyage automatique des données"""
    
    def __init__(self):
        self.supabase_client = None
        self._init_supabase()
    
    def _init_supabase(self):
        """Initialise la connexion Supabase"""
        try:
            from config.app_config import get_supabase_client
            self.supabase_client = get_supabase_client()
            logger.info("✅ Connexion Supabase établie pour le nettoyage")
        except Exception as e:
            logger.error(f"❌ Erreur connexion Supabase: {e}")
    
    def cleanup_old_analyses(self, user_id: str, cleanup_type: str = "all") -> Dict[str, Any]:
        """
        Nettoie les anciennes analyses selon le type de changement
        
        Args:
            user_id: ID de l'utilisateur
            cleanup_type: "cv", "job_offer", "profile", ou "all"
        """
        try:
            if not self.supabase_client:
                return {"error": "Connexion Supabase non disponible"}
            
            cleanup_results = {
                "user_id": user_id,
                "cleanup_type": cleanup_type,
                "deleted_items": {},
                "timestamp": datetime.now().isoformat()
            }
            
            if cleanup_type in ["cv", "all"]:
                cleanup_results["deleted_items"]["cv_analyses"] = self._cleanup_cv_analyses(user_id)
            
            if cleanup_type in ["job_offer", "all"]:
                cleanup_results["deleted_items"]["job_analyses"] = self._cleanup_job_analyses(user_id)
            
            if cleanup_type in ["profile", "all"]:
                cleanup_results["deleted_items"]["profile_data"] = self._cleanup_profile_data(user_id)
            
            # Nettoyer aussi les données temporaires anciennes
            cleanup_results["deleted_items"]["temp_data"] = self._cleanup_temp_data(user_id)
            
            logger.info(f"✅ Nettoyage terminé pour user {user_id}, type: {cleanup_type}")
            return cleanup_results
            
        except Exception as e:
            logger.error(f"❌ Erreur lors du nettoyage: {e}")
            return {"error": str(e)}
    
    def _cleanup_cv_analyses(self, user_id: str) -> Dict[str, Any]:
        """Nettoie les anciennes analyses de CV"""
        try:
            # Supprimer les analyses de CV anciennes
            response = self.supabase_client.table('cv_analyses').delete().eq('user_id', user_id).execute()
            
            # Supprimer aussi les données de compatibilité basées sur l'ancien CV
            response2 = self.supabase_client.table('compatibility_analyses').delete().eq('user_id', user_id).execute()
            
            return {
                "cv_analyses_deleted": len(response.data) if response.data else 0,
                "compatibility_analyses_deleted": len(response2.data) if response2.data else 0
            }
            
        except Exception as e:
            logger.error(f"❌ Erreur nettoyage CV: {e}")
            return {"error": str(e)}
    
    def _cleanup_job_analyses(self, user_id: str) -> Dict[str, Any]:
        """Nettoie les anciennes analyses d'offres d'emploi"""
        try:
            # Supprimer les analyses d'offres
            response = self.supabase_client.table('job_offer_analyses').delete().eq('user_id', user_id).execute()
            
            # Supprimer les analyses de compatibilité CV/Offre
            response2 = self.supabase_client.table('compatibility_analyses').delete().eq('user_id', user_id).execute()
            
            return {
                "job_analyses_deleted": len(response.data) if response.data else 0,
                "compatibility_analyses_deleted": len(response2.data) if response2.data else 0
            }
            
        except Exception as e:
            logger.error(f"❌ Erreur nettoyage offres: {e}")
            return {"error": str(e)}
    
    def _cleanup_profile_data(self, user_id: str) -> Dict[str, Any]:
        """Nettoie les données de profil personnalisées"""
        try:
            # Supprimer les données de profil temporaires
            response = self.supabase_client.table('user_profile_data').delete().eq('user_id', user_id).execute()
            
            return {
                "profile_data_deleted": len(response.data) if response.data else 0
            }
            
        except Exception as e:
            logger.error(f"❌ Erreur nettoyage profil: {e}")
            return {"error": str(e)}
    
    def _cleanup_temp_data(self, user_id: str) -> Dict[str, Any]:
        """Nettoie les données temporaires anciennes"""
        try:
            # Supprimer les données temporaires de plus de 24h
            cutoff_date = datetime.now() - timedelta(hours=24)
            
            # Nettoyer les sessions temporaires
            response = self.supabase_client.table('temp_sessions').delete().eq('user_id', user_id).lt('created_at', cutoff_date.isoformat()).execute()
            
            return {
                "temp_sessions_deleted": len(response.data) if response.data else 0
            }
            
        except Exception as e:
            logger.error(f"❌ Erreur nettoyage données temp: {e}")
            return {"error": str(e)}
    
    def cleanup_by_document_change(self, user_id: str, document_type: str) -> Dict[str, Any]:
        """
        Nettoie automatiquement quand un document change
        
        Args:
            user_id: ID de l'utilisateur
            document_type: "cv", "job_offer", ou "profile"
        """
        cleanup_type = "all" if document_type in ["cv", "job_offer"] else document_type
        return self.cleanup_old_analyses(user_id, cleanup_type)

# Instance globale
data_cleanup_service = DataCleanupService()
