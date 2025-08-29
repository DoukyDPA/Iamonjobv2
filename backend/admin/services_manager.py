#!/usr/bin/env python3
"""
Gestionnaire de services avec persistance dans Supabase
Utilise directement la table sessions avec une clé spéciale pour l'admin
"""

import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional

class ServicesManager:
    """Gestionnaire centralisé des services avec persistance Supabase"""
    
    def __init__(self):
        # Clé spéciale pour stocker la config admin dans sessions
        self.ADMIN_KEY = 'admin_services_config'
        
        # Charger la configuration depuis Supabase ou initialiser
        self.services_config = self._load_config()
        
        # Sauvegarder pour s'assurer que la config existe dans Supabase
        if not self.services_config:
            self.services_config = self._get_default_config()
            self._save_config()
        
        logging.info(f"ServicesManager initialisé avec {len(self.services_config)} services")
    
    def _get_supabase_client(self):
        """Obtient le client Supabase"""
        try:
            from services.supabase_storage import SupabaseStorage
            supabase = SupabaseStorage()
            return supabase.client
        except Exception as e:
            logging.error(f"Erreur connexion Supabase: {e}")
            return None
    
    def _load_config(self) -> Dict:
        """Charge la configuration depuis Supabase"""
        try:
            client = self._get_supabase_client()
            if not client:
                return self._get_default_config()
            
            # Récupérer la configuration depuis la table sessions
            response = client.table('sessions').select('*').eq(
                'user_email', self.ADMIN_KEY
            ).execute()
            
            if response.data and len(response.data) > 0:
                session_data = response.data[0]
                # La config est stockée dans le champ 'documents'
                config_data = session_data.get('documents', {})
                
                if config_data and 'services' in config_data:
                    logging.info(f"Configuration chargée depuis Supabase: {len(config_data['services'])} services")
                    return config_data['services']
                else:
                    logging.info("Aucune configuration de services trouvée, utilisation config par défaut")
                    return self._get_default_config()
            else:
                logging.info("Aucune entrée admin trouvée dans Supabase, création...")
                return self._get_default_config()
                
        except Exception as e:
            logging.error(f"Erreur lors du chargement depuis Supabase: {e}")
            return self._get_default_config()
    
    def _save_config(self) -> bool:
        """Sauvegarde la configuration dans Supabase"""
        try:
            client = self._get_supabase_client()
            if not client:
                logging.error("Client Supabase non disponible")
                return False
            
            # Préparer les données pour Supabase
            data_to_save = {
                'user_email': self.ADMIN_KEY,
                'chat_history': [],
                'documents': {
                    'services': self.services_config,
                    'updated_at': datetime.now().isoformat()
                },
                'analyses': {},
                'updated_at': datetime.now().isoformat()
            }
            
            # Upsert dans la table sessions
            response = client.table('sessions').upsert(
                data_to_save,
                on_conflict='user_email'
            ).execute()
            
            if response.data:
                logging.info(f"✅ Configuration sauvegardée dans Supabase: {len(self.services_config)} services")
                return True
            else:
                logging.error("❌ Échec de la sauvegarde dans Supabase - pas de données retournées")
                return False
                
        except Exception as e:
            logging.error(f"❌ Erreur lors de la sauvegarde dans Supabase: {e}")
            return False
    
    def _get_default_config(self) -> Dict:
        """Configuration par défaut des services"""
        return {
            'analyze_cv': {
                'id': 'analyze_cv',
                'title': 'Analyse de CV',
                'coach_advice': 'Laissez notre IA analyser votre CV et obtenir des recommandations personnalisées',
                'theme': 'optimize_profile',
                'requires_cv': True,
                'requires_job_offer': False,
                'requires_questionnaire': False,
                'visible': True,
                'featured': False,
                'difficulty': 'beginner',
                'duration_minutes': 5
            },
            'cv_offer_compatibility': {
                'id': 'cv_offer_compatibility',
                'title': 'Compatibilité CV-Offre',
                'coach_advice': 'Découvrez votre taux de compatibilité avec une offre d\'emploi',
                'theme': 'evaluate_offer',
                'requires_cv': True,
                'requires_job_offer': True,
                'requires_questionnaire': False,
                'visible': True,
                'featured': False,
                'difficulty': 'intermediate',
                'duration_minutes': 7
            },
            'generate_cover_letter': {
                'id': 'generate_cover_letter',
                'title': 'Lettre de motivation',
                'coach_advice': 'Générez une lettre de motivation personnalisée et percutante',
                'theme': 'apply_jobs',
                'requires_cv': True,
                'requires_job_offer': True,
                'requires_questionnaire': False,
                'visible': True,
                'featured': False,
                'difficulty': 'intermediate',
                'duration_minutes': 10
            },
            'prepare_interview': {
                'id': 'prepare_interview',
                'title': 'Préparation entretien',
                'coach_advice': 'Préparez-vous avec des questions personnalisées et des conseils ciblés',
                'theme': 'interview_tips',
                'requires_cv': False,
                'requires_job_offer': True,
                'requires_questionnaire': False,
                'visible': True,
                'featured': False,
                'difficulty': 'advanced',
                'duration_minutes': 15
            },
            'linkedin_optimization': {
                'id': 'linkedin_optimization',
                'title': 'Optimisation LinkedIn',
                'coach_advice': 'Optimisez votre profil LinkedIn pour maximiser votre visibilité',
                'theme': 'networking',
                'requires_cv': True,
                'requires_job_offer': False,
                'requires_questionnaire': False,
                'visible': True,
                'featured': False,
                'difficulty': 'intermediate',
                'duration_minutes': 10
            },
            'salary_negotiation': {
                'id': 'salary_negotiation',
                'title': 'Négociation salariale',
                'coach_advice': 'Apprenez les techniques pour négocier votre salaire efficacement',
                'theme': 'interview_tips',
                'requires_cv': False,
                'requires_job_offer': True,
                'requires_questionnaire': True,
                'visible': True,
                'featured': False,
                'difficulty': 'advanced',
                'duration_minutes': 10
            }
        }
    
    def get_all_services(self) -> Dict:
        """Retourne tous les services"""
        # Recharger depuis Supabase pour avoir les dernières données
        self.services_config = self._load_config()
        return self.services_config
    
    def get_visible_services(self) -> Dict:
        """Retourne uniquement les services visibles"""
        # Recharger depuis Supabase
        self.services_config = self._load_config()
        return {
            sid: service for sid, service in self.services_config.items()
            if service.get('visible', False)
        }
    
    def get_service(self, service_id: str) -> Optional[Dict]:
        """Retourne un service spécifique"""
        return self.services_config.get(service_id)
    
    def get_services_by_theme(self) -> Dict[str, List[Dict]]:
        """Retourne les services groupés par thème"""
        themes = {}
        for service in self.get_visible_services().values():
            theme = service.get('theme', 'other')
            if theme not in themes:
                themes[theme] = []
            themes[theme].append(service)
        return themes
    
    def get_featured_service(self) -> Optional[Dict]:
        """Retourne le service mis en avant s'il existe"""
        for service in self.services_config.values():
            if service.get('featured', False):
                # Vérifier si la mise en avant n'a pas expiré
                featured_until = service.get('featured_until')
                if featured_until:
                    if datetime.fromisoformat(featured_until) < datetime.now():
                        service['featured'] = False
                        service['featured_until'] = None
                        self._save_config()
                        continue
                return service
        return None
    
    def set_service_visibility(self, service_id: str, visible: bool) -> bool:
        """Active ou désactive un service"""
        if service_id in self.services_config:
            self.services_config[service_id]['visible'] = visible
            success = self._save_config()
            if success:
                logging.info(f"Service {service_id} {'activé' if visible else 'désactivé'}")
            return success
        return False
    
    def set_featured_service(self, service_id: str, featured_title: str = None, duration_days: int = 30) -> bool:
        """Met un service en avant"""
        # D'abord retirer toute mise en avant existante
        for service in self.services_config.values():
            service['featured'] = False
            service['featured_until'] = None
            service['featured_title'] = None
        
        # Mettre en avant le nouveau service
        if service_id in self.services_config:
            featured_until = (datetime.now() + timedelta(days=duration_days)).isoformat()
            
            self.services_config[service_id].update({
                'featured': True,
                'featured_until': featured_until,
                'featured_title': featured_title or self.services_config[service_id]['title']
            })
            
            success = self._save_config()
            if success:
                logging.info(f"Service {service_id} mis en avant jusqu'au {featured_until}")
            return success
        return False
    
    def clear_featured_service(self) -> bool:
        """Retire la mise en avant"""
        changed = False
        for service in self.services_config.values():
            if service.get('featured', False):
                service['featured'] = False
                service['featured_until'] = None 
                service['featured_title'] = None
                changed = True
        
        if changed:
            success = self._save_config()
            if success:
                logging.info("Mise en avant supprimée")
            return success
        return False
    
    def add_new_service(self, service_config: Dict) -> bool:
        """Ajoute un nouveau service avec persistance dans Supabase"""
        service_id = service_config.get('id')
        if not service_id:
            logging.error("ID du service manquant")
            return False
        
        # Recharger la config pour éviter les conflits
        self.services_config = self._load_config()
        
        # Vérifier si le service existe déjà
        if service_id in self.services_config:
            logging.warning(f"Le service {service_id} existe déjà")
            return False
            
        # Configuration par défaut
        default_config = {
            'visible': False,  # Nouveau service invisible par défaut
            'featured': False,
            'featured_until': None,
            'featured_title': None,
            'requires_cv': False,
            'requires_job_offer': False,
            'requires_questionnaire': False,
            'difficulty': 'beginner',
            'duration_minutes': 5,
            'theme': 'apply_jobs',
            'created_at': datetime.now().isoformat(),
            'updated_at': datetime.now().isoformat()
        }
        
        # Fusionner avec la config fournie
        final_config = {**default_config, **service_config}
        self.services_config[service_id] = final_config
        
        # Sauvegarder immédiatement dans Supabase
        success = self._save_config()
        if success:
            logging.info(f"✅ Nouveau service ajouté et sauvegardé dans Supabase: {service_id}")
            # Log pour debug
            logging.info(f"Config actuelle: {len(self.services_config)} services")
            logging.info(f"Services: {list(self.services_config.keys())}")
        else:
            # En cas d'échec, retirer le service de la mémoire
            del self.services_config[service_id]
            logging.error(f"❌ Échec de la sauvegarde du service {service_id} dans Supabase")
        
        return success
    
    def update_service(self, service_id: str, updates: Dict) -> bool:
        """Met à jour un service existant"""
        # Recharger la config pour avoir les dernières données
        self.services_config = self._load_config()
        
        if service_id not in self.services_config:
            logging.error(f"Service {service_id} introuvable")
            return False
        
        # Mettre à jour les champs
        self.services_config[service_id].update(updates)
        self.services_config[service_id]['updated_at'] = datetime.now().isoformat()
        
        # Sauvegarder dans Supabase
        success = self._save_config()
        if success:
            logging.info(f"Service {service_id} mis à jour dans Supabase")
        return success
    
    def delete_service(self, service_id: str) -> bool:
        """Supprime un service"""
        # Recharger la config
        self.services_config = self._load_config()
        
        if service_id not in self.services_config:
            logging.error(f"Service {service_id} introuvable")
            return False
        
        del self.services_config[service_id]
        
        # Sauvegarder dans Supabase
        success = self._save_config()
        if success:
            logging.info(f"Service {service_id} supprimé de Supabase")
        return success
    
    def refresh_from_supabase(self):
        """Force le rechargement depuis Supabase"""
        self.services_config = self._load_config()
        logging.info("Configuration rechargée depuis Supabase")

