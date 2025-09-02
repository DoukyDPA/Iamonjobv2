"""
Service de gestion des documents
"""
import os
import logging
import PyPDF2
from docx import Document as DocxDocument
from werkzeug.utils import secure_filename
from flask import current_app
from services.supabase_storage import SupabaseStorage

# Fonctions de compatibilité
def get_session_data():
    supabase = SupabaseStorage()
    return supabase.get_session_data()

def save_session_data(data):
    supabase = SupabaseStorage()
    return supabase.save_session_data(data)
from services.ai_service import chat_avec_ia, analyze_job_offer, analyze_metier, generate_document_summary
from datetime import datetime

def extraire_texte_pdf(path):
    """
    Extrait le texte d'un fichier PDF
    
    Args:
        path: Chemin du fichier PDF
        
    Returns:
        str: Texte extrait
    """
    text = ""
    try:
        with open(path, 'rb') as f:
            reader = PyPDF2.PdfReader(f)
            for page in reader.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
        if not text.strip():
            return "Aucun texte (PDF scanné?)."
        return text
    except Exception as e:
        logging.error(f"Erreur extraction PDF: {e}")
        return f"Erreur PDF: {e}"

def extraire_texte_fichier(path):
    """
    Extrait le texte d'un fichier selon son type
    
    Args:
        path: Chemin du fichier
        
    Returns:
        str: Texte extrait
    """
    if not os.path.exists(path):
        return f"Erreur: Fichier {path} introuvable."

    ext = os.path.splitext(path)[1].lower()
    if ext == '.pdf':
        return extraire_texte_pdf(path)
    elif ext == '.txt':
        # Essais d'encodage
        try:
            with open(path, 'r', encoding='utf-8') as f:
                return f.read()
        except UnicodeDecodeError:
            try:
                with open(path, 'r', encoding='latin-1') as f:
                    return f.read()
            except Exception as e:
                logging.error(f"Erreur d'encodage: {e}")
                return f"Erreur encodage .txt: {e}"
        except Exception as e:
            logging.error(f"Erreur lecture TXT: {e}")
            return f"Erreur fichier TXT: {e}"
    elif ext in ['.docx', '.doc']:
        try:
            doc = DocxDocument(path)
            return "\n".join([paragraph.text for paragraph in doc.paragraphs])
        except Exception as e:
            logging.error(f"Erreur lecture Word: {e}")
            return f"Erreur fichier Word: {e}"
    else:
        return f"Type de fichier non pris en charge: {ext}"

def process_uploaded_document(file, doc_type):
    """
    Traite un document téléchargé
    
    Args:
        file: Objet fichier téléchargé
        doc_type: Type de document (cv, offre_emploi)
        
    Returns:
        tuple: (success, message, document_text)
    """
    try:
        if not file.filename:
            return False, "Fichier sans nom", None

        # Vérifier la taille du fichier (max 10MB)
        if file.content_length and file.content_length > 10 * 1024 * 1024:
            return False, "Le fichier est trop volumineux (max 10MB)", None

        # Vérifier le type de fichier
        allowed_types = ['application/pdf', 'application/msword', 
                          'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 
                          'text/plain']
        
        if file.content_type not in allowed_types:
            return False, "Type de fichier non supporté. Formats acceptés : PDF, DOC, DOCX, TXT", None

        # Sauvegarder le fichier
        filename = secure_filename(file.filename)
        upload_folder = current_app.config['UPLOAD_FOLDER']
        
        if not os.path.exists(upload_folder):
            os.makedirs(upload_folder, exist_ok=True)
            
        file_path = os.path.join(upload_folder, filename)
        file.save(file_path)
        
        # Extraire le texte
        document_text = extraire_texte_fichier(file_path)
        
        if document_text.startswith("Erreur"):
            return False, document_text, None
            
        return True, f"Le document {filename} a été téléchargé avec succès", document_text
        
    except Exception as e:
        logging.error(f"Erreur lors du traitement du document: {e}")
        return False, f"Erreur lors du traitement du document: {str(e)}", None



