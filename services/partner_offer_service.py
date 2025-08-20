# services/partner_offer_service.py
"""
Service pour gérer les tests d'offres partenaires et les statistiques
"""
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from services.supabase_storage import SupabaseStorage


class PartnerOfferService:
    """Service de gestion des offres partenaires et tests"""
    
    def __init__(self):
        self.supabase = SupabaseStorage()
    
    def record_offer_test(self, user_email: str, partner_id: int, offer_id: int, 
                         offer_title: str, test_duration: int = 0, 
                         completed: bool = False, feedback: str = None) -> bool:
        """
        Enregistre un test d'offre partenaire
        
        Args:
            user_email: Email de l'utilisateur qui teste
            partner_id: ID du partenaire
            offer_id: ID de l'offre
            offer_title: Titre de l'offre
            test_duration: Durée du test en secondes
            completed: Si le test a été complété
            feedback: Retour utilisateur optionnel
        """
        try:
            if not self.supabase.is_available():
                logging.error("Supabase non disponible pour enregistrer le test")
                return False
            
            # Upsert pour éviter les doublons
            test_data = {
                'user_email': user_email,
                'partner_id': partner_id,
                'offer_id': offer_id,
                'offer_title': offer_title,
                'test_timestamp': datetime.now().isoformat(),
                'test_duration_seconds': test_duration,
                'test_completed': completed,
                'user_feedback': feedback
            }
            
            response = self.supabase.client.table('partner_offer_tests').upsert(
                test_data, 
                on_conflict='user_email,partner_id,offer_id'
            ).execute()
            
            if response.data:
                logging.info(f"Test d'offre enregistré: {user_email} -> {offer_title}")
                return True
            else:
                logging.error("Erreur lors de l'enregistrement du test")
                return False
                
        except Exception as e:
            logging.error(f"Erreur enregistrement test offre: {e}")
            return False
    
    def get_partner_offer_stats(self, partner_id: int, days: int = 30) -> Dict:
        """
        Récupère les statistiques des offres d'un partenaire
        
        Args:
            partner_id: ID du partenaire
            days: Nombre de jours pour les statistiques (défaut: 30)
        """
        try:
            if not self.supabase.is_available():
                return self._default_stats()
            
            # Date de début pour les statistiques
            start_date = (datetime.now() - timedelta(days=days)).isoformat()
            
            # Récupérer tous les tests pour ce partenaire
            response = self.supabase.client.table('partner_offer_tests') \
                .select('*') \
                .eq('partner_id', partner_id) \
                .gte('test_timestamp', start_date) \
                .execute()
            
            if not response.data:
                return self._default_stats()
            
            # Analyser les données
            stats = {
                'partner_id': partner_id,
                'period_days': days,
                'total_tests': len(response.data),
                'unique_users': len(set(test['user_email'] for test in response.data)),
                'completed_tests': len([t for t in response.data if t.get('test_completed')]),
                'offers': {},
                'daily_breakdown': {}
            }
            
            # Statistiques par offre
            for test in response.data:
                offer_id = test['offer_id']
                offer_title = test['offer_title']
                
                if offer_id not in stats['offers']:
                    stats['offers'][offer_id] = {
                        'title': offer_title,
                        'total_tests': 0,
                        'unique_users': set(),
                        'completed_tests': 0,
                        'avg_duration': 0,
                        'total_duration': 0
                    }
                
                offer_stats = stats['offers'][offer_id]
                offer_stats['total_tests'] += 1
                offer_stats['unique_users'].add(test['user_email'])
                offer_stats['total_duration'] += test.get('test_duration_seconds', 0)
                
                if test.get('test_completed'):
                    offer_stats['completed_tests'] += 1
            
            # Convertir les sets en nombres et calculer les moyennes
            for offer_stats in stats['offers'].values():
                offer_stats['unique_users'] = len(offer_stats['unique_users'])
                if offer_stats['total_tests'] > 0:
                    offer_stats['avg_duration'] = round(
                        offer_stats['total_duration'] / offer_stats['total_tests']
                    )
            
            # Répartition quotidienne
            for test in response.data:
                date_key = test['test_timestamp'][:10]  # YYYY-MM-DD
                if date_key not in stats['daily_breakdown']:
                    stats['daily_breakdown'][date_key] = 0
                stats['daily_breakdown'][date_key] += 1
            
            return stats
            
        except Exception as e:
            logging.error(f"Erreur récupération stats partenaire: {e}")
            return self._default_stats()
    
    def get_all_partners_stats(self, days: int = 30) -> List[Dict]:
        """
        Récupère les statistiques de tous les partenaires
        
        Args:
            days: Nombre de jours pour les statistiques
        """
        try:
            if not self.supabase.is_available():
                return []
            
            # Récupérer tous les partenaires
            partners_response = self.supabase.client.table('partners').select('id').execute()
            
            if not partners_response.data:
                return []
            
            all_stats = []
            for partner in partners_response.data:
                partner_stats = self.get_partner_offer_stats(partner['id'], days)
                all_stats.append(partner_stats)
            
            return all_stats
            
        except Exception as e:
            logging.error(f"Erreur récupération stats tous partenaires: {e}")
            return []
    
    def get_user_offer_tests(self, user_email: str) -> List[Dict]:
        """
        Récupère l'historique des tests d'offres d'un utilisateur
        
        Args:
            user_email: Email de l'utilisateur
        """
        try:
            if not self.supabase.is_available():
                return []
            
            response = self.supabase.client.table('partner_offer_tests') \
                .select('*, partners:partner_id(name, description)') \
                .eq('user_email', user_email) \
                .order('test_timestamp', desc=True) \
                .execute()
            
            if response.data:
                return response.data
            return []
            
        except Exception as e:
            logging.error(f"Erreur récupération tests utilisateur: {e}")
            return []
    
    def _default_stats(self) -> Dict:
        """Statistiques par défaut en cas d'erreur"""
        return {
            'partner_id': None,
            'period_days': 30,
            'total_tests': 0,
            'unique_users': 0,
            'completed_tests': 0,
            'offers': {},
            'daily_breakdown': {}
        }


# Instance globale du service
partner_offer_service = PartnerOfferService()
