# config/__init__.py - Configuration Professionnelle
"""
Module de configuration centralisé pour IAMONJOB
Architecture professionnelle avec gestion d'environnements
"""

import os
import logging
from dataclasses import dataclass
from typing import Optional, Dict, Any

@dataclass
class DatabaseConfig:
    """Configuration base de données"""
    url: str
    ssl_enabled: bool = False
    connection_timeout: int = 10
    retry_attempts: int = 3

@dataclass
class AIConfig:
    """Configuration services IA"""
    openai_api_key: Optional[str] = None
    mistral_api_key: Optional[str] = None
    use_mistral: bool = False
    default_model: str = "gpt-4"
    max_tokens: int = 2000
    temperature: float = 0.7

@dataclass
class SecurityConfig:
    """Configuration sécurité"""
    secret_key: str
    csrf_enabled: bool = True
    session_lifetime: int = 86400  # 24h
    max_login_attempts: int = 5
    lockout_duration: int = 3600  # 1h

@dataclass
class LimitsConfig:
    """Configuration limites utilisateur"""
    daily_token_limit: int = 50000
    monthly_token_limit: int = 1000000
    max_file_size_mb: int = 16
    max_files_per_user: int = 10

@dataclass
class AdminConfig:
    """Configuration administrateur"""
    username: str
    password: str
    session_timeout: int = 7200  # 2h