def handle_document_upload(file=None, text_content=None, doc_type="inconnu", user_email=None):
    """
    Gère le téléchargement d'un document (fichier ou texte) de manière unifiée
    
    Args:
        file: Objet fichier téléchargé (optionnel)
        text_content: Texte du document (optionnel)
        doc_type: Type de document (cv, offre_emploi, metier_souhaite, questionnaire)
        
    Returns:
        dict: Résultat du téléchargement avec réponse AI
    """
    try:
        # Initialiser les variables
        texte = ""
        document_name = ""
        
        # Vérifier si c'est un upload de fichier ou de texte
        if file and file.filename:
            # Cas d'un fichier téléchargé
            success, message, texte = process_uploaded_document(file, doc_type)
            if not success:
                return {"success": False, "response": message}
                
            document_name = file.filename
            logging.info(f"Fichier traité avec succès: {document_name}, type: {doc_type}")
            
        elif text_content and text_content.strip():
            # Cas d'un texte collé
            texte = text_content
            
            # Pour l'historique, utiliser un nom générique selon le type
            if doc_type == "cv":
                document_name = "CV collé"
            elif doc_type == "offre_emploi":
                document_name = "Offre d'emploi collée"
            elif doc_type == "metier_souhaite":
                document_name = "Métier souhaité"
            elif doc_type == "questionnaire":
                document_name = "Questionnaire personnel"
            else:
                document_name = "Document collé"
                
            logging.info(f"Texte collé reçu pour document de type {doc_type}")
        else:
            return {"success": False, "response": "Aucun fichier ou texte envoyé"}

        # Vérifier si on a bien le texte et le nom du document
        if not texte or not document_name:
            logging.error("Impossible de récupérer le contenu ou le nom du document")
            return {"success": False, "response": "Impossible de récupérer le contenu du document"}

        # Tronquer pour économiser des tokens - optimisation importante
        max_lengths = {
            "cv": 3000,  # Réduit de 4000 à 3000
            "offre_emploi": 3000,  # Réduit de 4000 à 3000
            "metier_souhaite": 400,  # Réduit de 500 à 400
            "questionnaire": 6000,  # Réduit de 8000 à 6000
            "inconnu": 1500  # Réduit de 2000 à 1500
        }
        maxlen = max_lengths.get(doc_type, 1500)
        
        text_tronque = texte[:maxlen]
        if len(texte) > maxlen:
            text_tronque += "\n[...document tronqué...]"
        
        # Préparer le message pour l'ajout à l'historique
        user_msg = f"Document téléchargé - {doc_type}: {document_name}\n\nContenu:\n\n{text_tronque}"
        
        # Récupérer les données de session
        session_data = get_session_data()

        # Nettoyer l'historique des actions lorsqu'un nouveau document est téléchargé
        if doc_type in ["cv", "offre_emploi", "metier_souhaite", "questionnaire"]:
            try:
                from services.stateless_manager import StatelessDataManager
                StatelessDataManager.clear_generic_actions_history(doc_type, user_email)
                session_data = get_session_data()  # Rafraîchir après purge
                logging.info(f"🗑️ Historique et cache effacés pour nouveau {doc_type}")
            except Exception as e:
                logging.warning(f"⚠️ Erreur lors du nettoyage de l'historique: {e}")
                # Continuer même si le nettoyage échoue
        
        # Ajouter à l'historique
        if 'chat_history' not in session_data:
            session_data['chat_history'] = []
        session_data['chat_history'].append({"role": "user", "content": user_msg})
        
        # Mettre à jour le statut des documents
        if 'documents' not in session_data:
            session_data['documents'] = {}
        session_data['documents'][doc_type] = True

        # Stocker explicitement le contenu du document pour un accès facile
        if 'document_contents' not in session_data:
            session_data['document_contents'] = {}
        session_data['document_contents'][doc_type] = {
            "filename": document_name,
            "content": text_tronque,
            "type": doc_type,
            "timestamp": datetime.now().isoformat()
        }

        # Sauvegarder les données de session
        save_session_data(session_data)
        
        logging.info(f"Document ajouté à l'historique: {doc_type}, {len(session_data['chat_history'])} messages")

        # Extraire le titre du job si c'est une offre d'emploi (pour l'analyse de compatibilité)
        if doc_type == "offre_emploi":
            try:
                # Tentative d'extraction du titre
                job_title = extract_job_title(text_tronque)
                if job_title:
                    session_data['job_title'] = job_title
                    save_session_data(session_data)
                    logging.info(f"Titre du poste extrait: {job_title}")
            except Exception as e:
                logging.warning(f"Erreur lors de l'extraction du titre du poste: {e}")

        # Traitement selon le type de document
        if doc_type == "cv":
            # Utiliser le système unifié avec prompts Supabase
            from services.ai_service_prompts import execute_ai_service
            reponse_ia = execute_ai_service("analyze_cv", texte)
            response = {
                "success": True, 
                "response": reponse_ia, 
                "cached": False,
                "compatibility_triggered": False
            }
            

                    
            return response
            
        elif doc_type == "offre_emploi":
            # Vérifier si un CV est disponible pour analyse comparative
            cv_disponible = session_data['documents'].get('cv', False)
            
            # Utiliser la fonction d'analyse d'offre d'emploi
            reponse_ia = analyze_job_offer(texte)
            response = {
                "success": True, 
                "response": reponse_ia,
                "compatibility_triggered": False,
                "job_title": session_data.get('job_title', "")
            }
            

                    
            return response
            
        elif doc_type == "metier_souhaite":
            # Vérifier si un CV est disponible pour analyse comparative
            cv_disponible = session_data['documents'].get('cv', False)
            
            # Utiliser la fonction d'analyse de métier
            reponse_ia = analyze_metier(texte)
            return {
                "success": True, 
                "response": reponse_ia
            }
            
        elif doc_type == "questionnaire":
            # Stocker le questionnaire dans la session pour une utilisation future
            session_data['questionnaire_data'] = texte
            save_session_data(session_data)
            
            # Informer l'utilisateur
            return {
                "success": True,
                "response": "Votre questionnaire personnel a été enregistré avec succès. Ces informations seront prises en compte avec votre CV lors des analyses."
            }
            
        else:
            return {
                "success": True,
                "response": "Document reçu, mais le type n'est pas reconnu pour une analyse automatique."
            }
    except Exception as e:
        logging.error(f"Erreur lors de la gestion de l'upload: {e}")
        return {"success": False, "response": f"Erreur lors de la gestion de l'upload: {str(e)}"}


