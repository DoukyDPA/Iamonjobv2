#!/usr/bin/env python3
"""
Service de synchronisation de SERVICES_CONFIG avec la base de données
"""
import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)

class ServicesConfigSync:
    """Synchronise SERVICES_CONFIG avec la base de données"""
    
    def __init__(self):
        self.supabase_client = None
        self._init_supabase()
    
    def _init_supabase(self):
        """Initialise la connexion Supabase"""
        try:
            # Essayer d'abord la méthode config.py
            try:
                import sys
                import os
                
                # Importer config.py directement depuis le répertoire racine
                current_dir = os.path.dirname(__file__)
                root_dir = os.path.dirname(os.path.dirname(current_dir))
                config_path = os.path.join(root_dir, 'config.py')
                
                if os.path.exists(config_path):
                    import importlib.util
                    spec = importlib.util.spec_from_file_location("config", config_path)
                    config_module = importlib.util.module_from_spec(spec)
                    spec.loader.exec_module(config_module)
                    
                    supabase_url = config_module.MIGRATION_CONFIG.get('SUPABASE_URL')
                    supabase_key = config_module.MIGRATION_CONFIG.get('SUPABASE_ANON_KEY')
                else:
                    logger.warning(f"⚠️ Fichier config.py non trouvé: {config_path}")
                    supabase_url = None
                    supabase_key = None
                
                if supabase_url and supabase_key:
                    from supabase import create_client, Client
                    self.supabase_client = create_client(supabase_url, supabase_key)
                    logger.info("✅ Connexion Supabase établie via config.py")
                else:
                    raise ImportError("Variables Supabase manquantes dans config.py")
                    
            except Exception as e:
                logger.warning(f"⚠️ Fallback vers services.supabase_storage: {e}")
                # Fallback vers l'ancien système
                from services.supabase_storage import SupabaseStorage
                supabase_storage = SupabaseStorage()
                self.supabase_client = supabase_storage.client
                logger.info("✅ Connexion Supabase établie via supabase_storage")
                
        except Exception as e:
            logger.error(f"❌ Erreur connexion Supabase: {e}")
            self.supabase_client = None
    
    def sync_services_config(self) -> Dict[str, Any]:
        """Synchronise SERVICES_CONFIG avec la base de données"""
        try:
            if not self.supabase_client:
                return {"error": "Connexion Supabase non disponible"}
            
            # Récupérer tous les services depuis la base
            response = self.supabase_client.table('admin_services_config').select('*').execute()
            
            if not response.data:
                return {"error": "Aucun service trouvé dans la base"}
            
            # Construire la nouvelle config
            new_config = {}
            for service in response.data:
                service_id = service.get('service_id')
                if service_id:
                    new_config[service_id] = {
                        'id': service_id,
                        'title': service.get('title', ''),
                        'theme': service.get('theme', 'general'),
                        'visible': service.get('visible', True),
                        'featured': service.get('featured', False),
                        'requires_cv': service.get('requires_cv', False),
                        'requires_job_offer': service.get('requires_job_offer', False),
                        'requires_questionnaire': service.get('requires_questionnaire', False),
                        'difficulty': service.get('difficulty', 'beginner'),
                        'duration_minutes': service.get('duration_minutes', 5),
                        'coach_advice': service.get('coach_advice', ''),
                        'slug': service.get('slug', service_id)
                    }
            
            # Mettre à jour le fichier SERVICES_CONFIG
            config_updated = self._update_services_config_file(new_config)
            
            return {
                "success": True,
                "services_count": len(new_config),
                "services": list(new_config.keys()),
                "config_updated": config_updated,
                "message": f"Configuration synchronisée avec {len(new_config)} services"
            }
            
        except Exception as e:
            logger.error(f"❌ Erreur synchronisation: {e}")
            return {"error": str(e)}
    
    def _update_services_config_file(self, new_config: Dict[str, Any]) -> bool:
        """Met à jour le fichier SERVICES_CONFIG"""
        try:
            config_file_path = "frontend/src/services/servicesConfig.js"
            
            # Lire le fichier existant
            with open(config_file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Construire le nouveau contenu
            new_content = "// Configuration des services synchronisée automatiquement\n"
            new_content += "// Ne pas modifier manuellement - Utilisez l'admin pour ajouter/modifier\n\n"
            new_content += "export const SERVICES_CONFIG = {\n"
            
            for service_id, service_data in new_config.items():
                new_content += f"  '{service_id}': {{\n"
                for key, value in service_data.items():
                    if isinstance(value, str):
                        new_content += f"    {key}: '{value}',\n"
                    elif isinstance(value, bool):
                        new_content += f"    {key}: {str(value).lower()},\n"
                    else:
                        new_content += f"    {key}: {value},\n"
                new_content += "  },\n"
            
            new_content += "};\n\n"
            new_content += "export const getServiceConfig = (serviceId) => {\n"
            new_content += "  return SERVICES_CONFIG[serviceId] || null;\n"
            new_content += "};\n"
            
            # Écrire le nouveau fichier
            with open(config_file_path, 'w', encoding='utf-8') as f:
                f.write(new_content)
            
            logger.info(f"✅ Fichier {config_file_path} mis à jour")
            return True
            
        except Exception as e:
            logger.error(f"❌ Erreur mise à jour fichier config: {e}")
            return False
    
    def get_missing_services(self) -> Dict[str, Any]:
        """Identifie les services manquants dans SERVICES_CONFIG"""
        try:
            if not self.supabase_client:
                return {"error": "Connexion Supabase non disponible"}
            
            # Récupérer les services de la base
            db_response = self.supabase_client.table('admin_services_config').select('service_id').execute()
            db_services = set(service.get('service_id') for service in (db_response.data or []))
            
            # Récupérer les services de la config actuelle
            try:
                from frontend.src.services.servicesConfig import SERVICES_CONFIG
                config_services = set(SERVICES_CONFIG.keys())
            except ImportError:
                config_services = set()
            
            # Identifier les différences
            missing_in_config = db_services - config_services
            extra_in_config = config_services - db_services
            
            return {
                "success": True,
                "db_services": list(db_services),
                "config_services": list(config_services),
                "missing_in_config": list(missing_in_config),
                "extra_in_config": list(extra_in_config),
                "needs_sync": len(missing_in_config) > 0 or len(extra_in_config) > 0
            }
            
        except Exception as e:
            logger.error(f"❌ Erreur vérification services manquants: {e}")
            return {"error": str(e)}

# Instance globale
services_config_sync = ServicesConfigSync()
