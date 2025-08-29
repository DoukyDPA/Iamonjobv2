#!/usr/bin/env python3
"""
Gestionnaire de services avec persistance dans Supabase
Utilise la table admin_services_config créée spécifiquement pour les services
"""

import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional

class ServicesManager:
    """Gestionnaire centralisé des services avec persistance Supabase"""
    
    def __init__(self):
        # Table dédiée dans Supabase pour la configuration des services
        self.TABLE_NAME = 'admin_services_config'
        
        # Charger la configuration depuis Supabase
        self.services_config = self._load_config()
        
        logging.info(f"ServicesManager initialisé avec {len(self.services_config)} services depuis Supabase")
    
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
        """Charge la configuration depuis la table admin_services_config de Supabase"""
        try:
            client = self._get_supabase_client()
            if not client:
                return self._get_default_config()
            
            # Récupérer tous les services depuis la table dédiée
            response = client.table(self.TABLE_NAME).select('*').execute()
            
            if response.data:
                # Convertir la liste de services en dictionnaire
                services = {}
                for service in response.data:
                    service_id = service.get('service_id')
                    if service_id:
                        services[service_id] = service
                
                logging.info(f"✅ Configuration chargée depuis Supabase: {len(services)} services")
                return services
            else:
                logging.info("Aucun service trouvé dans Supabase, utilisation config par défaut")
                # Initialiser avec la config par défaut
                default_config = self._get_default_config()
                self._init_default_services(default_config)
                return default_config
                
        except Exception as e:
            logging.error(f"Erreur lors du chargement depuis Supabase: {e}")
            return self._get_default_config()
    
    def _init_default_services(self, default_config: Dict) -> bool:
        """Initialise la table avec les services par défaut"""
        try:
            client = self._get_supabase_client()
            if not client:
                return False
            
            # Insérer chaque service par défaut
            for service_id, service_data in default_config.items():
                try:
                    client.table(self.TABLE_NAME).insert(service_data).execute()
                    logging.info(f"Service par défaut ajouté: {service_id}")
                except Exception as e:
                    logging.warning(f"Service {service_id} existe peut-être déjà: {e}")
            
            return True
        except Exception as e:
            logging.error(f"Erreur lors de l'initialisation des services par défaut: {e}")
            return False
    
    def _save_service(self, service_id: str, service_data: Dict) -> bool:
        """Sauvegarde ou met à jour un service dans Supabase"""
        try:
            client = self._get_supabase_client()
            if not client:
                logging.error("Client Supabase non disponible")
                return False
            
            # Assurer que service_id est dans les données
            service_data['service_id'] = service_id
            service_data['updated_at'] = datetime.now().isoformat()
            
            # IMPORTANT: Utiliser upsert avec on_conflict sur service_id
            # car c'est notre clé primaire, pas 'id'
            service_data['created_at'] = datetime.now().isoformat()
            
            response = client.table(self.TABLE_NAME).upsert(
                service_data,
                on_conflict='service_id'  # Spécifier la colonne de conflit
            ).execute()
            
            if response.data:
                logging.info(f"✅ Service {service_id} sauvegardé dans Supabase")
                return True
            else:
                logging.error(f"❌ Échec sauvegarde service {service_id}")
                return False
                
        except Exception as e:
            logging.error(f"❌ Erreur sauvegarde service {service_id}: {e}")
            return False
    
    def _delete_service_from_db(self, service_id: str) -> bool:
        """Supprime un service de Supabase"""
        try:
            client = self._get_supabase_client()
            if not client:
                return False
            
            response = client.table(self.TABLE_NAME).delete().eq(
                'service_id', service_id
            ).execute()
            
            return response.data is not None
            
        except Exception as e:
            logging.error(f"Erreur suppression service {service_id}: {e}")
            return False
    
    def _get_default_config(self) -> Dict:
        """Configuration par défaut des services"""
        return {
            'analyze_cv': {
                'service_id': 'analyze_cv',
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
                'service_id': 'cv_offer_compatibility',
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
                'service_id': 'generate_cover_letter',
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
                'service_id': 'prepare_interview',
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
                'service_id': 'linkedin_optimization',
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
                'service_id': 'salary_negotiation',
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
        """Retourne tous les services (recharge depuis Supabase)"""
        self.services_config = self._load_config()
        return self.services_config
    
    def get_visible_services(self) -> Dict:
        """Retourne uniquement les services visibles"""
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
                    try:
                        # Parser la date ISO
                        until_date = datetime.fromisoformat(featured_until.replace('Z', '+00:00'))
                        if until_date < datetime.now(until_date.tzinfo):
                            service['featured'] = False
                            service['featured_until'] = None
                            self._save_service(service['service_id'], service)
                            continue
                    except:
                        pass
                return service
        return None
    
    def set_service_visibility(self, service_id: str, visible: bool) -> bool:
        """Active ou désactive un service"""
        if service_id in self.services_config:
            self.services_config[service_id]['visible'] = visible
            success = self._save_service(service_id, self.services_config[service_id])
            if success:
                logging.info(f"Service {service_id} {'activé' if visible else 'désactivé'}")
            return success
        return False
    
    def set_featured_service(self, service_id: str, featured_title: str = None, duration_days: int = 30) -> bool:
        """Met un service en avant"""
        # D'abord retirer toute mise en avant existante
        for sid, service in self.services_config.items():
            if service.get('featured', False):
                service['featured'] = False
                service['featured_until'] = None
                service['featured_title'] = None
                self._save_service(sid, service)
        
        # Mettre en avant le nouveau service
        if service_id in self.services_config:
            featured_until = (datetime.now() + timedelta(days=duration_days)).isoformat()
            
            self.services_config[service_id].update({
                'featured': True,
                'featured_until': featured_until,
                'featured_title': featured_title or self.services_config[service_id]['title']
            })
            
            success = self._save_service(service_id, self.services_config[service_id])
            if success:
                logging.info(f"Service {service_id} mis en avant jusqu'au {featured_until}")
            return success
        return False
    
    def clear_featured_service(self) -> bool:
        """Retire la mise en avant"""
        changed = False
        for sid, service in self.services_config.items():
            if service.get('featured', False):
                service['featured'] = False
                service['featured_until'] = None 
                service['featured_title'] = None
                self._save_service(sid, service)
                changed = True
        
        if changed:
            logging.info("Mise en avant supprimée")
        return changed
    
    def add_new_service(self, service_config: Dict) -> bool:
        """Ajoute un nouveau service"""
        service_id = service_config.get('id')
        if not service_id:
            logging.error("ID du service manquant")
            return False
        
        # Recharger pour éviter les conflits
        self.services_config = self._load_config()
        
        # Vérifier si le service existe déjà
        if service_id in self.services_config:
            logging.warning(f"Le service {service_id} existe déjà")
            return False
            
        # Configuration par défaut
        default_config = {
            'service_id': service_id,  # Important: utiliser service_id pour la DB
            'visible': False,
            'featured': False,
            'featured_until': None,
            'featured_title': None,
            'requires_cv': False,
            'requires_job_offer': False,
            'requires_questionnaire': False,
            'difficulty': 'beginner',
            'duration_minutes': 5,
            'theme': 'apply_jobs'
        }
        
        # Fusionner avec la config fournie
        final_config = {**default_config, **service_config}
        final_config['service_id'] = service_id  # Assurer que service_id est correct
        
        # Sauvegarder dans Supabase
        success = self._save_service(service_id, final_config)
        
        if success:
            self.services_config[service_id] = final_config
            logging.info(f"✅ Nouveau service ajouté: {service_id}")
        else:
            logging.error(f"❌ Échec ajout service {service_id}")
        
        return success
    
    def update_service(self, service_id: str, updates: Dict) -> bool:
        """Met à jour un service existant"""
        self.services_config = self._load_config()
        
        if service_id not in self.services_config:
            logging.error(f"Service {service_id} introuvable")
            return False
        
        # Mettre à jour
        self.services_config[service_id].update(updates)
        
        # Sauvegarder
        success = self._save_service(service_id, self.services_config[service_id])
        if success:
            logging.info(f"Service {service_id} mis à jour")
        return success
    
    def delete_service(self, service_id: str) -> bool:
        """Supprime un service"""
        self.services_config = self._load_config()
        
        if service_id not in self.services_config:
            logging.error(f"Service {service_id} introuvable")
            return False
        
        # Supprimer de Supabase
        success = self._delete_service_from_db(service_id)
        
        if success:
            del self.services_config[service_id]
            logging.info(f"Service {service_id} supprimé")
        
        return success

# Instance globale
services_manager = ServicesManager()

# === MÉTHODES UTILITAIRES POUR L'ADMIN ===

def get_services_for_admin():
    """Retourne la configuration des services pour l'admin"""
    return {
        "success": True,
        "services": services_manager.get_all_services(),
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

# Export
__all__ = [
    'services_manager', 
    'get_services_for_admin', 
    'toggle_service_visibility_admin', 
    'set_featured_service_admin', 
    'clear_featured_service_admin', 
    'add_new_service_admin',
    'update_service_admin',
    'delete_service_admin'
]
