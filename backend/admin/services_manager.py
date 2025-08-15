# NOUVEAU FICHIER : backend/admin/services_manager.py
# Gestionnaire admin pour configurer les services

import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional

class ServicesManager:
    """Gestionnaire des services avec configuration flexible"""
    
    def __init__(self):
        self.services_config = self._load_default_config()
    
    def _load_default_config(self) -> Dict:
        """Configuration par défaut des services"""
        return {
            # === THÈME : ÉVALUER UNE OFFRE ===
            "matching_cv_offre": {
                "id": "matching_cv_offre",
                "title": "Matching CV/Offre",
                "coach_advice": "Découvrez précisément votre adéquation avec cette offre grâce à une analyse IA approfondie avec graphiques détaillés.",
                "theme": "evaluate_offer",
                "visible": True,
                "featured": False,
                "featured_until": None,
                "featured_title": None,
                "requires_cv": True,
                "requires_job_offer": True,
                "requires_questionnaire": False,
                "difficulty": "intermediate",
                "duration_minutes": 8,
                "slug": "matching-cv-offre"
            },
            
            # === THÈME : AMÉLIORER MON CV ===
            "analyze_cv": {
                "id": "analyze_cv", 
                "title": "Évaluer mon CV",
                "coach_advice": "Obtenez une évaluation professionnelle de votre CV avec des recommandations concrètes pour l'optimiser.",
                "theme": "improve_cv",
                "visible": True,
                "featured": False,
                "featured_until": None,
                "featured_title": None,
                "requires_cv": True,
                "requires_job_offer": False,
                "requires_questionnaire": False,
                "difficulty": "beginner",
                "duration_minutes": 5,
                "slug": "analyze-cv"
            },
            
            "cv_ats_optimization": {
                "id": "cv_ats_optimization",
                "title": "Optimiser pour les ATS", 
                "coach_advice": "Adaptez votre CV pour qu'il soit parfaitement lisible par les systèmes de tri automatiques des entreprises.",
                "theme": "improve_cv",
                "visible": True,
                "featured": False,
                "featured_until": None,
                "featured_title": None,
                "requires_cv": True,
                "requires_job_offer": True,
                "requires_questionnaire": False,
                "difficulty": "intermediate",
                "duration_minutes": 7,
                "slug": "cv-ats-optimization"
            },
            
            # === THÈME : CANDIDATER ===
            "cover_letter_advice": {
                "id": "cover_letter_advice",
                "title": "Conseils lettre de motivation",
                "coach_advice": "Recevez des conseils personnalisés pour structurer et rédiger une lettre de motivation percutante.",
                "theme": "apply_jobs",
                "visible": True,
                "featured": False,
                "featured_until": None,
                "featured_title": None,
                "requires_cv": True,
                "requires_job_offer": True,
                "requires_questionnaire": False,
                "difficulty": "beginner",
                "duration_minutes": 4,
                "slug": "cover-letter-advice"
            },
            
            "cover_letter_generate": {
                "id": "cover_letter_generate",
                "title": "Générer lettre de motivation",
                "coach_advice": "Créez une lettre de motivation complète et personnalisée prête à être envoyée avec votre candidature.",
                "theme": "apply_jobs", 
                "visible": True,
                "featured": False,
                "featured_until": None,
                "featured_title": None,
                "requires_cv": True,
                "requires_job_offer": True,
                "requires_questionnaire": True,
                "difficulty": "intermediate",
                "duration_minutes": 10,
                "slug": "cover-letter-generate"
            },
            
            "professional_pitch": {
                "id": "professional_pitch",
                "title": "Pitch professionnel",
                "coach_advice": "Développez un pitch percutant pour vous présenter efficacement en entretien ou en networking.",
                "theme": "apply_jobs",
                "visible": True,
                "featured": False,
                "featured_until": None,
                "featured_title": None,
                "requires_cv": True,
                "requires_job_offer": False,
                "requires_questionnaire": True,
                "difficulty": "intermediate", 
                "duration_minutes": 8,
                "slug": "professional-pitch"
            },
            
            "interview_prep": {
                "id": "interview_prep",
                "title": "Préparation entretien",
                "coach_advice": "Préparez-vous méthodiquement à votre entretien avec des questions types et des stratégies de réponse.",
                "theme": "apply_jobs",
                "visible": True,
                "featured": False,
                "featured_until": None,
                "featured_title": None,
                "requires_cv": True,
                "requires_job_offer": True,
                "requires_questionnaire": False,
                "difficulty": "intermediate",
                "duration_minutes": 12,
                "slug": "interview-prep"
            },
            
            "follow_up_email": {
                "id": "follow_up_email",
                "title": "Email de relance",
                "coach_advice": "Rédigez un email de relance professionnel pour maintenir le contact après un entretien ou une candidature.",
                "theme": "apply_jobs",
                "visible": True,
                "featured": False,
                "featured_until": None,
                "featured_title": None,
                "requires_cv": False,
                "requires_job_offer": True,
                "requires_questionnaire": False,
                "difficulty": "beginner",
                "duration_minutes": 4,
                "slug": "follow-up-email"
            },
            
            # === THÈME : PROJET PROFESSIONNEL ===
            "skills_analysis": {
                "id": "skills_analysis", 
                "title": "Analyser mes compétences",
                "coach_advice": "Identifiez vos compétences transférables et découvrez de nouveaux domaines d'application pour votre profil.",
                "theme": "career_project",
                "visible": True,
                "featured": False,
                "featured_until": None,
                "featured_title": None,
                "requires_cv": True,
                "requires_job_offer": False,
                "requires_questionnaire": True,
                "difficulty": "intermediate",
                "duration_minutes": 10,
                "slug": "skills-analysis"
            },
            
            "reconversion_analysis": {
                "id": "reconversion_analysis",
                "title": "Évaluer une reconversion",
                "coach_advice": "Explorez une reconversion professionnelle avec une analyse détaillée des étapes et opportunités.",
                "theme": "career_project",
                "visible": True,
                "featured": True,  # ⭐ EXEMPLE D'ACTION MISE EN AVANT
                "featured_until": "2025-08-31",
                "featured_title": "Tester ma compatibilité avec le métier de chauffeur de bus",
                "requires_cv": True,
                "requires_job_offer": False,
                "requires_questionnaire": True,
                "difficulty": "advanced",
                "duration_minutes": 15,
                "slug": "reconversion-analysis"
            },

            "career_transition": {
                "id": "career_transition",
                "title": "Vers quel métier aller ?",
                "coach_advice": "Identifiez les métiers compatibles avec vos compétences et vos envies grâce à une analyse personnalisée.",
                "theme": "career_project",
                "visible": True,
                "featured": False,
                "featured_until": None,
                "featured_title": None,
                "requires_cv": True,
                "requires_job_offer": False,
                "requires_questionnaire": True,
                "difficulty": "intermediate",
                "duration_minutes": 12,
                "slug": "career-transition"
            },

            "industry_orientation": {
                "id": "industry_orientation",
                "title": "Et pourquoi pas un métier dans l'industrie ?",
                "coach_advice": "Analyse personnalisée pour explorer les métiers industriels adaptés à votre profil.",
                "theme": "career_project",
                "visible": True,
                "featured": False,
                "featured_until": None,
                "featured_title": None,
                "requires_cv": True,
                "requires_job_offer": False,
                "requires_questionnaire": True,
                "difficulty": "intermediate",
                "duration_minutes": 12,
                "slug": "industry-orientation"
            }
        }
    
    # === MÉTHODES DE GESTION ===
    
    def get_visible_services(self) -> List[Dict]:
        """Retourne tous les services visibles"""
        return [service for service in self.services_config.values() if service.get('visible', True)]
    
    def get_services_by_theme(self) -> Dict[str, List[Dict]]:
        """Retourne les services groupés par thème"""
        themes = {
            "evaluate_offer": {"title": "🎯 Évaluer une offre d'emploi", "services": []},
            "improve_cv": {"title": "📄 Améliorer mon CV", "services": []},
            "apply_jobs": {"title": "✉️ Candidater", "services": []},
            "career_project": {"title": "🚀 Reconstruire mon projet professionnel", "services": []}
        }
        
        for service in self.get_visible_services():
            theme_id = service.get('theme')
            if theme_id in themes:
                themes[theme_id]['services'].append(service)
        
        return themes
    
    def get_featured_service(self) -> Optional[Dict]:
        """Retourne le service mis en avant (si valide)"""
        now = datetime.now()
        
        for service in self.services_config.values():
            if not service.get('featured', False):
                continue
                
            if not service.get('visible', True):
                continue
                
            featured_until = service.get('featured_until')
            if featured_until and datetime.fromisoformat(featured_until) < now:
                continue
                
            return service
        
        return None
    
    def get_service_by_slug(self, slug: str) -> Optional[Dict]:
        """Retourne un service par son slug"""
        return next((s for s in self.services_config.values() if s.get('slug') == slug), None)
    
    # === MÉTHODES D'ADMINISTRATION ===
    
    def set_service_visibility(self, service_id: str, visible: bool) -> bool:
        """Active/désactive un service"""
        if service_id in self.services_config:
            self.services_config[service_id]['visible'] = visible
            logging.info(f"Service {service_id} {'activé' if visible else 'désactivé'}")
            return True
        return False
    
    def set_featured_service(self, service_id: str, featured_title: str = None, duration_days: int = 30) -> bool:
        """Met un service en avant"""
        # Désactiver tous les autres services mis en avant
        for service in self.services_config.values():
            service['featured'] = False
            service['featured_until'] = None
            service['featured_title'] = None
        
        # Activer le service choisi
        if service_id in self.services_config:
            featured_until = (datetime.now() + timedelta(days=duration_days)).isoformat()
            
            self.services_config[service_id].update({
                'featured': True,
                'featured_until': featured_until,
                'featured_title': featured_title or self.services_config[service_id]['title']
            })
            
            logging.info(f"Service {service_id} mis en avant jusqu'au {featured_until}")
            return True
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
            logging.info("Mise en avant supprimée")
        return changed
    
    def add_new_service(self, service_config: Dict) -> bool:
        """Ajoute un nouveau service"""
        service_id = service_config.get('id')
        if not service_id:
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
            'theme': 'apply_jobs'
        }
        
        # Fusionner avec la config fournie
        final_config = {**default_config, **service_config}
        self.services_config[service_id] = final_config
        
        logging.info(f"Nouveau service ajouté: {service_id}")
        return True

