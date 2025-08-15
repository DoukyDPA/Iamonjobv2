# routes/documents.py
"""
Routes pour la gestion des documents
"""

from flask import Blueprint, request, jsonify, session
from datetime import datetime
import os
import tempfile
from services.stateless_manager import StatelessDataManager
from utils.files_utils import extraire_texte_fichier

# Créer le blueprint
documents_bp = Blueprint('documents', __name__)

@documents_bp.route('/api/documents/status', methods=['GET'])
def api_documents_status():
    """Statut des documents"""
    try:
        user_data = StatelessDataManager.get_user_data()
        documents = user_data.get('documents', {})
        
        # Structure par défaut pour tous les types de documents
        default_structure = {
            'uploaded': False,
            'processed': False,
            'name': None,
            'size': None
        }
        
        # Retourner les données formatées avec structure cohérente
        documents_status = {}
        for doc_type in ['cv', 'offre_emploi', 'metier_souhaite', 'questionnaire']:
            status = documents.get(doc_type, default_structure)
            
            if isinstance(status, dict):
                # Structure moderne (objet)
                documents_status[doc_type] = {
                    'uploaded': status.get('uploaded', False),
                    'processed': status.get('processed', False),
                    'name': status.get('name', None),
                    'size': status.get('size', None)
                }
            else:
                # Structure legacy (booléen) - migration automatique
                documents_status[doc_type] = {
                    'uploaded': bool(status),
                    'processed': bool(status),
                    'name': None,
                    'size': None
                }
        
        return jsonify({
            "success": True,
            "documents": documents_status,
            "source": "supabase",
            "worker_pid": os.getpid()
        }), 200
        
    except Exception as e:
        print(f"❌ Erreur status: {e}")
        return jsonify({"error": f"Erreur: {str(e)}"}), 500

@documents_bp.route('/api/documents/upload', methods=['POST'])
def api_documents_upload():
    """Upload de document avec PURGE AUTOMATIQUE du cache"""
    try:
        # Vérifications de base
        if 'document' not in request.files:
            return jsonify({"error": "Aucun fichier fourni"}), 400
            
        file = request.files['document']
        document_type = request.form.get('document_type', 'cv')
        
        if not file or not file.filename:
            return jsonify({"error": "Aucun fichier sélectionné"}), 400
        
        # Vérifications de sécurité
        allowed_extensions = {'txt', 'pdf', 'doc', 'docx'}
        if not ('.' in file.filename and 
                file.filename.rsplit('.', 1)[1].lower() in allowed_extensions):
            return jsonify({"error": "Type de fichier non autorisé"}), 400
        
        # 🗑️ PURGE AUTOMATIQUE SI NOUVEAU DOCUMENT
        if document_type in ['cv', 'offre_emploi', 'questionnaire']:
            print(f"🗑️ PURGE AUTOMATIQUE DU CACHE POUR NOUVEAU {document_type.upper()}")
            try:
                # Utiliser la nouvelle fonction centralisée
                StatelessDataManager.clear_generic_actions_history(document_type)
                print(f"✅ Cache purgé automatiquement pour nouveau {document_type}")
                
            except Exception as e:
                print(f"⚠️ Erreur lors de la purge automatique: {e}")
                # Continuer même si la purge échoue
        
        # ✅ EXTRACTION RÉELLE du contenu
        import tempfile

        # Sauvegarder temporairement le fichier pour extraction
        with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(file.filename)[1]) as temp_file:
            file.save(temp_file.name)
            
            # Extraire le vrai contenu du fichier
            file_content = extraire_texte_fichier(temp_file.name)
            
            # Nettoyer le fichier temporaire
            os.unlink(temp_file.name)

        # Vérifier si l'extraction a réussi
        if file_content.startswith("Erreur"):
            return jsonify({"error": f"Impossible d'extraire le contenu: {file_content}"}), 400

        print(f"📄 Contenu extrait - Longueur: {len(file_content)} caractères")
        print(f"📄 Aperçu: {file_content[:200]}...")
        
        # Mise à jour atomique avec le VRAI contenu
        doc_data = {
            'uploaded': True,
            'processed': True,
            'name': file.filename,
            'size': len(file_content),
            'content': file_content,  # ✅ VRAI CONTENU
            'upload_timestamp': datetime.now().isoformat()
        }
        
        StatelessDataManager.update_document_atomic(document_type, doc_data)
        
        print(f"✅ Nouveau {document_type} uploadé avec purge automatique")
        
        return jsonify({
            "success": True,
            "message": f"Document {document_type} uploadé avec succès",
            "document_type": document_type,
            "filename": file.filename,
            "cache_purged": document_type == 'cv'  # Indiquer si le cache a été purgé
        }), 200
        
    except Exception as e:
        print(f"❌ Erreur upload: {e}")
        return jsonify({"error": f"Erreur: {str(e)}"}), 500

