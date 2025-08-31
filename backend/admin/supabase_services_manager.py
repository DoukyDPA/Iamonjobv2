#!/usr/bin/env python3
"""
Gestionnaire de services admin avec persistance Supabase
"""

import os
import logging
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
import json

# Configuration du logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class SupabaseServicesManager:
    """Gestionnaire de services avec persistance Supabase"""
    
    def __init__(self):
        self.supabase_client = None
        self._init_supabase()
    
    def _init_supabase(self):
        """Initialise la connexion Supabase"""
        try:
            # Utiliser config.py directement (plus simple et fiable)
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
                    
                    # Test de connexion
                    try:
                        response = self.supabase_client.table('admin_services_config').select('service_id').limit(1).execute()
                        logger.info("✅ Test de connexion Supabase réussi")
                    except Exception as test_error:
                        logger.warning(f"⚠️ Test de connexion échoué: {test_error}")
                        
                else:
                    logger.warning("⚠️ Variables Supabase manquantes dans config.py")
                    self.supabase_client = None
                    
            except ImportError as e:
                logger.warning(f"⚠️ Import config.py échoué: {e}")
                self.supabase_client = None
                
        except Exception as e:
            logger.error(f"❌ Erreur initialisation Supabase: {e}")
            self.supabase_client = None
    
    def get_all_services(self) -> Dict[str, Any]:
        """Récupère tous les services depuis Supabase"""
        if not self.supabase_client:
            logger.warning("⚠️ Supabase non disponible, retour configuration par défaut")
            return self._get_default_config()
        
        try:
            response = self.supabase_client.table('admin_services_config').select('*').execute()
            services = {}
            
            for row in response.data:
                service_id = row['service_id']
                services[service_id] = {
                    'id': service_id,
                    'title': row['title'],
                    'coach_advice': row['coach_advice'],
                    'theme': row['theme'],
                    'visible': row['visible'],
                    'featured': row['featured'],
                    'featured_until': row['featured_until'],
                    'featured_title': row['featured_title'],
                    'requires_cv': row['requires_cv'],
                    'requires_job_offer': row['requires_job_offer'],
                    'requires_questionnaire': row['requires_questionnaire'],
                    'difficulty': row['difficulty'],
                    'duration_minutes': row['duration_minutes'],
                    'slug': row['slug']
                }
            
            logger.info(f"✅ {len(services)} services chargés depuis Supabase")
            return services
            
        except Exception as e:
            logger.error(f"❌ Erreur chargement Supabase: {e}")
            return self._get_default_config()
    
    def update_service_visibility(self, service_id: str, visible: bool) -> bool:
        """Met à jour la visibilité d'un service"""
        if not self.supabase_client:
            logger.warning("⚠️ Supabase non disponible")
            return False
        
        try:
            response = self.supabase_client.table('admin_services_config').update({
                'visible': visible,
                'updated_at': datetime.now().isoformat()
            }).eq('service_id', service_id).execute()
            
            if response.data:
                logger.info(f"✅ Service {service_id} {'activé' if visible else 'désactivé'}")
                return True
            else:
                logger.warning(f"⚠️ Service {service_id} non trouvé")
                return False
                
        except Exception as e:
            logger.error(f"❌ Erreur mise à jour visibilité: {e}")
            return False
    
    def update_service_theme(self, service_id: str, theme: str) -> bool:
        """Met à jour le thème d'un service"""
        if not self.supabase_client:
            logger.warning("⚠️ Supabase non disponible")
            return False
        
        try:
            response = self.supabase_client.table('admin_services_config').update({
                'theme': theme,
                'updated_at': datetime.now().isoformat()
            }).eq('service_id', service_id).execute()
            
            if response.data:
                logger.info(f"✅ Service {service_id} déplacé vers le thème {theme}")
                return True
            else:
                logger.warning(f"⚠️ Service {service_id} non trouvé")
                return False
                
        except Exception as e:
            logger.error(f"❌ Erreur mise à jour thème: {e}")
            return False
    
    def update_service_requirements(self, service_id: str, requirements: Dict[str, bool]) -> bool:
        """Met à jour les documents requis d'un service"""
        if not self.supabase_client:
            logger.warning("⚠️ Supabase non disponible")
            return False
        
        try:
            update_data = {
                'requires_cv': requirements.get('requires_cv', False),
                'requires_job_offer': requirements.get('requires_job_offer', False),
                'requires_questionnaire': requirements.get('requires_questionnaire', False),
                'updated_at': datetime.now().isoformat()
            }
            
            response = self.supabase_client.table('admin_services_config').update(update_data).eq('service_id', service_id).execute()
            
            if response.data:
                logger.info(f"✅ Exigences du service {service_id} mises à jour")
                return True
            else:
                logger.warning(f"⚠️ Service {service_id} non trouvé")
                return False
                
        except Exception as e:
            logger.error(f"❌ Erreur mise à jour exigences: {e}")
            return False
    
    def set_featured_service(self, service_id: str, featured_title: str = None, duration_days: int = 30) -> bool:
        """Met un service en avant"""
        if not self.supabase_client:
            logger.warning("⚠️ Supabase non disponible")
            return False
        
        try:
            # Désactiver tous les autres services mis en avant
            self.supabase_client.table('admin_services_config').update({
                'featured': False,
                'featured_until': None,
                'featured_title': None,
                'updated_at': datetime.now().isoformat()
            }).eq('featured', True).execute()
            
            # Activer le service choisi
            featured_until = (datetime.now() + timedelta(days=duration_days)).isoformat()
            
            response = self.supabase_client.table('admin_services_config').update({
                'featured': True,
                'featured_until': featured_until,
                'featured_title': featured_title,
                'updated_at': datetime.now().isoformat()
            }).eq('service_id', service_id).execute()
            
            if response.data:
                logger.info(f"✅ Service {service_id} mis en avant jusqu'au {featured_until}")
                return True
            else:
                logger.warning(f"⚠️ Service {service_id} non trouvé")
                return False
                
        except Exception as e:
            logger.error(f"❌ Erreur mise en avant: {e}")
            return False
    
    def clear_featured_service(self) -> bool:
        """Retire la mise en avant"""
        if not self.supabase_client:
            logger.warning("⚠️ Supabase non disponible")
            return False
        
        try:
            response = self.supabase_client.table('admin_services_config').update({
                'featured': False,
                'featured_until': None,
                'featured_title': None,
                'updated_at': datetime.now().isoformat()
            }).eq('featured', True).execute()
            
            if response.data:
                logger.info("✅ Mise en avant supprimée")
                return True
            else:
                logger.info("ℹ️ Aucun service en avant à supprimer")
                return True
                
        except Exception as e:
            logger.error(f"❌ Erreur suppression mise en avant: {e}")
            return False

    def add_new_service(self, service_config: Dict[str, Any]) -> bool:
        """Ajoute un nouveau service dans Supabase"""
        if not self.supabase_client:
            logger.warning("⚠️ Supabase non disponible")
            return False
        
        try:
            # Validation des données requises
            required_fields = ['service_id', 'title', 'theme']
            for field in required_fields:
                if field not in service_config or not service_config[field]:
                    logger.error(f"❌ Champ requis manquant: {field}")
                    return False
            
            service_id = service_config['service_id']
            
            # Vérifier si le service existe déjà
            existing = self.supabase_client.table('admin_services_config').select('id').eq(
                'service_id', service_id
            ).execute()
            
            if existing.data and len(existing.data) > 0:
                logger.warning(f"⚠️ Service {service_id} existe déjà")
                return False
            
            # Préparer les données avec valeurs par défaut
            service_data = {
                'service_id': service_id,
                'title': service_config['title'],
                'coach_advice': service_config.get('coach_advice', ''),
                'theme': service_config['theme'],
                'visible': service_config.get('visible', True),
                'featured': False,
                'featured_until': None,
                'featured_title': None,
                'requires_cv': service_config.get('requires_cv', False),
                'requires_job_offer': service_config.get('requires_job_offer', False),
                'requires_questionnaire': service_config.get('requires_questionnaire', False),
                'difficulty': service_config.get('difficulty', 'beginner'),
                'duration_minutes': service_config.get('duration_minutes', 5),
                'slug': service_config.get('slug', service_id.replace('_', '-')),
                'created_at': datetime.now().isoformat(),
                'updated_at': datetime.now().isoformat()
            }
            
            # Insérer le nouveau service
            response = self.supabase_client.table('admin_services_config').insert(service_data).execute()
            
            if response.data:
                logger.info(f"✅ Service {service_id} créé avec succès")
                return True
            else:
                logger.error(f"❌ Erreur lors de la création du service {service_id}")
                return False
                
        except Exception as e:
            logger.error(f"❌ Erreur ajout service: {e}")
            return False

    def clean_duplicate_services(self) -> Dict[str, int]:
        """Nettoie les services en double et retourne les statistiques"""
        if not self.supabase_client:
            logger.warning("⚠️ Supabase non disponible")
            return {"error": "Supabase non disponible"}
        
        try:
            # Récupérer tous les services
            response = self.supabase_client.table('admin_services_config').select('*').execute()
            services = response.data
            
            # Identifier les doublons par service_id
            duplicates = {}
            to_delete = []
            
            for service in services:
                service_id = service['service_id']
                if service_id not in duplicates:
                    duplicates[service_id] = []
                duplicates[service_id].append(service)
            
            # Identifier les services à supprimer (garder le plus récent)
            for service_id, service_list in duplicates.items():
                if len(service_list) > 1:
                    # Trier par date de création/mise à jour
                    sorted_services = sorted(
                        service_list, 
                        key=lambda x: x.get('updated_at', x.get('created_at', '')),
                        reverse=True
                    )
                    
                    # Garder le premier (le plus récent), supprimer les autres
                    for service in sorted_services[1:]:
                        to_delete.append(service['id'])
            
            # Supprimer les doublons
            deleted_count = 0
            for service_id in to_delete:
                try:
                    self.supabase_client.table('admin_services_config').delete().eq('id', service_id).execute()
                    deleted_count += 1
                except Exception as e:
                    logger.error(f"❌ Erreur suppression service {service_id}: {e}")
            
            logger.info(f"✅ Nettoyage terminé: {deleted_count} doublons supprimés")
            return {
                "total_services": len(services),
                "duplicates_found": len([s for s in duplicates.values() if len(s) > 1]),
                "duplicates_deleted": deleted_count
            }
            
        except Exception as e:
            logger.error(f"❌ Erreur nettoyage doublons: {e}")
            return {"error": str(e)}

    def get_services_by_theme(self) -> Dict[str, List[str]]:
        """Retourne les services groupés par thème"""
        services = self.get_all_services()
        themes = {}
        
        for service_id, service in services.items():
            if service.get('visible', True):
                theme = service.get('theme', 'other')
                if theme not in themes:
                    themes[theme] = []
                themes[theme].append(service_id)
        
        return themes
    
    def get_featured_service(self) -> Optional[Dict[str, Any]]:
        """Retourne le service mis en avant"""
        services = self.get_all_services()
        
        for service in services.values():
            if service.get('featured', False):
                featured_until = service.get('featured_until')
                if featured_until:
                    try:
                        featured_date = datetime.fromisoformat(featured_until.replace('Z', '+00:00'))
                        if featured_date > datetime.now():
                            return service
                        else:
                            # Expiré, le nettoyer
                            self.clear_featured_service()
                    except:
                        pass
                else:
                    return service
        
        return None
    
    def _get_default_config(self) -> Dict[str, Any]:
        """Configuration par défaut si Supabase n'est pas disponible"""
        return {
            # === THÈME : ÉVALUER UNE OFFRE ===
            'matching_cv_offre': {
                'id': 'matching_cv_offre',
                'title': 'Matching CV/Offre',
                'coach_advice': 'Découvrez précisément votre adéquation avec cette offre grâce à une analyse IA approfondie avec graphiques détaillés.',
                'theme': 'evaluate_offer',
                'visible': True,
                'featured': False,
                'featured_until': None,
                'featured_title': None,
                'requires_cv': True,
                'requires_job_offer': True,
                'requires_questionnaire': False,
                'difficulty': 'intermediate',
                'duration_minutes': 8,
                'slug': 'matching-cv-offre'
            },
            
            # === THÈME : AMÉLIORER MON CV ===
            'analyze_cv': {
                'id': 'analyze_cv',
                'title': 'Évaluer mon CV',
                'coach_advice': 'Obtenez une évaluation professionnelle de votre CV avec des recommandations concrètes pour l\'optimiser.',
                'theme': 'improve_cv',
                'visible': True,
                'featured': False,
                'featured_until': None,
                'featured_title': None,
                'requires_cv': True,
                'requires_job_offer': False,
                'requires_questionnaire': False,
                'difficulty': 'beginner',
                'duration_minutes': 5,
                'slug': 'analyze-cv'
            },
            'cv_ats_optimization': {
                'id': 'cv_ats_optimization',
                'title': 'Optimiser pour les ATS',
                'coach_advice': 'Adaptez votre CV pour qu\'il soit parfaitement lisible par les systèmes de tri automatiques des entreprises.',
                'theme': 'improve_cv',
                'visible': True,
                'featured': False,
                'featured_until': None,
                'featured_title': None,
                'requires_cv': True,
                'requires_job_offer': True,
                'requires_questionnaire': False,
                'difficulty': 'intermediate',
                'duration_minutes': 7,
                'slug': 'cv-ats-optimization'
            },
            
            # === THÈME : CANDIDATER ===
            'cover_letter_advice': {
                'id': 'cover_letter_advice',
                'title': 'Conseils lettre de motivation',
                'coach_advice': 'Recevez des conseils personnalisés pour structurer et rédiger une lettre de motivation percutante.',
                'theme': 'apply_jobs',
                'visible': True,
                'featured': False,
                'featured_until': None,
                'featured_title': None,
                'requires_cv': True,
                'requires_job_offer': True,
                'requires_questionnaire': False,
                'difficulty': 'beginner',
                'duration_minutes': 4,
                'slug': 'cover-letter-advice'
            },
            'cover_letter_generate': {
                'id': 'cover_letter_generate',
                'title': 'Générer lettre de motivation',
                'coach_advice': 'Créez une lettre de motivation complète et personnalisée prête à être envoyée avec votre candidature.',
                'theme': 'apply_jobs',
                'visible': True,
                'featured': False,
                'featured_until': None,
                'featured_title': None,
                'requires_cv': True,
                'requires_job_offer': True,
                'requires_questionnaire': True,
                'difficulty': 'intermediate',
                'duration_minutes': 6,
                'slug': 'cover-letter-generate'
            },
            'follow_up_email': {
                'id': 'follow_up_email',
                'title': 'Email de relance',
                'coach_advice': 'Rédigez un email de relance professionnel pour maintenir le contact après un entretien ou une candidature.',
                'theme': 'apply_jobs',
                'visible': True,
                'featured': False,
                'featured_until': None,
                'featured_title': None,
                'requires_cv': False,
                'requires_job_offer': True,
                'requires_questionnaire': False,
                'difficulty': 'beginner',
                'duration_minutes': 3,
                'slug': 'follow-up-email'
            },
            
            # === THÈME : PRÉPARER L'ENTRETIEN ===
            'professional_pitch': {
                'id': 'professional_pitch',
                'title': 'Pitch professionnel',
                'coach_advice': 'Développez un pitch percutant pour vous présenter efficacement en entretien ou en networking.',
                'theme': 'interview_prep',
                'visible': True,
                'featured': False,
                'featured_until': None,
                'featured_title': None,
                'requires_cv': True,
                'requires_job_offer': False,
                'requires_questionnaire': True,
                'difficulty': 'intermediate',
                'duration_minutes': 5,
                'slug': 'professional-pitch'
            },
            'interview_prep': {
                'id': 'interview_prep',
                'title': 'Préparation entretien',
                'coach_advice': 'Préparez-vous méthodiquement à votre entretien avec des questions types et des stratégies de réponse.',
                'theme': 'interview_prep',
                'visible': True,
                'featured': False,
                'featured_until': None,
                'featured_title': None,
                'requires_cv': True,
                'requires_job_offer': True,
                'requires_questionnaire': False,
                'difficulty': 'intermediate',
                'duration_minutes': 8,
                'slug': 'interview-prep'
            },
            
            # === THÈME : PROJET PROFESSIONNEL ===
            'skills_analysis': {
                'id': 'skills_analysis',
                'title': 'Analyser mes compétences',
                'coach_advice': 'Identifiez vos compétences transférables et découvrez de nouveaux domaines d\'application pour votre profil.',
                'theme': 'career_project',
                'visible': True,
                'featured': False,
                'featured_until': None,
                'featured_title': None,
                'requires_cv': True,
                'requires_job_offer': False,
                'requires_questionnaire': True,
                'difficulty': 'intermediate',
                'duration_minutes': 10,
                'slug': 'skills-analysis'
            },
            'reconversion_analysis': {
                'id': 'reconversion_analysis',
                'title': 'Évaluer une reconversion',
                'coach_advice': 'Explorez une reconversion professionnelle avec une analyse détaillée des étapes et opportunités.',
                'theme': 'career_project',
                'visible': True,
                'featured': False,
                'featured_until': None,
                'featured_title': None,
                'requires_cv': True,
                'requires_job_offer': False,
                'requires_questionnaire': True,
                'difficulty': 'intermediate',
                'duration_minutes': 12,
                'slug': 'reconversion-analysis'
            },
            'career_transition': {
                'id': 'career_transition',
                'title': 'Vers quel métier aller ?',
                'coach_advice': 'Identifiez les métiers compatibles avec vos compétences et vos envies grâce à une analyse personnalisée.',
                'theme': 'career_project',
                'visible': True,
                'featured': False,
                'featured_until': None,
                'featured_title': None,
                'requires_cv': True,
                'requires_job_offer': False,
                'requires_questionnaire': True,
                'difficulty': 'intermediate',
                'duration_minutes': 12,
                'slug': 'career-transition'
            },
            'salary_negotiation': {
                'id': 'salary_negotiation',
                'title': 'Négociation salariale',
                'coach_advice': 'Préparez-vous à négocier votre salaire avec des arguments concrets et une stratégie gagnante.',
                'theme': 'career_project',
                'visible': True,
                'featured': False,
                'featured_until': None,
                'featured_title': None,
                'requires_cv': True,
                'requires_job_offer': True,
                'requires_questionnaire': True,
                'difficulty': 'intermediate',
                'duration_minutes': 10,
                'slug': 'salary-negotiation'
            },
            'industry_orientation': {
                'id': 'industry_orientation',
                'title': 'Et pourquoi pas un métier dans l\'industrie ?',
                'coach_advice': 'Analyse personnalisée pour explorer les métiers industriels adaptés à votre profil.',
                'theme': 'career_project',
                'visible': True,
                'featured': False,
                'featured_until': None,
                'featured_title': None,
                'requires_cv': True,
                'requires_job_offer': False,
                'requires_questionnaire': True,
                'difficulty': 'intermediate',
                'duration_minutes': 12,
                'slug': 'industry-orientation'
            }
        }

