#!/usr/bin/env python3
"""
Service de création automatique complète d'un service
"""
import logging
import os
import re
from typing import Dict, Any
from datetime import datetime

logger = logging.getLogger(__name__)

class ServiceCreationService:
    """Service de création automatique complète d'un service"""
    
    def __init__(self):
        self.frontend_path = "frontend/src"
        self.pages_path = f"{self.frontend_path}/pages"
        self.app_js_path = f"{self.frontend_path}/App.js"
        self.supabase_client = None
        self._init_supabase()
    
    def _init_supabase(self):
        """Initialise la connexion Supabase"""
        try:
            from config.app_config import get_supabase_client
            self.supabase_client = get_supabase_client()
            logger.info("✅ Connexion Supabase établie pour la création de service")
        except Exception as e:
            logger.error(f"❌ Erreur connexion Supabase: {e}")
    
    def create_complete_service(self, service_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Crée un service complet : admin_services_config + ai_prompts + page React + route + endpoint (code prêt à coller)
        """
        try:
            service_id = service_data.get('service_id')
            title = service_data.get('title', '')
            prompt = service_data.get('prompt', '')
            
            if not service_id or not title or not prompt:
                return {"error": "service_id, title et prompt requis"}
            
            results = {
                "service_id": service_id,
                "title": title,
                "steps_completed": [],
                "errors": []
            }
            
            # 1) Créer le service côté admin
            step1 = self._create_service_in_admin(service_data)
            if step1.get('success'):
                results["steps_completed"].append("Service créé dans admin_services_config")
            else:
                results["errors"].append(f"Étape admin: {step1.get('error')}")
            
            # 2) Créer le prompt côté ai_prompts
            step2 = self._create_prompt_in_ai_prompts(service_data)
            if step2.get('success'):
                results["steps_completed"].append("Prompt créé dans ai_prompts")
            else:
                results["errors"].append(f"Étape prompt: {step2.get('error')}")
            
            # 3) Générer la page React
            step3 = self._create_react_page(service_data)
            if step3.get('success'):
                results["steps_completed"].append("Page React créée")
            else:
                results["errors"].append(f"Étape page: {step3.get('error')}")
            
            # 4) Ajouter la route dans App.js
            step4 = self._add_route_to_app(service_id)
            if step4.get('success'):
                results["steps_completed"].append("Route ajoutée dans App.js")
            else:
                results["errors"].append(f"Étape route: {step4.get('error')}")
            
            # 5) Générer le code d'endpoint (à intégrer dans services_api)
            step5 = self._create_api_endpoint(service_data)
            if step5.get('success'):
                results["steps_completed"].append("Endpoint API généré (code prêt à coller)")
                results["endpoint_code"] = step5.get('endpoint_code')
            else:
                results["errors"].append(f"Étape endpoint: {step5.get('error')}")
            
            results["success"] = len(results["errors"]) == 0
            results["message"] = f"Service {title} créé: {len(results['steps_completed'])}/5 étapes OK"
            return results
        except Exception as e:
            logger.error(f"❌ Erreur création service: {e}")
            return {"error": str(e)}
    
    def _create_service_in_admin(self, service_data: Dict[str, Any]) -> Dict[str, Any]:
        """Insère dans admin_services_config"""
        try:
            if not self.supabase_client:
                return {"error": "Connexion Supabase non disponible"}
            admin_service_data = {
                'service_id': service_data['service_id'],
                'title': service_data['title'],
                'coach_advice': service_data.get('coach_advice', ''),
                'theme': service_data.get('theme', 'general'),
                'visible': service_data.get('visible', True),
                'featured': service_data.get('featured', False),
                'requires_cv': service_data.get('requires_cv', False),
                'requires_job_offer': service_data.get('requires_job_offer', False),
                'requires_questionnaire': service_data.get('requires_questionnaire', False),
                'difficulty': service_data.get('difficulty', 'beginner'),
                'duration_minutes': service_data.get('duration_minutes', 5),
                'slug': service_data.get('slug', service_data['service_id']),
                'created_at': datetime.now().isoformat(),
                'updated_at': datetime.now().isoformat()
            }
            response = self.supabase_client.table('admin_services_config').insert(admin_service_data).execute()
            if response.data:
                return {"success": True, "data": response.data[0]}
            return {"error": "Insertion admin_services_config sans data"}
        except Exception as e:
            logger.error(f"❌ Erreur admin_services_config: {e}")
            return {"error": str(e)}
    
    def _create_prompt_in_ai_prompts(self, service_data: Dict[str, Any]) -> Dict[str, Any]:
        """Insère dans ai_prompts"""
        try:
            if not self.supabase_client:
                return {"error": "Connexion Supabase non disponible"}
            # Préparer les données pour ai_prompts
            # Nettoyer et valider le prompt
            prompt_text = service_data['prompt']
            if len(prompt_text) > 2000:  # Limite de sécurité
                logger.warning(f"Prompt trop long ({len(prompt_text)} caractères), tronqué")
                prompt_text = prompt_text[:2000] + "..."
            
            prompt_data = {
                'title': service_data['title'],
                'description': service_data.get('description', ''),
                'prompt': prompt_text,
                'service_id': service_data['service_id'],
                'requires_cv': service_data.get('requires_cv', False),
                'requires_job_offer': service_data.get('requires_job_offer', False),
                'requires_questionnaire': service_data.get('requires_questionnaire', False),
                'created_at': datetime.now().isoformat(),
                'updated_at': datetime.now().isoformat()
            }
            try:
                response = self.supabase_client.table('ai_prompts').insert(prompt_data).execute()
                
                if response.data:
                    logger.info(f"✅ Prompt créé avec succès pour {service_data['service_id']}")
                    return {"success": True, "data": response.data[0]}
                else:
                    logger.error(f"❌ Réponse Supabase vide pour ai_prompts")
                    return {"error": "Réponse Supabase vide"}
                    
            except Exception as e:
                logger.error(f"❌ Erreur insertion ai_prompts: {e}")
                return {"error": f"Erreur insertion: {str(e)}"}
        except Exception as e:
            logger.error(f"❌ Erreur ai_prompts: {e}")
            return {"error": str(e)}
    
    def _create_react_page(self, service_data: Dict[str, Any]) -> Dict[str, Any]:
        """Crée un fichier de page React basique pour le service"""
        try:
            service_id = service_data['service_id']
            title = service_data['title']
            page_name = self._generate_page_name(service_id)
            page_file = f"{self.pages_path}/{page_name}.js"
            
            # S'assurer que le dossier pages existe
            os.makedirs(self.pages_path, exist_ok=True)
            
            if os.path.exists(page_file):
                return {"success": True, "message": f"Page {page_name} existe déjà"}
            
            page_content = self._generate_page_content(service_data)
            with open(page_file, 'w', encoding='utf-8') as f:
                f.write(page_content)
            return {"success": True, "page_file": page_file}
        except Exception as e:
            logger.error(f"❌ Erreur création page React: {e}")
            return {"error": str(e)}
    
    def _add_route_to_app(self, service_id: str) -> Dict[str, Any]:
        """Ajoute une route dans App.js si absente"""
        try:
            page_name = self._generate_page_name(service_id)
            
            # Lire App.js
            with open(self.app_js_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            import_line = f"import {page_name} from './pages/{page_name}';"
            route_line = f"              <Route path=\"/{service_id}\" element={{<{page_name} />}} />"
            
            modified = False
            if import_line not in content:
                insertion_point = content.find("import './App.css';")
                if insertion_point != -1:
                    content = content[:insertion_point] + import_line + "\n" + content[insertion_point:]
                    modified = True
            
            if route_line not in content:
                routes_end = content.find("</Routes>")
                if routes_end != -1:
                    content = content[:routes_end] + route_line + "\n" + content[routes_end:]
                    modified = True
            
            if modified:
                with open(self.app_js_path, 'w', encoding='utf-8') as f:
                    f.write(content)
            
            return {"success": True, "route": f"/{service_id}", "modified": modified}
        except Exception as e:
            logger.error(f"❌ Erreur ajout route App.js: {e}")
            return {"error": str(e)}
    
    def _create_api_endpoint(self, service_data: Dict[str, Any]) -> Dict[str, Any]:
        """Génère le code d'endpoint à intégrer dans services_api.py"""
        try:
            service_id = service_data['service_id']
            title = service_data['title']
            safe_fn = re.sub(r'[^a-zA-Z0-9_]', '_', service_id)
            
            # Créer le code endpoint sans f-string pour éviter les conflits
            endpoint_code = f"""
@services_api.route('/{service_id}', methods=['POST'])
@verify_jwt_token
def {safe_fn}():
    \"\"\"Service: {title}\"\"\"
    try:
        data = request.get_json()
        user_id = get_jwt_identity()

        # Récupérer le prompt pour ce service
        from backend.admin.ai_prompts_manager import get_all_ai_prompts
        prompts = get_all_ai_prompts()
        service_prompt = prompts.get('{title}', {{}})
        if not service_prompt:
            return jsonify({{"error": "Service non disponible"}}, 500)

        # Appeler le service AI
        from backend.services.ai_service import ai_service
        result = ai_service.process_service_request(
            service_id='{service_id}',
            user_id=user_id,
            prompt_template=service_prompt.get('prompt', ''),
            input_data=data
        )
        return jsonify({{
            "success": True,
            "result": result,
            "service": "{title}"
        }})
    except Exception as e:
        logging.error("Erreur service {service_id}: %s", e)
        return jsonify({{"error": "Erreur lors du service"}}, 500)
"""
            return {"success": True, "endpoint_code": endpoint_code}
        except Exception as e:
            logger.error(f"❌ Erreur génération endpoint: {e}")
            return {"error": str(e)}
    
    def _generate_page_name(self, service_id: str) -> str:
        """Nom de page basé sur le service_id"""
        words = re.sub(r'[_-]', ' ', service_id).split()
        return ''.join(word.capitalize() for word in words) + 'Page'
    
    def _generate_page_content(self, service_data: Dict[str, Any]) -> str:
        """Contenu minimal de page React pour un service"""
        service_id = service_data['service_id']
        title = service_data['title']
        page_name = self._generate_page_name(service_id)
        return f"""import React, {{ useState }} from 'react';
import {{ useAuth }} from '../context/AuthContext';

const {page_name} = () => {{
  const {{ user }} = useAuth();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleService = async () => {{
    setLoading(true);
    setError(null);
    try {{
      const response = await fetch('/api/services/{service_id}', {{
        method: 'POST',
        headers: {{
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${{localStorage.getItem('token')}}`
        }},
        body: JSON.stringify({{}})
      }});
      const data = await response.json();
      if (data.success) {{
        setResult(data.result);
      }} else {{
        setError(data.error || 'Erreur lors du service');
      }}
    }} catch (err) {{
      setError('Erreur de connexion');
    }} finally {{
      setLoading(false);
    }}
  }};

  return (
    <div className="{service_id}-page">
      <div className="container">
        <h1>{title}</h1>
        <button onClick={{handleService}} disabled={{loading}}>
          {{loading ? 'Traitement en cours...' : 'Lancer le service'}}
        </button>
        {{error && <div className="error">{{error}}</div>}}
        {{result && <pre className="result">{{JSON.stringify(result, null, 2)}}</pre>}}
      </div>
    </div>
  );
}};

export default {page_name};
"""

# Instance globale
service_creation_service = ServiceCreationService()