# Instance globale
services_manager = ServicesManager()

# === MÉTHODES UTILITAIRES POUR L'ADMIN ===

def get_services_for_admin():
    """Retourne la configuration des services pour l'admin"""
    # Toujours recharger depuis Supabase pour avoir les dernières données
    services_manager.refresh_from_supabase()
    return {
        "success": True,
        "services": services_manager.services_config,
        "themes": services_manager.get_services_by_theme(),
        "featured": services_manager.get_featured_service()
    }

def toggle_service_visibility_admin(service_id: str, visible: bool):
    """Active/désactive un service (pour l'admin)"""
    return services_manager.set_service_visibility(service_id, visible)

def set_featured_service_admin(service_id: str, featured_title: str = None, duration_days: int = 30):
    """Met un service en avant (pour l'admin)"""
    return services_manager.set_featured_service(service_id, featured_title, duration_days)

def clear_featured_service_admin():
    """Retire la mise en avant (pour l'admin)"""
    return services_manager.clear_featured_service()

def add_new_service_admin(service_config: dict):
    """Ajoute un nouveau service (pour l'admin)"""
    return services_manager.add_new_service(service_config)

def update_service_admin(service_id: str, updates: dict):
    """Met à jour un service (pour l'admin)"""
    return services_manager.update_service(service_id, updates)

def delete_service_admin(service_id: str):
    """Supprime un service (pour l'admin)"""
    return services_manager.delete_service(service_id)

# Export de l'instance pour utilisation dans l'app
__all__ = [
    'services_manager', 
    'get_services_for_admin', 
    'get_visible_services', 
    'toggle_service_visibility_admin', 
    'set_featured_service_admin', 
    'clear_featured_service_admin', 
    'add_new_service_admin',
    'update_service_admin',
    'delete_service_admin'
]