# Instance globale
supabase_services_manager = SupabaseServicesManager()

# === MÉTHODES UTILITAIRES POUR L'ADMIN ===

def get_services_for_admin():
    """Retourne la configuration des services pour l'admin"""
    return {
        "success": True,
        "services": supabase_services_manager.get_all_services(),
        "themes": supabase_services_manager.get_services_by_theme(),
        "featured": supabase_services_manager.get_featured_service()
    }

def toggle_service_visibility_admin(service_id: str, visible: bool):
    """Active/désactive un service (pour l'admin)"""
    return supabase_services_manager.update_service_visibility(service_id, visible)

def update_service_theme_admin(service_id: str, theme: str):
    """Change le thème d'un service (pour l'admin)"""
    return supabase_services_manager.update_service_theme(service_id, theme)

def update_service_requirements_admin(service_id: str, requirements: Dict[str, bool]):
    """Met à jour les documents requis d'un service (pour l'admin)"""
    return supabase_services_manager.update_service_requirements(service_id, requirements)

def set_featured_service_admin(service_id: str, featured_title: str = None, duration_days: int = 30):
    """Met un service en avant (pour l'admin)"""
    return supabase_services_manager.set_featured_service(service_id, featured_title, duration_days)

def clear_featured_service_admin():
    """Retire la mise en avant (pour l'admin)"""
    return supabase_services_manager.clear_featured_service()

def add_new_service_admin(service_config: Dict[str, Any]):
    """Ajoute un nouveau service (pour l'admin)"""
    return supabase_services_manager.add_new_service(service_config)

def clean_duplicate_services_admin():
    """Nettoie les services en double (pour l'admin)"""
    return supabase_services_manager.clean_duplicate_services()

# Export de l'instance pour utilisation dans l'app
__all__ = [
    'supabase_services_manager', 
    'get_services_for_admin', 
    'toggle_service_visibility_admin',
    'update_service_theme_admin',
    'update_service_requirements_admin',
    'set_featured_service_admin', 
    'clear_featured_service_admin',
    'add_new_service_admin',
    'clean_duplicate_services_admin'
]
