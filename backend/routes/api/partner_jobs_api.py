# MIGRATION COMPLÈTE : backend/routes/api/partner_jobs_api.py
# ✅ VERSION SUPABASE - Plus de Supabase !

from flask import Blueprint, request, jsonify
import logging
import json
from datetime import datetime

# ✅ IMPORT SUPABASE - Remplace Supabase
from services.supabase_storage import SupabaseStorage

partner_jobs_api = Blueprint('partner_jobs_api', __name__)

# ✅ CLÉ SIMPLE QUI MARCHE
PARTNERS_KEY = "partner_companies"

def get_default_partners():
    """Données par défaut simples"""
    return [
        {
            "id": 1,
            "name": "Entreprise Partenaire 1",
            "logo": "🏢",
            "contactAddress": "contact@entreprise1.com",
            "description": "Description de l'entreprise",
            "sector": "Technologie",
            "website": "",
            "jobs": [
                {
                    "id": 1,
                    "title": "Développeur Full Stack",
                    "description": "Développement d'applications web modernes",
                    "detailedDescription": "Développement d'applications web modernes avec React et Node.js",
                    "contractType": "CDI",
                    "location": "Paris",
                    "salary": "45k-55k€",
                    "skills": ["React", "Node.js", "JavaScript"]
                }
            ]
        }
    ]

@partner_jobs_api.route('/', methods=['GET'])
def get_partners():
    """Récupérer les partenaires - VERSION SUPABASE"""
    try:
        logging.info("📡 GET partenaires depuis Supabase")
        
        # ✅ UTILISER SUPABASE au lieu de Supabase
        supabase = SupabaseStorage()
        
        try:
            # Récupérer depuis Supabase
            response = supabase.client.table('partners').select('*').execute()
            
            if response.data and len(response.data) > 0:
                partners = []
                for partner in response.data:
                    # Convertir le format Supabase en format attendu
                    partner_data = partner.get('data', {})
                    if isinstance(partner_data, dict):
                        partners.append(partner_data)
                
                logging.info(f"✅ Partenaires récupérés depuis Supabase: {len(partners)}")
                
                return jsonify({
                    "success": True,
                    "partners": partners,
                    "count": len(partners),
                    "source": "supabase",
                    "supabase_available": True
                }), 200
                
            else:
                logging.info("📭 Aucun partenaire dans Supabase, initialisation")
                
                # Pas de données, initialiser avec les défauts
                partners = get_default_partners()
                
                # Sauvegarder dans Supabase
                for partner in partners:
                    supabase.client.table('partners').insert({
                        'partner_id': f"partner_{partner['id']}",
                        'data': partner
                    }).execute()
                
                logging.info("🔧 Partenaires par défaut sauvegardés dans Supabase")
                
                return jsonify({
                    "success": True,
                    "partners": partners,
                    "count": len(partners),
                    "source": "default_initialized",
                    "supabase_available": True
                }), 200
                
        except Exception as supabase_error:
            logging.error(f"❌ Erreur Supabase: {supabase_error}")
            partners = get_default_partners()
            
            return jsonify({
                "success": True,
                "partners": partners,
                "count": len(partners),
                "source": "supabase_error_fallback",
                "supabase_available": False,
                "error": str(supabase_error)
            }), 200
        
    except Exception as e:
        logging.error(f"❌ Erreur GET partenaires: {e}")
        return jsonify({
            "success": True,
            "partners": get_default_partners(),
            "count": 1,
            "source": "emergency_fallback",
            "supabase_available": False,
            "error": str(e)
        }), 200

@partner_jobs_api.route('/partners', methods=['GET'])
def get_partners_list():
    """Récupérer la liste des partenaires - NOUVELLE ROUTE MANQUANTE"""
    try:
        logging.info("📡 GET /partners - Liste des partenaires")
        
        supabase = SupabaseStorage()
        
        try:
            # Récupérer depuis Supabase
            response = supabase.client.table('partners').select('*').execute()
            
            if response.data and len(response.data) > 0:
                partners = []
                for partner in response.data:
                    # Format simplifié pour la liste
                    partner_info = {
                        'id': partner.get('id'),
                        'name': partner.get('name', 'Sans nom'),
                        'description': partner.get('description', ''),
                        'status': partner.get('status', 'active'),
                        'website': partner.get('website', ''),
                        'contact_email': partner.get('contact_email', '')
                    }
                    partners.append(partner_info)
                
                logging.info(f"✅ Liste partenaires récupérée: {len(partners)}")
                
                return jsonify({
                    "success": True,
                    "partners": partners,
                    "count": len(partners),
                    "source": "supabase"
                }), 200
                
            else:
                logging.info("📭 Aucun partenaire trouvé")
                return jsonify({
                    "success": True,
                    "partners": [],
                    "count": 0,
                    "source": "supabase_empty"
                }), 200
                
        except Exception as e:
            logging.error(f"❌ Erreur Supabase /partners: {e}")
            return jsonify({
                "success": False,
                "error": f"Erreur Supabase: {str(e)}",
                "partners": [],
                "count": 0
            }), 500
        
    except Exception as e:
        logging.error(f"❌ Erreur générale /partners: {e}")
        return jsonify({
            "success": False,
            "error": f"Erreur serveur: {str(e)}",
            "partners": [],
            "count": 0
        }), 500