# Instance globale
services_manager = ServicesManager()

# === API ROUTES POUR L'ADMINISTRATION ===

def register_admin_routes(app):
    """Enregistre les routes d'administration des services"""
    from flask import jsonify, request

    @app.route('/api/admin/services', methods=['GET'])
    def get_services_config():
        """Liste tous les services avec leur configuration"""
        return jsonify({
            "success": True,
            "services": services_manager.services_config,
            "themes": services_manager.get_services_by_theme(),
            "featured": services_manager.get_featured_service()
        })

    @app.route('/api/admin/services/<service_id>/visibility', methods=['POST'])
    def toggle_service_visibility(service_id):
        """Active/désactive un service"""
        data = request.get_json()
        visible = data.get('visible', True)
        success = services_manager.set_service_visibility(service_id, visible)
        return jsonify({"success": success, "service_id": service_id, "visible": visible})

    @app.route('/api/admin/services/<service_id>/feature', methods=['POST'])
    def set_featured_service(service_id):
        """Met un service en avant"""
        data = request.get_json()
        featured_title = data.get('featured_title')
        duration_days = data.get('duration_days', 30)
        success = services_manager.set_featured_service(service_id, featured_title, duration_days)
        return jsonify({"success": success, "service_id": service_id, "featured": True})

    @app.route('/api/admin/services/featured', methods=['DELETE'])
    def clear_featured_service():
        """Retire la mise en avant"""
        success = services_manager.clear_featured_service()
        return jsonify({"success": success, "featured": None})

    @app.route('/api/admin/services', methods=['POST'])
    def add_new_service():
        """Ajoute un nouveau service"""
        data = request.get_json()
        success = services_manager.add_new_service(data)
        return jsonify({"success": success, "service": data if success else None})

    # === Gestion des prompts ===
    from services.ai_service_prompts import AI_PROMPTS, get_prompt, update_prompt

    @app.route('/api/admin/prompts', methods=['GET'])
    def list_prompts():
        """Liste tous les prompts disponibles"""
        return jsonify({"success": True, "prompts": AI_PROMPTS})

    @app.route('/api/admin/prompts/<service_id>', methods=['GET', 'PUT'])
    def handle_prompt(service_id):
        """Récupère ou met à jour le prompt d'un service"""
        if request.method == 'GET':
            prompt_entry = get_prompt(service_id)
            if prompt_entry:
                return jsonify({"success": True, "prompt": prompt_entry.get("prompt", "")})
            return jsonify({"success": False, "error": "Service inconnu"}), 404

        data = request.get_json() or {}
        new_prompt = data.get('prompt')
        if new_prompt is None:
            return jsonify({"success": False, "error": "Champ 'prompt' manquant"}), 400
        if update_prompt(service_id, new_prompt):
            return jsonify({"success": True, "service_id": service_id, "prompt": new_prompt})
        return jsonify({"success": False, "error": "Service inconnu"}), 404

# Export de l'instance pour utilisation dans l'app
__all__ = ['services_manager', 'register_admin_routes']