@documents_bp.route('/api/documents/upload-text', methods=['POST'])
def api_documents_upload_text():
    """Upload de texte avec PURGE AUTOMATIQUE du cache"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({"error": "Données manquantes"}), 400
            
        text_content = data.get('text')
        document_type = data.get('document_type', 'questionnaire')
        
        if not text_content or not text_content.strip():
            return jsonify({"error": "Contenu texte manquant"}), 400
        
        # 🗑️ PURGE AUTOMATIQUE SI NOUVEAU DOCUMENT
        if document_type in ['cv', 'offre_emploi', 'questionnaire']:
            print(f"🗑️ PURGE AUTOMATIQUE DU CACHE POUR NOUVEAU {document_type.upper()} (texte)")
            try:
                # Utiliser la nouvelle fonction centralisée
                StatelessDataManager.clear_generic_actions_history(document_type)
                print(f"✅ Cache purgé automatiquement pour nouveau {document_type}")
                
            except Exception as e:
                print(f"⚠️ Erreur lors de la purge automatique: {e}")
                # Continuer même si la purge échoue
        
        print(f"📝 Upload texte - Type: {document_type}, Longueur: {len(text_content)}")
        print(f"📝 Aperçu contenu: {text_content[:100]}...")
        
        # ✅ STOCKAGE DIRECT DU VRAI CONTENU
        doc_data = {
            'uploaded': True,
            'processed': True,
            'name': f"{document_type.title()} personnel",
            'size': len(text_content),
            'content': text_content,  # ✅ VRAI CONTENU
            'upload_timestamp': datetime.now().isoformat()
        }
        
        # ✅ STOCKAGE ATOMIQUE DIRECT
        success = StatelessDataManager.update_document_atomic(document_type, doc_data)
        
        if success:
            print(f"✅ VRAI contenu stocké pour {document_type}")
            return jsonify({
                "success": True,
                "message": f"{document_type.title()} enregistré avec succès",
                "document_type": document_type,
                "processed": True,
                "cache_purged": document_type == 'cv',  # Indiquer si le cache a été purgé
                "worker_pid": os.getpid()
            }), 200
        else:
            print(f"❌ Erreur sauvegarde pour {document_type}")
            return jsonify({"error": "Échec sauvegarde en base"}), 500
            
    except Exception as e:
        print(f"❌ Erreur critique upload-text: {e}")
        return jsonify({"error": f"Erreur: {str(e)}"}), 500

@documents_bp.route('/api/documents/paste', methods=['POST'])
def api_documents_paste():
    """Upload de texte avec stockage atomique"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "Données manquantes"}), 400
        
        content = data.get('content', '').strip()
        document_type = data.get('document_type', 'cv')
        
        if not content:
            return jsonify({"error": "Contenu vide"}), 400
        
        # Sauvegarde atomique
        doc_data = {
            'uploaded': True,
            'processed': False,
            'name': 'Texte collé',
            'size': len(content),
            'content': content,
            'upload_timestamp': datetime.now().isoformat()
        }
        
        success = StatelessDataManager.update_document_atomic(document_type, doc_data)
        
        if success:
            return jsonify({
                "success": True,
                "message": "Texte enregistré avec succès",
                "processed": True,
                "worker_pid": os.getpid()
            }), 200
        else:
            return jsonify({"error": "Échec sauvegarde"}), 500
        
    except Exception as e:
        print(f"Erreur paste: {e}")
        return jsonify({"error": f"Erreur paste: {str(e)}"}), 500

@documents_bp.route('/api/documents/delete/<document_type>', methods=['DELETE'])
def api_documents_delete(document_type):
    """Suppression de document avec stockage atomique"""
    try:
        current_data = StatelessDataManager.get_user_data()
        
        if 'documents' in current_data and document_type in current_data['documents']:
            del current_data['documents'][document_type]
            success = StatelessDataManager.save_user_data(current_data)
            
            if success:
                return jsonify({
                    "success": True,
                    "message": f"Document {document_type} supprimé",
                    "worker_pid": os.getpid()
                }), 200
            else:
                return jsonify({"error": "Échec suppression"}), 500
        else:
            return jsonify({
                "success": True,
                "message": f"Document {document_type} n'existait pas"
            }), 200
        
    except Exception as e:
        print(f"Erreur delete: {e}")
        return jsonify({"error": f"Erreur delete: {str(e)}"}), 500