def extract_job_title(text):
    """
    Extrait le titre du poste depuis le texte d'une offre d'emploi
    
    Args:
        text: Texte de l'offre d'emploi
        
    Returns:
        str: Titre du poste extrait ou None si non trouvé
    """
    try:
        # Recherche du titre dans les premières lignes
        lines = text.split('\n')
        
        # Motifs courants pour les titres de poste
        title_patterns = [
            r"TITRE DU POSTE:\s*([^\n]+)",
            r"INTITULÉ DU POSTE:\s*([^\n]+)",
            r"POSTE:\s*([^\n]+)",
            r"OFFRE D'EMPLOI.*?([^:]+?)\n",
            r"([^:]+?)\n"  # Capture la première ligne non vide
        ]
        
        # Tester chaque motif
        for pattern in title_patterns:
            for line in lines[:10]:  # Examiner uniquement les 10 premières lignes
                if line.strip():
                    import re
                    match = re.search(pattern, line, re.IGNORECASE)
                    if match:
                        title = match.group(1).strip()
                        if 3 < len(title) < 100:  # Vérifier que le titre a une longueur raisonnable
                            return title
        
        # Si aucun motif ne correspond, utiliser une approche simple
        for line in lines[:10]:
            line = line.strip()
            if line and 3 < len(line) < 100 and not line.startswith("OFFRE D'EMPLOI"):
                return line
                
        return None
    except Exception as e:
        logging.warning(f"Erreur lors de l'extraction du titre: {e}")
        return None
        
def delete_document(doc_type):
    """
    Supprime un document de la session
    
    Args:
        doc_type: Type de document à supprimer
        
    Returns:
        dict: Résultat de la suppression
    """
    try:
        # Récupérer les données de session
        session_data = get_session_data()
        
        # Vérifier si le document existe
        if doc_type not in session_data['documents'] or not session_data['documents'][doc_type]:
            logging.warning(f"Document de type {doc_type} non trouvé ou déjà supprimé")
            return {"success": False, "message": "Document non trouvé ou déjà supprimé"}
        
        # Mettre à jour le statut du document
        session_data['documents'][doc_type] = False
        
        # Filtrer l'historique pour retirer les mentions du document supprimé
        new_history = []
        for msg in session_data.get('chat_history', []):
            # Conserver les messages qui ne sont pas liés au document supprimé
            if msg["role"] == "user" and "Document téléchargé" in msg.get("content", "") and doc_type in msg.get("content", ""):
                # Ne pas inclure ce message dans le nouvel historique
                pass
            else:
                new_history.append(msg)
        
        # Mettre à jour l'historique
        session_data['chat_history'] = new_history
        
        # Sauvegarder les données de session
        save_session_data(session_data)
        
        logging.info(f"Document supprimé: {doc_type}")
        
        # Informer l'utilisateur de la suppression
        return {
            "success": True, 
            "message": f"Document de type {doc_type} supprimé avec succès"
        }
    except Exception as e:
        logging.error(f"Erreur lors de la suppression du document: {e}")
        return {"success": False, "message": f"Erreur: {str(e)}"}
