# config/__init__.py
"""
Package de configuration pour l'application
"""

import os

# Configuration des limites de tokens
DEFAULT_DAILY_TOKEN_LIMIT = int(os.environ.get("DAILY_TOKEN_LIMIT", 50000))
DEFAULT_MONTHLY_TOKEN_LIMIT = int(os.environ.get("MONTHLY_TOKEN_LIMIT", 1000000))

# Clé API pour ChatGPT 4o (OpenAI)
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")

# Configuration du modèle d'IA à utiliser
USE_MISTRAL = os.environ.get("USE_MISTRAL", "False").lower() in ("true", "1", "t")
MISTRAL_API_KEY = os.environ.get("MISTRAL_API_KEY")

# Activer/désactiver le chat utilisateur
ENABLE_USER_CHAT = os.environ.get("ENABLE_USER_CHAT", "True").lower() == "true"

# Informations d'identification admin
ADMIN_USERNAME = os.environ.get('ADMIN_USERNAME')
ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD')

# URL de l'ancien système (pour compatibilité migration)
# REDIS_URL supprimé - migration terminée

# Chemin du dossier d'upload
UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'uploads')

from .app_config import *
from .flask_config import *

__all__ = [
    'INSTANCE_ID',
    'BASE_DIR', 
    'FRONTEND_BUILD_DIR',
    'app_config',
    'DEFAULT_DAILY_TOKEN_LIMIT',
    'DEFAULT_MONTHLY_TOKEN_LIMIT',
    'OPENAI_API_KEY',
    'USE_MISTRAL',
    'MISTRAL_API_KEY',
    'ENABLE_USER_CHAT',
    'ADMIN_USERNAME',
    'ADMIN_PASSWORD',
    'SUPABASE_URL',
    'UPLOAD_FOLDER'
] 
