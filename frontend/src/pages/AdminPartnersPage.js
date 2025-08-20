// FICHIER : frontend/src/pages/AdminPartnersPage.js
// Interface d'administration pour gérer les partenaires - VERSION SIMPLIFIÉE

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import './AdminPartnersPage.css';

const AdminPartnersPage = () => {
  const { user } = useAuth();
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPartner, setSelectedPartner] = useState(null);
  const [showPartnerModal, setShowPartnerModal] = useState(false);
  const [stats, setStats] = useState({
    totalPartners: 0,
    totalOffers: 0,
    totalTests: 0,
    activePartners: 0
  });

  // Vérifier que l'utilisateur est admin
  useEffect(() => {
    if (user && !user.isAdmin) {
      setError("Accès refusé. Droits administrateur requis.");
      setLoading(false);
    }
  }, [user]);

  // Charger les partenaires
  useEffect(() => {
    if (user?.isAdmin) {
      loadPartners();
    }
  }, [user]);

  const loadPartners = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/admin/partners/stats');
      
      if (response.data.success) {
        setPartners(response.data.stats);
        calculateStats(response.data.stats);
      } else {
        setError(response.data.error || 'Erreur lors du chargement des partenaires');
      }
    } catch (err) {
      setError('Erreur de connexion au serveur');
      console.error('Erreur chargement partenaires:', err);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (partnersList) => {
    const totalPartners = partnersList.length;
    const totalOffers = partnersList.reduce((sum, p) => sum + Object.keys(p.offers || {}).length, 0);
    const totalTests = partnersList.reduce((sum, p) => sum + (p.total_tests || 0), 0);
    const activePartners = partnersList.filter(p => p.total_tests > 0).length;

    setStats({
      totalPartners,
      totalOffers,
      totalTests,
      activePartners
    });
  };

  const openPartnerModal = (partner) => {
    setSelectedPartner(partner);
    setShowPartnerModal(true);
  };

  const closePartnerModal = () => {
    setShowPartnerModal(false);
    setSelectedPartner(null);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Jamais';
    try {
      return new Date(dateString).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Date invalide';
    }
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '0s';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${remainingSeconds}s`;
  };

  if (!user?.isAdmin) {
    return (
      <div className="admin-partners-page">
        <div className="access-denied">
          <h1>🚫 Accès Refusé</h1>
          <p>Vous devez être administrateur pour accéder à cette page.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="admin-partners-page">
        <div className="loading">
          <h2>Chargement des partenaires...</h2>
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-partners-page">
        <div className="error">
          <h2>❌ Erreur</h2>
          <p>{error}</p>
          <button onClick={loadPartners} className="retry-btn">
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-partners-page">
      <div className="admin-header">
        <h1>🤝 Administration des Partenaires</h1>
        <p>Suivez l'engagement des utilisateurs sur vos offres partenaires</p>
      </div>

      {/* Statistiques */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">🏢</div>
          <div className="stat-content">
            <h3>Total Partenaires</h3>
            <p className="stat-number">{stats.totalPartners}</p>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">📋</div>
          <div className="stat-content">
            <h3>Total Offres</h3>
            <p className="stat-number">{stats.totalOffers}</p>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">🧪</div>
          <div className="stat-content">
            <h3>Total Tests</h3>
            <p className="stat-number">{stats.totalTests}</p>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <h3>Partenaires Actifs</h3>
            <p className="stat-number">{stats.activePartners}</p>
          </div>
        </div>
      </div>

      {/* Liste des partenaires */}
      <div className="partners-section">
        <h2>📊 Statistiques des Partenaires</h2>
        
        {partners.length === 0 ? (
          <div className="no-partners">
            <p>Aucun partenaire trouvé</p>
          </div>
        ) : (
          <div className="partners-grid">
            {partners.map((partner) => (
              <div key={partner.partner_id} className="partner-card">
                <div className="partner-header">
                  <h3>🏢 Partenaire #{partner.partner_id}</h3>
                  <button 
                    onClick={() => openPartnerModal(partner)}
                    className="view-btn"
                    title="Voir les détails"
                  >
                    👁️
                  </button>
                </div>
                
                <div className="partner-stats">
                  <div className="stat-row">
                    <span>Tests totaux:</span>
                    <strong>{partner.total_tests}</strong>
                  </div>
                  <div className="stat-row">
                    <span>Utilisateurs uniques:</span>
                    <strong>{partner.unique_users}</strong>
                  </div>
                  <div className="stat-row">
                    <span>Tests complétés:</span>
                    <strong>{partner.completed_tests}</strong>
                  </div>
                  <div className="stat-row">
                    <span>Période:</span>
                    <strong>{partner.period_days} jours</strong>
                  </div>
                </div>
                
                {Object.keys(partner.offers || {}).length > 0 && (
                  <div className="offers-summary">
                    <h4>📋 Offres ({Object.keys(partner.offers).length})</h4>
                    {Object.entries(partner.offers).map(([offerId, offer]) => (
                      <div key={offerId} className="offer-summary">
                        <span className="offer-title">{offer.title}</span>
                        <span className="offer-tests">{offer.total_tests} tests</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal détail partenaire */}
      {showPartnerModal && selectedPartner && (
        <div className="modal-overlay" onClick={closePartnerModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>🏢 Partenaire #{selectedPartner.partner_id}</h2>
              <button onClick={closePartnerModal} className="close-btn">×</button>
            </div>
            
            <div className="modal-body">
              <div className="partner-details">
                <div className="detail-section">
                  <h3>📊 Statistiques Générales</h3>
                  <div className="detail-grid">
                    <div className="detail-item">
                      <label>Tests totaux:</label>
                      <span>{selectedPartner.total_tests}</span>
                    </div>
                    <div className="detail-item">
                      <label>Utilisateurs uniques:</label>
                      <span>{selectedPartner.unique_users}</span>
                    </div>
                    <div className="detail-item">
                      <label>Tests complétés:</label>
                      <span>{selectedPartner.completed_tests}</span>
                    </div>
                    <div className="detail-item">
                      <label>Période analysée:</label>
                      <span>{selectedPartner.period_days} jours</span>
                    </div>
                  </div>
                </div>
                
                {Object.keys(selectedPartner.offers || {}).length > 0 && (
                  <div className="detail-section">
                    <h3>📋 Détail des Offres</h3>
                    {Object.entries(selectedPartner.offers).map(([offerId, offer]) => (
                      <div key={offerId} className="offer-detail">
                        <h4>{offer.title}</h4>
                        <div className="offer-stats">
                          <div className="stat-item">
                            <span>Tests:</span>
                            <strong>{offer.total_tests}</strong>
                          </div>
                          <div className="stat-item">
                            <span>Utilisateurs uniques:</span>
                            <strong>{offer.unique_users}</strong>
                          </div>
                          <div className="stat-item">
                            <span>Complétés:</span>
                            <strong>{offer.completed_tests}</strong>
                          </div>
                          <div className="stat-item">
                            <span>Durée moyenne:</span>
                            <strong>{formatDuration(offer.avg_duration)}</strong>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                {Object.keys(selectedPartner.daily_breakdown || {}).length > 0 && (
                  <div className="detail-section">
                    <h3>📅 Répartition Quotidienne</h3>
                    <div className="daily-breakdown">
                      {Object.entries(selectedPartner.daily_breakdown)
                        .sort(([a], [b]) => b.localeCompare(a))
                        .slice(0, 7)
                        .map(([date, count]) => (
                          <div key={date} className="daily-item">
                            <span className="date">{formatDate(date)}</span>
                            <span className="count">{count} tests</span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="modal-footer">
              <button onClick={closePartnerModal} className="close-btn">
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPartnersPage;
