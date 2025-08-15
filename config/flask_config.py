# config/flask_config.py
"""
Configuration Flask
"""

from flask import Flask
from flask_cors import CORS
from flask_login import LoginManager

def create_app():
    """Crée et configure l'application Flask"""
    from config.app_config import app_config, FRONTEND_BUILD_DIR
    
    # Création de l'application Flask
    app = Flask(__name__, static_folder=None)
    CORS(app, origins=["*"])
    
    # Configuration de base
    app.secret_key = app_config['secret_key']
    
    return app

def init_login_manager(app):
    """Initialise Flask-Login"""
    login_manager = LoginManager()
    login_manager.init_app(app)
    
    @login_manager.user_loader
    def load_user(user_id):
        """Charge un utilisateur par son ID"""
        try:
            from models.user import User
            return User.get(user_id)
        except Exception as e:
            print(f"Erreur chargement utilisateur: {e}")
            return None
    
    return login_manager 