@documents_bp.route('/api/documents/upload-offre-partenaire', methods=['POST'])
def api_upload_offre_partenaire():
    """Importe une offre partenaire - VERSION COHÉRENTE avec vos routes existantes"""
    try:
        data = request.get_json()
        offre = data.get('offre')
        
        if not offre:
            return jsonify({
                'success': False, 
                'error': 'Aucune offre fournie'
            }), 400

        # Utiliser StatelessDataManager comme vos autres routes
        user_data = StatelessDataManager.get_user_data()
        
        # 🗑️ PURGE AUTOMATIQUE POUR NOUVELLE OFFRE PARTENAIRE
        print("🗑️ PURGE AUTOMATIQUE DU CACHE POUR NOUVELLE OFFRE PARTENAIRE")
        try:
            # Utiliser la nouvelle fonction centralisée
            StatelessDataManager.clear_generic_actions_history('offre_emploi')
            print("✅ Cache purgé automatiquement pour nouvelle offre partenaire")
            
        except Exception as e:
            print(f"⚠️ Erreur lors de la purge automatique: {e}")
            # Continuer même si la purge échoue
        
        # S'assurer que la structure documents existe
        if 'documents' not in user_data:
            user_data['documents'] = {}

        # Préparer les données de l'offre pour l'IA et l'utilisateur
        offre_content = offre.get('detailedDescription', '') or offre.get('description', '')
        
        # Si pas de contenu détaillé, le générer à partir des infos disponibles
        if not offre_content or len(offre_content.strip()) < 100:
            offre_content = f"""
OFFRE D'EMPLOI - {offre.get('partnerName', 'Entreprise partenaire')}

POSTE: {offre.get('title', 'Poste non spécifié')}
ENTREPRISE: {offre.get('partnerName', 'Non spécifié')}
SECTEUR: {offre.get('partnerSector', 'Non spécifié')}
LOCALISATION: {offre.get('location', 'Non spécifié')}
TYPE DE CONTRAT: {offre.get('contractType', 'Non spécifié')}
SALAIRE: {offre.get('salary', 'Non spécifié')}

DESCRIPTION:
{offre.get('description', 'Description non disponible')}

COMPÉTENCES RECHERCHÉES:
{', '.join(offre.get('skills', [])) if offre.get('skills') else 'Non spécifiées'}

CONTACT:
{offre.get('contactAddress', 'Non spécifié')}
            """.strip()

        # Préparer les données complètes de l'offre (format cohérent avec vos autres routes)
        offre_data = {
            'uploaded': True,
            'processed': True,
            'content': offre_content,
            'title': offre.get('title', 'Offre partenaire'),
            'name': f"Offre {offre.get('title', 'partenaire')} - {offre.get('partnerName', 'Entreprise')}.txt",
            'size': len(offre_content.encode('utf-8')),
            'source': 'partenaire',
            'upload_timestamp': datetime.now().isoformat(),
            'partner_info': {
                'partner_name': offre.get('partnerName'),
                'partner_id': offre.get('partnerId'),
                'partner_logo': offre.get('partnerLogo'),
                'partner_sector': offre.get('partnerSector'),
                'contact_address': offre.get('contactAddress'),
                'website': offre.get('website')
            },
            'job_details': {
                'title': offre.get('title'),
                'location': offre.get('location'),
                'contract_type': offre.get('contractType'),
                'salary': offre.get('salary'),
                'skills': offre.get('skills', []),
                'experience': offre.get('experience'),
                'remote': offre.get('remote', False)
            },
            'raw_data': offre  # Conserver toutes les données originales
        }
        
        # Utiliser la même méthode que vos autres routes - update_document_atomic
        success = StatelessDataManager.update_document_atomic('offre_emploi', offre_data)
        
        if success:
            # Ajouter un message dans l'historique de chat pour informer l'utilisateur
            user_data = StatelessDataManager.get_user_data()  # Récupérer les données mises à jour
            if 'chat_history' not in user_data:
                user_data['chat_history'] = []
            
            partner_name = offre.get('partnerName', 'Entreprise partenaire')
            job_title = offre.get('title', 'Poste')
            
            import_message = f"""🎯 **Offre d'emploi importée avec succès !**

**📋 Poste :** {job_title}
**🏢 Entreprise :** {partner_name}
**📍 Lieu :** {offre.get('location', 'Non spécifié')}
**💼 Contrat :** {offre.get('contractType', 'Non spécifié')}

Cette offre remplace votre précédente offre d'emploi. Vous pouvez maintenant :
• **Analyser la compatibilité** avec votre CV
• **Générer une lettre de motivation** personnalisée  
• **Préparer votre entretien** d'embauche
• **Obtenir des conseils** personnalisés

Utilisez les services dans l'onglet "Services" pour continuer ! ✨"""

            user_data['chat_history'].append({
                'role': 'assistant',
                'content': import_message,
                'timestamp': datetime.now().isoformat(),
                'type': 'partner_import_success'
            })
            
            # Sauvegarder l'historique mis à jour
            StatelessDataManager.save_user_data(user_data)
            
            print(f"✅ Offre partenaire importée: {job_title} de {partner_name}")
            
            return jsonify({
                'success': True, 
                'message': f'Offre "{job_title}" de {partner_name} importée avec succès',
                'worker_pid': os.getpid(),
                'offer_details': {
                    'title': job_title,
                    'company': partner_name,
                    'location': offre.get('location'),
                    'contract_type': offre.get('contractType')
                }
            }), 200
        else:
            print("❌ Échec sauvegarde offre partenaire")
            return jsonify({
                'success': False, 
                'error': 'Erreur lors de la sauvegarde de l\'offre'
            }), 500
            
    except Exception as e:
        print(f"❌ Erreur lors de l'import d'une offre partenaire: {e}")
        return jsonify({
            'success': False, 
            'error': f'Erreur serveur: {str(e)}'
        }), 500

def register_documents_routes(app):
    """Enregistre les routes de documents dans l'application Flask"""
    app.register_blueprint(documents_bp) 
