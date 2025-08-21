# backend/services/partner_connection_service.py
# Service pour gérer les connexions des utilisateurs aux offres des partenaires

import logging
from datetime import datetime, timedelta
from services.supabase_storage import SupabaseStorage

class PartnerConnectionService:
    """Service pour gérer les connexions aux offres des partenaires"""
    
    def __init__(self):
        self.supabase = SupabaseStorage()
    
    def record_offer_connection(self, user_email: str, partner_id: str, offer_id: str, 
                               connection_type: str = 'view') -> bool:
        """Enregistre une connexion d'un utilisateur à une offre partenaire"""
        try:
            if not self.supabase.is_available():
                logging.warning("Supabase indisponible pour enregistrer la connexion")
                return False
            
            # Vérifier si la connexion existe déjà
            existing = self.supabase.client.table('partner_offer_tests') \
                .select('id') \
                .eq('user_email', user_email) \
                .eq('partner_id', partner_id) \
                .eq('offer_id', offer_id) \
                .eq('connection_type', connection_type) \
                .execute()
            
            if existing.data:
                # Mettre à jour la connexion existante
                response = self.supabase.client.table('partner_offer_tests') \
                    .update({
                        'last_accessed': datetime.now().isoformat(),
                        'access_count': existing.data[0].get('access_count', 0) + 1
                    }) \
                    .eq('id', existing.data[0]['id']) \
                    .execute()
            else:
                # Créer une nouvelle connexion
                connection_data = {
                    'user_email': user_email,
                    'partner_id': partner_id,
                    'offer_id': offer_id,
                    'connection_type': connection_type,
                    'first_accessed': datetime.now().isoformat(),
                    'last_accessed': datetime.now().isoformat(),
                    'access_count': 1
                }
                
                response = self.supabase.client.table('partner_offer_tests').insert(connection_data).execute()
            
            if response.data:
                logging.info(f"✅ Connexion enregistrée: {user_email} -> {partner_id}/{offer_id}")
                return True
            else:
                logging.error(f"❌ Échec enregistrement connexion: {user_email}")
                return False
                
        except Exception as e:
            logging.error(f"❌ Erreur enregistrement connexion pour {user_email}: {e}")
            return False
    
    def get_partner_connection_stats(self, partner_id: str, days: int = 30) -> dict:
        """Récupère les statistiques de connexions pour un partenaire"""
        try:
            if not self.supabase.is_available():
                return {'error': 'Supabase indisponible'}
            
            # Calculer la date de début
            start_date = (datetime.now() - timedelta(days=days)).isoformat()
            
            # Récupérer toutes les connexions pour ce partenaire
            response = self.supabase.client.table('partner_offer_tests') \
                .select('*') \
                .eq('partner_id', partner_id) \
                .gte('first_accessed', start_date) \
                .execute()
            
            if not response.data:
                return {
                    'partner_id': partner_id,
                    'total_connections': 0,
                    'unique_users': 0,
                    'total_views': 0,
                    'period_days': days,
                    'daily_breakdown': {},
                    'offers': {}
                }
            
            connections = response.data
            
            # Statistiques générales
            total_connections = len(connections)
            unique_users = len(set(conn['user_email'] for conn in connections))
            total_views = sum(conn.get('access_count', 1) for conn in connections)
            
            # Répartition quotidienne
            daily_breakdown = {}
            for conn in connections:
                date = conn['first_accessed'][:10]  # YYYY-MM-DD
                daily_breakdown[date] = daily_breakdown.get(date, 0) + 1
            
            # Statistiques par offre
            offers = {}
            for conn in connections:
                offer_id = conn['offer_id']
                if offer_id not in offers:
                    offers[offer_id] = {
                        'total_connections': 0,
                        'unique_users': set(),
                        'total_views': 0
                    }
                
                offers[offer_id]['total_connections'] += 1
                offers[offer_id]['unique_users'].add(conn['user_email'])
                offers[offer_id]['total_views'] += conn.get('access_count', 1)
            
            # Convertir les sets en compteurs
            for offer_id in offers:
                offers[offer_id]['unique_users'] = len(offers[offer_id]['unique_users'])
            
            return {
                'partner_id': partner_id,
                'total_connections': total_connections,
                'unique_users': unique_users,
                'total_views': total_views,
                'period_days': days,
                'daily_breakdown': daily_breakdown,
                'offers': offers
            }
            
        except Exception as e:
            logging.error(f"❌ Erreur récupération stats connexions pour {partner_id}: {e}")
            return {'error': str(e)}
    
    def get_user_connection_history(self, user_email: str) -> dict:
        """Récupère l'historique des connexions d'un utilisateur"""
        try:
            if not self.supabase.is_available():
                return {'error': 'Supabase indisponible'}
            
            # Récupérer toutes les connexions de l'utilisateur
            response = self.supabase.client.table('partner_offer_tests') \
                .select('*') \
                .eq('user_email', user_email) \
                .order('last_accessed', desc=True) \
                .execute()
            
            if not response.data:
                return {
                    'user_email': user_email,
                    'total_connections': 0,
                    'partners_visited': 0,
                    'offers_viewed': 0,
                    'connections': []
                }
            
            connections = response.data
            
            # Statistiques
            total_connections = len(connections)
            partners_visited = len(set(conn['partner_id'] for conn in connections))
            offers_viewed = len(set(conn['offer_id'] for conn in connections))
            
            return {
                'user_email': user_email,
                'total_connections': total_connections,
                'partners_visited': partners_visited,
                'offers_viewed': offers_viewed,
                'connections': connections
            }
            
        except Exception as e:
            logging.error(f"❌ Erreur récupération historique pour {user_email}: {e}")
            return {'error': str(e)}
    
    def get_all_partners_connection_stats(self, days: int = 30) -> list:
        """Récupère les statistiques de connexions pour tous les partenaires"""
        try:
            if not self.supabase.is_available():
                return []
            
            # Récupérer tous les partenaires
            partners_response = self.supabase.client.table('partners') \
                .select('id,name,status') \
                .execute()
            
            if not partners_response.data:
                return []
            
            all_stats = []
            for partner in partners_response.data:
                stats = self.get_partner_connection_stats(partner['id'], days)
                if 'error' not in stats:
                    stats['partner_name'] = partner['name']
                    stats['partner_status'] = partner['status']
                    all_stats.append(stats)
            
            # Trier par nombre de connexions décroissant
            all_stats.sort(key=lambda x: x['total_connections'], reverse=True)
            
            return all_stats
            
        except Exception as e:
            logging.error(f"❌ Erreur récupération stats globales: {e}")
            return []

# Instance globale
partner_connection_service = PartnerConnectionService()

# Fonctions utilitaires
def record_connection(user_email: str, partner_id: str, offer_id: str, 
                     connection_type: str = 'view') -> bool:
    """Fonction utilitaire pour enregistrer une connexion"""
    return partner_connection_service.record_offer_connection(
        user_email, partner_id, offer_id, connection_type
    )

def get_partner_stats(partner_id: str, days: int = 30) -> dict:
    """Fonction utilitaire pour récupérer les stats d'un partenaire"""
    return partner_connection_service.get_partner_connection_stats(partner_id, days)

def get_user_history(user_email: str) -> dict:
    """Fonction utilitaire pour récupérer l'historique d'un utilisateur"""
    return partner_connection_service.get_user_connection_history(user_email)
