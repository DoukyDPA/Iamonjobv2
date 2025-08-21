"""
Gestionnaire de configuration centralisé et sécurisé pour IAMONJOB
Singleton pattern pour éviter les chargements multiples
Version hybride pour compatibilité avec l'existant
"""

import os
import logging
from typing import Optional, Dict, Any

class ConfigManager:
    """
    Gestionnaire de configuration singleton pour centraliser
    toutes les variables d'environnement et configurations
    Version hybride : peut fonctionner en parallèle de l'ancienne config
    """
    
    _instance = None
    _config = None
    _initialized = False
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self):
        if not self._initialized:
            self._load_config()
            self._initialized = True
    
    def _load_config(self):
        """Charge la configuration depuis l'environnement avec validation souple"""
        try:
            self._config = {
                # Supabase
                'SUPABASE_URL': os.getenv('SUPABASE_URL'),
                'SUPABASE_ANON_KEY': os.getenv('SUPABASE_ANON_KEY'),
                'SUPABASE_SERVICE_KEY': os.getenv('SUPABASE_SERVICE_KEY'),
                
                # Flask
                'FLASK_SECRET_KEY': os.getenv('FLASK_SECRET_KEY'),
                'FLASK_ENV': os.getenv('FLASK_ENV', 'production'),
                
                # Base de données
                'DATABASE_URL': os.getenv('DATABASE_URL'),
                
                # Cache (optionnel)
                'REDIS_URL': os.getenv('REDIS_URL'),
                'CACHE_TTL': int(os.getenv('CACHE_TTL', '3600')),
                
                # IA
                'MISTRAL_API_KEY': os.getenv('MISTRAL_API_KEY'),
                'AI_MODEL': os.getenv('AI_MODEL', 'mistral-large-latest'),
                
                # Logging
                'LOG_LEVEL': os.getenv('LOG_LEVEL', 'INFO'),
                'LOG_FORMAT': os.getenv('LOG_FORMAT', 'json'),
            }
            
            # Validation de sécurité adaptée à l'environnement
            self._validate_config_for_environment()
            
            # Configuration du logging
            self._setup_logging()
            
            logging.info("✅ Configuration chargée avec succès")
            
        except Exception as e:
            logging.error(f"❌ Erreur lors du chargement de la configuration: {e}")
            # En cas d'erreur, on continue avec une config minimale
            self._config = {}
    
    def _validate_config_for_environment(self):
        """Valide la configuration selon l'environnement"""
        is_prod = self._config.get('FLASK_ENV') == 'production'
        
        if is_prod:
            # En production : validation stricte
            critical_vars = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'FLASK_SECRET_KEY']
            missing_vars = [var for var in critical_vars if not self._config.get(var)]
            
            if missing_vars:
                error_msg = f"Variables critiques manquantes en production: {', '.join(missing_vars)}"
                logging.error(f"🚨 {error_msg}")
                raise ValueError(error_msg)
            
            logging.info("🔒 Configuration de production validée")
        else:
            # En développement : validation souple
            logging.info("🔧 Mode développement : validation souple")
            
            # Afficher les variables disponibles
            available_vars = [var for var, value in self._config.items() if value]
            if available_vars:
                logging.info(f"✅ Variables disponibles: {', '.join(available_vars)}")
            else:
                logging.warning("⚠️ Aucune variable d'environnement détectée")
    
    def _setup_logging(self):
        """Configure le système de logging centralisé"""
        try:
            log_level = getattr(logging, self._config.get('LOG_LEVEL', 'INFO').upper())
            
            logging.basicConfig(
                level=log_level,
                format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
                handlers=[
                    logging.StreamHandler(),
                    logging.FileHandler('app.log') if self._config.get('FLASK_ENV') == 'production' else logging.NullHandler()
                ]
            )
        except Exception as e:
            # Fallback sur logging basique
            logging.basicConfig(level=logging.INFO)
            logging.warning(f"Configuration logging échouée, fallback basique: {e}")
    
    def get(self, key: str, default: Any = None) -> Any:
        """Récupère une valeur de configuration"""
        return self._config.get(key, default)
    
    def get_all(self) -> Dict[str, Any]:
        """Récupère toute la configuration (pour debug)"""
        return self._config.copy()
    
    def is_production(self) -> bool:
        """Vérifie si l'environnement est en production"""
        return self._config.get('FLASK_ENV') == 'production'
    
    def has_cache(self) -> bool:
        """Vérifie si le cache Redis est disponible"""
        return bool(self._config.get('REDIS_URL'))
    
    def get_cache_config(self) -> Dict[str, Any]:
        """Récupère la configuration du cache"""
        return {
            'url': self._config.get('REDIS_URL'),
            'ttl': self._config.get('CACHE_TTL', 3600)
        }
    
    def is_fully_configured(self) -> bool:
        """Vérifie si la configuration est complète"""
        critical_vars = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'FLASK_SECRET_KEY']
        return all(self._config.get(var) for var in critical_vars)
    
    def reload(self):
        """Recharge la configuration (utile pour les tests)"""
        self._config = None
        self._initialized = False
        self._load_config()

# Instance globale pour utilisation facile
config = ConfigManager()

# Fonction utilitaire pour compatibilité
def get_config(key: str, default: Any = None) -> Any:
    """Fonction utilitaire pour récupérer la configuration"""
    return config.get(key, default)

# Fonction de diagnostic
def diagnose_config():
    """Diagnostique la configuration actuelle"""
    print("🔍 Diagnostic de la configuration:")
    print(f"   Environnement: {config.get('FLASK_ENV', 'Non défini')}")
    print(f"   Configuration complète: {'Oui' if config.is_fully_configured() else 'Non'}")
    print(f"   Variables disponibles: {len([v for v in config._config.values() if v])}")
    
    if config.is_fully_configured():
        print("✅ Configuration prête pour la production")
    else:
        print("⚠️ Configuration incomplète (normal en développement)")
        print("   Variables manquantes:")
        for key, value in config._config.items():
            if not value and key in ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'FLASK_SECRET_KEY']:
                print(f"     - {key}")
