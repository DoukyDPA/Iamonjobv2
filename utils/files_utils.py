import os
import PyPDF2
from docx import Document
import logging
import config

def ensure_upload_dir_exists():
    """Vérifie que le dossier des uploads existe et le crée si nécessaire"""
    try:
        os.makedirs(config.UPLOAD_FOLDER, exist_ok=True)
        return True
    except Exception as e:
        logging.error(f"Erreur lors de la création du dossier uploads: {e}")
        return False

def extraire_texte_pdf(path):
    """Extrait le texte d'un fichier PDF"""
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
    """Extrait le texte d'un fichier selon son type"""
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
            doc = Document(path)
            return "\n".join([paragraph.text for paragraph in doc.paragraphs])
        except Exception as e:
            logging.error(f"Erreur lecture Word: {e}")
            return f"Erreur fichier Word: {e}"
    else:
        return f"Type de fichier non pris en charge: {ext}"

def clean_temp_files(directory=None, max_age_hours=24):
    """Nettoie les fichiers temporaires plus anciens qu'un certain âge"""
    import time
    from datetime import timedelta
    
    directory = directory or config.UPLOAD_FOLDER
    if not os.path.exists(directory):
        return
    
    now = time.time()
    max_age_seconds = max_age_hours * 3600
    
    for filename in os.listdir(directory):
        file_path = os.path.join(directory, filename)
        try:
            # Si le fichier est plus vieux que max_age_seconds
            if os.path.isfile(file_path) and now - os.path.getmtime(file_path) > max_age_seconds:
                os.unlink(file_path)
                logging.info(f"Fichier temporaire supprimé: {file_path}")
        except Exception as e:
            logging.error(f"Erreur lors du nettoyage du fichier temporaire {file_path}: {e}")