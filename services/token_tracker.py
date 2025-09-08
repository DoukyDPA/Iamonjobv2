# services/token_tracker.py
# Service pour tracker automatiquement la consommation de tokens

import logging
from datetime import datetime
from services.supabase_storage import SupabaseStorage

class TokenTracker:
    """Service pour tracker la consommation de tokens des utilisateurs"""
    
    def __init__(self):
        self.supabase = SupabaseStorage()
    
    def record_token_usage(self, user_email: str, tokens_used: int, service_name: str = None) -> bool:
        """Enregistre l'utilisation de tokens pour un utilisateur"""
        try:
            if not self.supabase.is_available():
                logging.warning("Supabase indisponible pour tracking tokens")
                return False
            
            # Utiliser upsert pour éviter les erreurs de contrainte unique
            date = datetime.now().date().isoformat()
            
            # Récupérer l'usage actuel pour cette date
            current_response = self.supabase.client.table('token_usage').select('tokens_used').eq(
                'user_email', user_email
            ).eq('date', date).execute()
            
            current_tokens = 0
            if current_response.data:
                current_tokens = current_response.data[0].get('tokens_used', 0)
            
            # Upsert avec addition des tokens
            response = self.supabase.client.table('token_usage').upsert({
                'user_email': user_email,
                'date': date,
                'tokens_used': current_tokens + tokens_used,
                'service_name': service_name or 'unknown',
                'created_at': datetime.now().isoformat()
            }, on_conflict='user_email,date').execute()
            
            if response.data:
                logging.info(f"✅ Tokens enregistrés: {user_email} - {tokens_used} tokens pour {service_name} (total: {current_tokens + tokens_used})")
                return True
            else:
                logging.error(f"❌ Échec enregistrement tokens: {user_email}")
                return False
                
        except Exception as e:
            logging.error(f"❌ Erreur enregistrement tokens pour {user_email}: {e}")
            return False
    
    def get_user_token_stats(self, user_email: str) -> dict:
        """Récupère les statistiques de tokens pour un utilisateur"""
        try:
            if not self.supabase.is_available():
                return {'error': 'Supabase indisponible'}
            
            # Récupérer l'usage total
            usage_response = self.supabase.client.table('token_usage') \
                .select('tokens_used,created_at') \
                .eq('user_email', user_email) \
                .execute()
            
            # Récupérer les limites
            limits_response = self.supabase.client.table('user_token_limits') \
                .select('daily_limit,monthly_limit') \
                .eq('user_email', user_email) \
                .execute()
            
            # Calculer les statistiques
            total_used = sum(row.get('tokens_used', 0) for row in usage_response.data or [])
            
            # Limites par défaut
            daily_limit = 5000
            monthly_limit = 50000
            
            if limits_response.data:
                limits = limits_response.data[0]
                daily_limit = limits.get('daily_limit', 5000)
                monthly_limit = limits.get('monthly_limit', 50000)
            
            return {
                'total_used': total_used,
                'daily_limit': daily_limit,
                'monthly_limit': monthly_limit,
                'remaining_daily': max(0, daily_limit - total_used),
                'remaining_monthly': max(0, monthly_limit - total_used)
            }
            
        except Exception as e:
            logging.error(f"❌ Erreur récupération stats tokens pour {user_email}: {e}")
            return {'error': str(e)}
    
    def ensure_user_limits(self, user_email: str) -> bool:
        """S'assure qu'un utilisateur a des limites de tokens définies"""
        try:
            if not self.supabase.is_available():
                return False
            
            # Vérifier si l'utilisateur a déjà des limites
            response = self.supabase.client.table('user_token_limits') \
                .select('id') \
                .eq('user_email', user_email) \
                .execute()
            
            if not response.data:
                # Créer des limites par défaut
                insert_response = self.supabase.client.table('user_token_limits').insert({
                    'user_email': user_email,
                'daily_limit': 5000,
                'monthly_limit': 50000
                }).execute()
                
                if insert_response.data:
                    logging.info(f"✅ Limites par défaut créées pour {user_email}")
                    return True
                else:
                    logging.error(f"❌ Échec création limites pour {user_email}")
                    return False
            else:
                logging.info(f"✅ Limites déjà existantes pour {user_email}")
                return True
                
        except Exception as e:
            logging.error(f"❌ Erreur création limites pour {user_email}: {e}")
            return False

# Instance globale
token_tracker = TokenTracker()

# Fonctions utilitaires
def record_tokens(user_email: str, tokens_used: int, service_name: str = None) -> bool:
    """Fonction utilitaire pour enregistrer des tokens"""
    return token_tracker.record_token_usage(user_email, tokens_used, service_name)

def get_token_stats(user_email: str) -> dict:
    """Fonction utilitaire pour récupérer les stats de tokens"""
    return token_tracker.get_user_token_stats(user_email)
