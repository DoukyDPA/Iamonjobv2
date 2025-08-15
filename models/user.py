"""
Modèle utilisateur pour l'application IAMONJOB
"""
from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash
import logging

# Import du service Supabase (importation circulaire évitée avec import fonctionnel)
def get_supabase_service():
    from services.supabase_storage import SupabaseStorage

def SupabaseStorage():
    # Compatibilité - retourne Supabase
    return SupabaseStorage()
    return SupabaseStorage()

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
            supabase_service = get_supabase_service()
            if not supabase_service:
                logging.error("Supabase service non disponible")
                return None
                
            user_data = supabase_service.hgetall(f"user:{user_id}")
            if user_data:
                # Les clés dans Supabase peuvent être des bytes ou des strings selon la configuration.
                # On récupère toujours en utilisant des clés string et on gère les deux types.

                # Vérifier si l'utilisateur est admin
                is_admin_value = user_data.get('is_admin', 'false')
                if isinstance(is_admin_value, bytes):
                    is_admin_value = is_admin_value.decode('utf-8')
                is_admin = str(is_admin_value).lower() == 'true'

                # Récupérer l'email avec vérification
                email_value = user_data.get('email')
                if isinstance(email_value, bytes):
                    email_value = email_value.decode('utf-8')
                if not email_value:
                    logging.error(f"Email manquant pour l'utilisateur {user_id}")
                    return None
                email = str(email_value)

                # Récupérer le hash du mot de passe avec vérification
                password_hash_value = user_data.get('password_hash')
                if isinstance(password_hash_value, bytes):
                    password_hash_value = password_hash_value.decode('utf-8')
                if not password_hash_value:
                    logging.error(f"Hash du mot de passe manquant pour l'utilisateur {user_id}")
                    return None
                password_hash = str(password_hash_value)
                
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
            supabase_service = get_supabase_service()
            if not supabase_service:
                logging.error("Supabase service non disponible")
                return None
                
            user_id = supabase_service.get(f"email_to_id:{email}")
            if user_id:
                # Gérer le cas où user_id peut être bytes ou string
                if isinstance(user_id, bytes):
                    user_id = user_id.decode('utf-8')
                elif not isinstance(user_id, str):
                    user_id = str(user_id)
                
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
            supabase_service = get_supabase_service()
            if not supabase_service:
                logging.error("Supabase service non disponible")
                return None
                
            # Vérifier si l'email existe déjà
            if supabase_service.get(f"email_to_id:{email}"):
                return None

            # Générer un nouvel ID
            user_id = str(supabase_service.incr("next_user_id"))
            password_hash = generate_password_hash(password)

            # Stocker les données de l'utilisateur
            supabase_service.hset(f"user:{user_id}", 'email', email)
            supabase_service.hset(f"user:{user_id}", 'password_hash', password_hash)
            supabase_service.hset(f"user:{user_id}", 'is_admin', str(is_admin).lower())
            supabase_service.set(f"email_to_id:{email}", user_id)

            return User(id=user_id, email=email, password_hash=password_hash, is_admin=is_admin)
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
            supabase_service = get_supabase_service()
            if not supabase_service:
                logging.error("Supabase service non disponible")
                return False
            
            # Récupérer l'utilisateur pour avoir son email
            user = User.get(user_id)
            if not user:
                return False
            
            # Supprimer toutes les clés relatives à l'utilisateur
            supabase_service.delete(f"user:{user_id}")
            supabase_service.delete(f"email_to_id:{user.email}")
            
            # Supprimer les clés de tokens
            daily_key_pattern = f"user_tokens_daily:{user_id}:*"
            monthly_key_pattern = f"user_tokens_monthly:{user_id}:*"
            
            daily_keys = supabase_service.keys(daily_key_pattern)
            monthly_keys = supabase_service.keys(monthly_key_pattern)
            
            for key in daily_keys + monthly_keys:
                supabase_service.delete(key)
            
            supabase_service.delete(f"user_tokens:{user_id}")
            supabase_service.delete(f"user_tokens_last_update:{user_id}")
            supabase_service.delete(f"user_daily_limit:{user_id}")
            supabase_service.delete(f"user_monthly_limit:{user_id}")
            
            logging.info(f"Utilisateur {user_id} ({user.email}) supprimé avec succès")
            return True
        except Exception as e:
            logging.error(f"Erreur lors de la suppression de l'utilisateur: {e}")
            return False

    @staticmethod
    def list_all():
        """Retourne la liste de tous les utilisateurs enregistrés"""
        try:
            supabase_service = get_supabase_service()
            if not supabase_service:
                return []

            keys = supabase_service.keys("user:*")
            users = []
            for key in keys:
                if isinstance(key, bytes):
                    user_id = key.decode("utf-8").split(":", 1)[1]
                else:
                    user_id = str(key).split(":", 1)[1]
                user = User.get(user_id)
                if user:
                    users.append(user)
            return users
        except Exception as e:
            logging.error(f"Erreur lors de la liste des utilisateurs: {e}")
            return []

    @staticmethod
    def set_admin_status(user_id, is_admin: bool):
        """Met à jour le statut administrateur d'un utilisateur"""
        try:
            supabase_service = get_supabase_service()
            if not supabase_service:
                return False

            if supabase_service.exists(f"user:{user_id}"):
                supabase_service.hset(f"user:{user_id}", "is_admin", str(bool(is_admin)).lower())
                return True
            return False
        except Exception as e:
            logging.error(f"Erreur mise à jour statut admin: {e}")
            return False

