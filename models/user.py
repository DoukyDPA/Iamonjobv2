"""
Modèle utilisateur pour l'application IAMONJOB
"""
from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash
import logging
import uuid
from datetime import datetime
from flask import current_app

# Import du service Supabase
def get_supabase_client():
    """Récupère le client Supabase depuis l'application Flask"""
    try:
        # Essayer de récupérer depuis l'application Flask
        if current_app and hasattr(current_app, 'supabase'):
            return current_app.supabase
        # Fallback : importer directement
        from services.supabase_storage import SupabaseStorage
        storage = SupabaseStorage()
        return storage.client if storage else None
    except Exception as e:
        logging.error(f"Erreur lors de la récupération du client Supabase: {e}")
        return None

class User(UserMixin):
    """
    Modèle utilisateur pour Flask-Login
    """
    def __init__(self, id, email, password_hash, is_admin=False):
        self.id = id
        self.email = email
        self.password_hash = password_hash
        self.is_admin = is_admin

    @staticmethod
    def get(user_id):
        """Récupère un utilisateur depuis Supabase par son ID"""
        try:
            supabase_client = get_supabase_client()
            if not supabase_client:
                logging.error("Client Supabase non disponible")
                return None
                
            # Récupérer l'utilisateur depuis la table users
            response = supabase_client.table('users').select('*').eq('id', user_id).execute()
            
            if response.data and len(response.data) > 0:
                user_data = response.data[0]
                
                # Vérifier si l'utilisateur est admin
                is_admin = user_data.get('is_admin', False)
                if isinstance(is_admin, str):
                    is_admin = is_admin.lower() == 'true'
                
                email = user_data.get('email', '')
                password_hash = user_data.get('password_hash', '')
                
                if not email or not password_hash:
                    logging.error(f"Données utilisateur incomplètes pour {user_id}")
                    return None
                
                logging.info(f"User.get: Utilisateur récupéré - ID: {user_id}, Email: {email}")
                return User(
                    id=user_id,
                    email=email,
                    password_hash=password_hash,
                    is_admin=is_admin
                )
            else:
                logging.warning(f"User.get: Aucune donnée trouvée pour l'utilisateur {user_id}")
        except Exception as e:
            logging.error(f"Erreur lors de la récupération de l'utilisateur: {e}")
        return None

    @staticmethod
    def get_by_email(email):
        """Récupère un utilisateur par son email"""
        try:
            supabase_client = get_supabase_client()
            if not supabase_client:
                logging.error("Client Supabase non disponible")
                return None
                
            # Récupérer l'utilisateur depuis la table users par email
            response = supabase_client.table('users').select('*').eq('email', email).execute()
            
            if response.data and len(response.data) > 0:
                user_data = response.data[0]
                user_id = user_data.get('id')
                
                logging.info(f"User.get_by_email: email={email}, user_id={user_id}")
                return User.get(user_id)
            else:
                logging.warning(f"User.get_by_email: Aucun utilisateur trouvé pour l'email {email}")
        except Exception as e:
            logging.error(f"Erreur lors de la récupération de l'utilisateur par email: {e}")
        return None

    @staticmethod
    def create(email, password, is_admin=False):
        """Crée un nouvel utilisateur"""
        try:
            supabase_client = get_supabase_client()
            if not supabase_client:
                logging.error("Client Supabase non disponible")
                return None
                
            # Note: La vérification d'email est maintenant faite dans l'API
            # pour éviter les doubles vérifications et les problèmes de race condition
            print(f"🔧 DEBUG User.create: Création utilisateur pour email: {email}")
            
            # Générer un nouvel ID unique
            user_id = str(uuid.uuid4())
            password_hash = generate_password_hash(password)

            # Créer l'utilisateur dans la table users (sans colonnes optionnelles)
            user_data = {
                'id': user_id,
                'email': email,
                'password_hash': password_hash,
                'is_admin': is_admin
            }
            
            print(f"🔧 DEBUG User.create: Données utilisateur à insérer: {user_data}")
            response = supabase_client.table('users').insert(user_data).execute()
            print(f"🔧 DEBUG User.create: Réponse Supabase: {response.data}")
            
            if response.data and len(response.data) > 0:
                logging.info(f"User.create: Utilisateur créé avec succès - ID: {user_id}, Email: {email}")
                return User(id=user_id, email=email, password_hash=password_hash, is_admin=is_admin)
            else:
                logging.error("User.create: Erreur lors de l'insertion dans Supabase")
                return None
                
        except Exception as e:
            logging.error(f"Erreur lors de la création de l'utilisateur: {e}")
            return None

    @staticmethod
    def authenticate(email, password):
        """Authentifie un utilisateur"""
        try:
            logging.info(f"User.authenticate: Tentative d'authentification pour {email}")
            
            user = User.get_by_email(email)
            if user:
                logging.info(f"User.authenticate: Utilisateur trouvé, ID: {user.id}")
                logging.info(f"User.authenticate: Hash du mot de passe récupéré: {user.password_hash[:20]}...")
                
                # Vérifier le mot de passe
                password_valid = check_password_hash(user.password_hash, password)
                logging.info(f"User.authenticate: Mot de passe valide: {password_valid}")
                
                if password_valid:
                    logging.info(f"User.authenticate: Authentification réussie pour {email}")
                    return user
                else:
                    logging.warning(f"User.authenticate: Mot de passe incorrect pour {email}")
            else:
                logging.warning(f"User.authenticate: Aucun utilisateur trouvé pour {email}")
            
            return None
        except Exception as e:
            logging.error(f"User.authenticate: Erreur lors de l'authentification de {email}: {e}")
            return None
        
    @staticmethod
    def delete(user_id):
        """Supprime un utilisateur par son ID"""
        try:
            supabase_client = get_supabase_client()
            if not supabase_client:
                logging.error("Client Supabase non disponible")
                return False
            
            # Récupérer l'utilisateur pour avoir son email
            user = User.get(user_id)
            if not user:
                return False
            
            # Supprimer l'utilisateur de la table users
            response = supabase_client.table('users').delete().eq('id', user_id).execute()
            
            if response.data:
                logging.info(f"Utilisateur {user_id} ({user.email}) supprimé avec succès")
                return True
            else:
                logging.error(f"Erreur lors de la suppression de l'utilisateur {user_id}")
                return False
                
        except Exception as e:
            logging.error(f"Erreur lors de la suppression de l'utilisateur: {e}")
            return False

    @staticmethod
    def list_all():
        """Retourne la liste de tous les utilisateurs enregistrés"""
        try:
            supabase_client = get_supabase_client()
            if not supabase_client:
                logging.error("Client Supabase non disponible")
                return []
                
            response = supabase_client.table('users').select('id, email, is_admin').execute()
            
            if response.data:
                users = []
                for user_data in response.data:
                    user = User(
                        id=user_data.get('id'),
                        email=user_data.get('email', ''),
                        password_hash='',  # Ne pas exposer les mots de passe
                        is_admin=user_data.get('is_admin', False)
                    )
                    users.append(user)
                return users
            else:
                return []
                
        except Exception as e:
            logging.error(f"Erreur lors de la récupération de la liste des utilisateurs: {e}")
            return []

    @staticmethod
    def set_admin_status(user_id, is_admin):
        """Met à jour le statut administrateur d'un utilisateur"""
        try:
            supabase_client = get_supabase_client()
            if not supabase_client:
                logging.error("Client Supabase non disponible")
                return False
            
            response = supabase_client.table('users').update({
                'is_admin': is_admin
            }).eq('id', user_id).execute()
            
            if response.data:
                logging.info(f"Statut admin de l'utilisateur {user_id} mis à jour: {is_admin}")
                return True
            else:
                logging.error(f"Erreur lors de la mise à jour du statut admin de l'utilisateur {user_id}")
                return False
                
        except Exception as e:
            logging.error(f"Erreur lors de la mise à jour du statut admin: {e}")
            return False

    @staticmethod
    def update(user_id, **kwargs):
        """Met à jour un utilisateur"""
        try:
            supabase_client = get_supabase_client()
            if not supabase_client:
                logging.error("Client Supabase non disponible")
                return False
            
            # Préparer les données de mise à jour
            update_data = {}
            allowed_fields = ['email', 'password_hash', 'is_admin']
            
            for field, value in kwargs.items():
                if field in allowed_fields:
                    if field == 'password' and value:
                        update_data['password_hash'] = generate_password_hash(value)
                    elif field != 'password':
                        update_data[field] = value
            
            if not update_data:
                logging.warning("Aucun champ valide à mettre à jour")
                return False
            
            # Mettre à jour l'utilisateur (sans colonnes optionnelles)
            response = supabase_client.table('users').update(update_data).eq('id', user_id).execute()
            
            if response.data:
                logging.info(f"Utilisateur {user_id} mis à jour avec succès")
                return True
            else:
                logging.error(f"Erreur lors de la mise à jour de l'utilisateur {user_id}")
                return False
                
        except Exception as e:
            logging.error(f"Erreur lors de la mise à jour de l'utilisateur: {e}")
            return False

    def get_id(self):
        """Retourne l'ID de l'utilisateur pour Flask-Login"""
        return str(self.id)

    def is_authenticated(self):
        """Vérifie si l'utilisateur est authentifié"""
        return True

    def is_active(self):
        """Vérifie si l'utilisateur est actif"""
        return True

    def is_anonymous(self):
        """Vérifie si l'utilisateur est anonyme"""
        return False

