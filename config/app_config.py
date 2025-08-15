# config/app_config.py
"""
Configuration de l'application
"""

import os
import uuid

# Variable globale pour identifier l'instance
INSTANCE_ID = str(uuid.uuid4())[:8]

# Configuration des chemins
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FRONTEND_BUILD_DIR = os.path.join(BASE_DIR, 'frontend', 'build')

# Configuration de l'application
app_config = {
    'secret_key': os.environ.get("FLASK_SECRET_KEY", "dev_secret_key"),
            'supabase_url': os.environ.get('SUPABASE_URL'),
    'debug': os.environ.get('FLASK_DEBUG', 'False').lower() == 'true',
    'host': os.environ.get('HOST', '0.0.0.0'),
    'port': int(os.environ.get('PORT', 8080))
} 