class AppConfig:
    """
    Configuration principale de l'application
    Suit les bonnes pratiques de configuration par environnement
    """
    
    def __init__(self, environment: str = None):
        self.environment = environment or os.environ.get('FLASK_ENV', 'development')
        self._load_config()
        self._validate_config()
    
    def _load_config(self):
        """Charge la configuration selon l'environnement"""
        
        # Configuration base de données
        self.database = DatabaseConfig(
            url=os.environ.get('SUPABASE_URL', ''),
            ssl_enabled=self._detect_ssl_requirement(),
            connection_timeout=int(os.environ.get('SUPABASE_TIMEOUT', 10)),
            retry_attempts=int(os.environ.get('SUPABASE_RETRY_ATTEMPTS', 3))
        )
        
        # Configuration IA
        self.ai = AIConfig(
            openai_api_key=os.environ.get('OPENAI_API_KEY'),
            mistral_api_key=os.environ.get('MISTRAL_API_KEY'),
            use_mistral=os.environ.get('USE_MISTRAL', 'False').lower() == 'true',
            default_model=os.environ.get('DEFAULT_AI_MODEL', 'gpt-4'),
            max_tokens=int(os.environ.get('MAX_AI_TOKENS', 2000)),
            temperature=float(os.environ.get('AI_TEMPERATURE', 0.7))
        )
        
        # Configuration sécurité
        self.security = SecurityConfig(
            secret_key=self._get_secret_key(),
            csrf_enabled=os.environ.get('CSRF_ENABLED', 'True').lower() == 'true',
            session_lifetime=int(os.environ.get('SESSION_LIFETIME', 86400)),
            max_login_attempts=int(os.environ.get('MAX_LOGIN_ATTEMPTS', 5)),
            lockout_duration=int(os.environ.get('LOCKOUT_DURATION', 3600))
        )
        
        # Configuration limites
        self.limits = LimitsConfig(
            daily_token_limit=int(os.environ.get('DAILY_TOKEN_LIMIT', 50000)),
            monthly_token_limit=int(os.environ.get('MONTHLY_TOKEN_LIMIT', 1000000)),
            max_file_size_mb=int(os.environ.get('MAX_FILE_SIZE_MB', 16)),
            max_files_per_user=int(os.environ.get('MAX_FILES_PER_USER', 10))
        )
        
        # Configuration admin
        admin_username = os.environ.get('ADMIN_USERNAME')
        admin_password = os.environ.get('ADMIN_PASSWORD')
        
        if admin_username and admin_password:
            self.admin = AdminConfig(
                username=admin_username,
                password=admin_password,
                session_timeout=int(os.environ.get('ADMIN_SESSION_TIMEOUT', 7200))
            )
        else:
            self.admin = None
        
        # Configuration serveur
        self.server = {
            'host': os.environ.get('HOST', '0.0.0.0'),
            'port': int(os.environ.get('PORT', 8080)),
            'debug': self.environment == 'development',
            'workers': int(os.environ.get('GUNICORN_WORKERS', 2)),
            'timeout': int(os.environ.get('GUNICORN_TIMEOUT', 120))
        }
        
        # Chemins
        self.paths = {
            'base_dir': os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
            'upload_dir': os.path.join(os.getcwd(), 'uploads'),
            'log_dir': os.path.join(os.getcwd(), 'logs'),
            'frontend_build': os.path.join(os.getcwd(), 'frontend', 'build')
        }
        
        # S'assurer que les dossiers existent
        for path in [self.paths['upload_dir'], self.paths['log_dir']]:
            os.makedirs(path, exist_ok=True)
    
    def _detect_ssl_requirement(self) -> bool:
        """Détecte automatiquement si SSL est requis"""
        supabase_url = os.environ.get('SUPABASE_URL', '')
        return any(provider in supabase_url.lower() for provider in ['supabase', 'supabase.co'])
    
    def _get_secret_key(self) -> str:
        """Récupère la clé secrète avec validation"""
        secret_key = os.environ.get('FLASK_SECRET_KEY')
        
        if not secret_key:
            if self.environment == 'production':
                raise ValueError("FLASK_SECRET_KEY est obligatoire en production")
            
            logging.warning("⚠️ Utilisation d'une clé secrète de développement")
            return 'dev-secret-key-not-for-production'
        
        if len(secret_key) < 32:
            logging.warning("⚠️ Clé secrète trop courte (recommandé: 32+ caractères)")
        
        return secret_key
    
    def _validate_config(self):
        """Valide la configuration et affiche des avertissements"""
        
        # Validation IA
        if not self.ai.openai_api_key and not self.ai.mistral_api_key:
            logging.warning("⚠️ Aucune clé API IA configurée - Fonctionnalités limitées")
        
        # Validation admin
        if not self.admin:
            logging.warning("⚠️ Compte administrateur non configuré")
        
        # Validation production
        if self.environment == 'production':
            self._validate_production_config()
    
    def _validate_production_config(self):
        """Validations spécifiques à la production"""
        issues = []
        
        if self.server['debug']:
            issues.append("Mode debug activé en production")
        
        if 'localhost' in self.database.url:
            issues.append("URL de base de données pointe vers localhost en production")
        
        if self.security.secret_key.startswith('dev-'):
            issues.append("Clé secrète de développement utilisée en production")
        
        if issues:
            error_msg = "❌ Problèmes de configuration production:\n" + "\n".join(f"  - {issue}" for issue in issues)
            raise RuntimeError(error_msg)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convertit la configuration en dictionnaire (pour debug)"""
        return {
            'environment': self.environment,
            'database': {
                'url_masked': self.database.url[:20] + '***' if len(self.database.url) > 20 else self.database.url,
                'ssl_enabled': self.database.ssl_enabled
            },
            'ai': {
                'openai_configured': bool(self.ai.openai_api_key),
                'mistral_configured': bool(self.ai.mistral_api_key),
                'use_mistral': self.ai.use_mistral
            },
            'admin_configured': bool(self.admin),
            'server': self.server
        }

# Instance globale de configuration
config = AppConfig()

# Exports pour compatibilité avec l'ancien système
DEFAULT_DAILY_TOKEN_LIMIT = config.limits.daily_token_limit
DEFAULT_MONTHLY_TOKEN_LIMIT = config.limits.monthly_token_limit
OPENAI_API_KEY = config.ai.openai_api_key
MISTRAL_API_KEY = config.ai.mistral_api_key
USE_MISTRAL = config.ai.use_mistral
        SUPABASE_URL = config.database.url
ADMIN_USERNAME = config.admin.username if config.admin else None
ADMIN_PASSWORD = config.admin.password if config.admin else None
UPLOAD_FOLDER = config.paths['upload_dir']

# Log de la configuration au démarrage
logging.info("✅ Configuration IAMONJOB chargée:")
for key, value in config.to_dict().items():
    logging.info(f"  {key}: {value}")