@partner_jobs_api.route('/', methods=['POST'])
def save_partners():
    """Sauvegarder les partenaires - VERSION SUPABASE"""
    try:
        logging.info("💾 POST sauvegarde dans Supabase")
        
        # Validation des données
        data = request.get_json()
        if not data or 'partners' not in data:
            logging.error("❌ Données POST invalides ou manquantes")
            return jsonify({"success": False, "error": "Données invalides - pas de clé 'partners'"}), 400
        
        partners = data['partners']
        if not isinstance(partners, list):
            logging.error(f"❌ Format partners invalide: {type(partners)}")
            return jsonify({"success": False, "error": f"Format invalide - partners doit être une liste, reçu: {type(partners)}"}), 400
        
        logging.info(f"📊 Données reçues: {len(partners)} partenaires")
        
        # Nettoyage des données
        for partner in partners:
            if isinstance(partner, dict):
                if 'contactAddress' not in partner:
                    partner['contactAddress'] = ''
                if 'jobs' not in partner:
                    partner['jobs'] = []
                elif not isinstance(partner['jobs'], list):
                    partner['jobs'] = []
        
        # ✅ UTILISER SUPABASE au lieu de Supabase
        supabase = SupabaseStorage()
        
        try:
            # Supprimer les anciens partenaires
            supabase.client.table('partners').delete().execute()
            
            # Insérer les nouveaux partenaires
            for partner in partners:
                supabase.client.table('partners').insert({
                    'partner_id': f"partner_{partner.get('id', hash(partner.get('name', '')))}",
                    'data': partner
                }).execute()
            
            logging.info(f"✅ {len(partners)} partenaires sauvegardés dans Supabase")
            
            return jsonify({
                "success": True,
                "message": "Partenaires sauvegardés avec succès dans Supabase",
                "count": len(partners),
                "storage": "supabase",
                "supabase_available": True
            }), 200
                
        except Exception as supabase_error:
            logging.error(f"❌ Erreur Supabase pendant sauvegarde: {supabase_error}")
            return jsonify({
                "success": False,
                "error": f"Erreur Supabase: {str(supabase_error)}",
                "supabase_available": True
            }), 500
            
    except Exception as e:
        logging.error(f"❌ Erreur POST sauvegarde: {e}")
        return jsonify({
            "success": False,
            "error": f"Erreur serveur: {str(e)}",
            "supabase_available": False
        }), 500

@partner_jobs_api.route('/debug', methods=['GET'])
def debug_supabase():
    """Endpoint de debug pour inspecter Supabase"""
    try:
        supabase = SupabaseStorage()
        
        # Informations générales
        info = {
            "supabase_available": True,
            "service": "partner_jobs_api"
        }
        
        try:
            # Compter les partenaires
            response = supabase.client.table('partners').select('id').execute()
            info["partners_count"] = len(response.data) if response.data else 0
            info["table_exists"] = True
            
            # Tester une insertion/lecture simple
            test_data = {"test": True, "timestamp": str(datetime.now())}
            
            # Insérer un test
            supabase.client.table('partners').insert({
                'partner_id': 'test_debug',
                'data': test_data
            }).execute()
            
            # Lire le test
            test_response = supabase.client.table('partners').select('*').eq('partner_id', 'test_debug').execute()
            info["write_test"] = "OK"
            info["read_test"] = "OK" if test_response.data else "FAILED"
            
            # Supprimer le test
            supabase.client.table('partners').delete().eq('partner_id', 'test_debug').execute()
            
        except Exception as e:
            info["table_error"] = str(e)
            info["write_test"] = "ERROR"
            info["read_test"] = "NOT_TESTED"
        
        return jsonify(info), 200
        
    except Exception as e:
        return jsonify({
            "error": str(e),
            "supabase_available": False
        }), 200

@partner_jobs_api.route('/health', methods=['GET'])
def health_check():
    """Diagnostic avec Supabase"""
    try:
        # ✅ UTILISER SUPABASE au lieu de Supabase
        supabase = SupabaseStorage()
        supabase_available = True
        
        data_exists = False
        partners_count = 0
        
        try:
            response = supabase.client.table('partners').select('id').execute()
            if response.data:
                data_exists = True
                partners_count = len(response.data)
        except Exception as e:
            logging.error(f"Erreur lecture Supabase dans health: {e}")
            supabase_available = False
        
        return jsonify({
            "status": "healthy",
            "service": "partner_jobs_api_supabase",
            "supabase_available": supabase_available,
            "data_exists": data_exists,
            "partners_count": partners_count,
            "method": "supabase_storage"
        }), 200
        
    except Exception as e:
        return jsonify({
            "status": "error",
            "error": str(e),
            "method": "supabase_storage"
        }), 200
