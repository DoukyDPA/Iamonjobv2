// FICHIER : frontend/src/pages/AdminPartnersPage.js
// Interface d'administration complète pour gérer les partenaires, offres et connexions

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
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [showConnectionModal, setShowConnectionModal] = useState(false);
  const [editingPartner, setEditingPartner] = useState(null);
  const [editingOffer, setEditingOffer] = useState(null);
  const [newPartner, setNewPartner] = useState({
    name: '',
    description: '',
    website: '',
    logo_url: '',
    contact_email: '',
    status: 'active'
  });
  const [newOffer, setNewOffer] = useState({
    title: '',
    description: '',
    offer_type: 'metier',
    url: '',
    is_active: true
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
      const response = await api.get('/api/admin/partners');
      
      if (response.data.success) {
        const partnersWithOffers = await Promise.all(
          response.data.partners.map(async (partner) => {
            try {
              // Charger les métiers de chaque partenaire
              const offersResponse = await api.get(`/api/admin/partners/${partner.id}/offers`);
              if (offersResponse.data.success) {
                return { ...partner, offers: offersResponse.data.offers };
              }
            } catch (err) {
              console.warn(`Impossible de charger les métiers pour ${partner.name}:`, err);
            }
            return { ...partner, offers: [] };
          })
        );
        
        console.log('📋 Partenaires chargés avec métiers:', partnersWithOffers);
        setPartners(partnersWithOffers);
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

  const loadPartnerOffers = async (partnerId) => {
    try {
      const response = await api.get(`/api/admin/partners/${partnerId}/offers`);
      if (response.data.success) {
        return response.data.offers;
      }
    } catch (err) {
      console.error('Erreur chargement offres:', err);
    }
    return [];
  };

  const createPartner = async () => {
    try {
      const response = await api.post('/api/admin/partners', newPartner);
      if (response.data.success) {
        setNewPartner({
          name: '',
          description: '',
          website: '',
          logo_url: '',
          contact_email: '',
          status: 'active'
        });
        loadPartners();
      }
    } catch (err) {
      console.error('Erreur création partenaire:', err);
    }
  };

  const updatePartner = async () => {
    try {
      const response = await api.put('/api/admin/partners', editingPartner);
      if (response.data.success) {
        setEditingPartner(null);
        loadPartners();
      }
    } catch (err) {
      console.error('Erreur mise à jour partenaire:', err);
    }
  };

  const deletePartner = async (partnerId) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce partenaire ? Cette action supprimera également tous ses métiers associés.')) {
      try {
        const response = await api.delete(`/api/admin/partners/${partnerId}`);
        if (response.data.success) {
          console.log('✅ Partenaire supprimé avec succès');
          loadPartners();
        } else {
          console.error('❌ Échec suppression partenaire:', response.data.error);
          alert(`Erreur lors de la suppression: ${response.data.error}`);
        }
      } catch (err) {
        console.error('❌ Erreur suppression partenaire:', err);
        alert(`Erreur lors de la suppression: ${err.message}`);
      }
    }
  };

  const createOffer = async () => {
    try {
      console.log('🎯 Tentative création métier:', {
        partnerId: selectedPartner.id,
        offerData: newOffer
      });
      
      const response = await api.post(`/api/admin/partners/${selectedPartner.id}/offers`, newOffer);
      console.log('📡 Réponse API création métier:', response);
      
      if (response.data.success) {
        console.log('✅ Métier créé avec succès');
        setNewOffer({
          title: '',
          description: '',
          offer_type: 'metier',
          url: '',
          is_active: true
        });
        setShowOfferModal(false);
        loadPartners();
      } else {
        console.error('❌ Échec création métier:', response.data.error);
        alert(`Erreur création métier: ${response.data.error}`);
      }
    } catch (err) {
      console.error('❌ Erreur création métier:', err);
      alert(`Erreur création métier: ${err.message}`);
    }
  };

  const openPartnerModal = async (partner) => {
    setSelectedPartner(partner);
    setShowPartnerModal(true);
    // Charger les offres du partenaire
    const offers = await loadPartnerOffers(partner.id);
    setSelectedPartner({ ...partner, offers });
  };

  const closePartnerModal = () => {
    setShowPartnerModal(false);
    setSelectedPartner(null);
  };

  const openOfferModal = (partner) => {
    setSelectedPartner(partner);
    setShowOfferModal(true);
  };

  const closeOfferModal = () => {
    setShowOfferModal(false);
    setSelectedPartner(null);
  };

  const openConnectionModal = async (partner) => {
    setSelectedPartner(partner);
    setShowConnectionModal(true);
    // Charger les statistiques de connexions du partenaire
    try {
      const response = await api.get(`/api/admin/partners/${partner.id}/connections`);
      if (response.data.success) {
        setSelectedPartner({ ...partner, connectionStats: response.data.stats });
      }
    } catch (err) {
      console.error('Erreur chargement connexions:', err);
    }
  };

  const closeConnectionModal = () => {
    setShowConnectionModal(false);
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

  if (!user?.isAdmin) {
    return (
      <div className="admin-partners-page">
        <div className="admin-header">
          <h1>🚫 Accès Refusé</h1>
          <p>Vous devez être administrateur pour accéder à cette page.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="admin-partners-page">
        <div className="admin-header">
          <h1>⏳ Chargement...</h1>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-partners-page">
        <div className="admin-header">
          <h1>❌ Erreur</h1>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-partners-page">
      <div className="admin-header">
        <h1>🏢 Administration des Partenaires</h1>
        <p>Gérez vos partenaires, leurs offres et suivez les connexions des utilisateurs</p>
      </div>

      {/* Statistiques */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">🏢</div>
          <div className="stat-content">
            <h3>Partenaires</h3>
            <p className="stat-number">{partners.length}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🎯</div>
          <div className="stat-content">
            <h3>Métiers Actifs</h3>
            <p className="stat-number">
              {partners.reduce((sum, p) => sum + (p.offers?.length || 0), 0)}
            </p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">👥</div>
          <div className="stat-content">
            <h3>Connexions</h3>
            <p className="stat-number">
              {partners.reduce((sum, p) => sum + (p.total_connections || 0), 0)}
            </p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <h3>Partenaires Actifs</h3>
            <p className="stat-number">
              {partners.filter(p => p.status === 'active').length}
            </p>
          </div>
        </div>
      </div>

      {/* Création de partenaire */}
      <div className="partners-section">
        <h2>➕ Créer un nouveau partenaire</h2>
        <div className="partner-form">
          <div className="form-row">
            <input
              type="text"
              placeholder="Nom du partenaire"
              value={newPartner.name}
              onChange={(e) => setNewPartner({...newPartner, name: e.target.value})}
            />
            <input
              type="email"
              placeholder="Email de contact"
              value={newPartner.contact_email}
              onChange={(e) => setNewPartner({...newPartner, contact_email: e.target.value})}
            />
          </div>
          <div className="form-row">
            <input
              type="url"
              placeholder="Site web"
              value={newPartner.website}
              onChange={(e) => setNewPartner({...newPartner, website: e.target.value})}
            />
            <input
              type="url"
              placeholder="URL du logo"
              value={newPartner.logo_url}
              onChange={(e) => setNewPartner({...newPartner, logo_url: e.target.value})}
            />
          </div>
          <textarea
            placeholder="Description du partenaire"
            value={newPartner.description}
            onChange={(e) => setNewPartner({...newPartner, description: e.target.value})}
          />
          <button onClick={createPartner} className="create-btn">
            Créer le partenaire
          </button>
        </div>
      </div>

      {/* Liste des partenaires */}
      <div className="partners-section">
        <h2>📋 Liste des partenaires</h2>
        {partners.length === 0 ? (
          <div className="no-partners">
            <p>Aucun partenaire trouvé. Créez votre premier partenaire !</p>
          </div>
        ) : (
          <div className="partners-grid">
            {partners.map((partner) => (
              <div key={partner.id} className="partner-card">
                <div className="partner-header">
                  <h3>{partner.name}</h3>
                  <div className="partner-actions">
                    <button 
                      onClick={() => openPartnerModal(partner)}
                      className="view-btn"
                    >
                      👁️ Voir
                    </button>
                    <button 
                      onClick={() => setEditingPartner(partner)}
                      className="edit-btn"
                    >
                      ✏️ Modifier
                    </button>
                    <button 
                      onClick={() => deletePartner(partner.id)}
                      className="delete-btn"
                    >
                      🗑️ Supprimer
                    </button>
                  </div>
                </div>
                
                <div className="partner-info">
                  <p><strong>Email:</strong> {partner.contact_email}</p>
                  <p><strong>Site:</strong> {partner.website || 'Non spécifié'}</p>
                  <p><strong>Statut:</strong> 
                    <span className={`status ${partner.status}`}>
                      {partner.status === 'active' ? '✅ Actif' : '❌ Inactif'}
                    </span>
                  </p>
                  <p><strong>Créé le:</strong> {formatDate(partner.created_at)}</p>
                </div>

                {/* Affichage des métiers dans le pavé */}
                {partner.offers && partner.offers.length > 0 && (
                  <div className="offers-summary">
                    <h4>🎯 Métiers ({partner.offers.length})</h4>
                    {partner.offers.map((offer) => (
                      <div key={offer.id} className="offer-summary">
                        <div className="offer-content">
                          <h5>{offer.title}</h5>
                          <p>{offer.description}</p>
                          <span className="offer-type">{offer.offer_type}</span>
                          <span className="offer-status">
                            {offer.is_active ? '✅ Actif' : '❌ Inactif'}
                          </span>
                        </div>
                        <div className="offer-actions">
                          <button 
                            onClick={() => openOfferModal(partner)}
                            className="edit-btn"
                            title="Modifier ce métier"
                          >
                            ✏️ Modifier
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="partner-actions-bottom">
                  <button 
                    onClick={() => openOfferModal(partner)}
                    className="offer-btn"
                  >
                    🎯 Gérer les métiers
                  </button>
                  <button 
                    onClick={() => openConnectionModal(partner)}
                    className="connection-btn"
                  >
                    👥 Voir les connexions
                  </button>
                </div>
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
              <h3>🏢 {selectedPartner.name}</h3>
              <button onClick={closePartnerModal} className="close-btn">×</button>
            </div>
            <div className="modal-body">
              <div className="partner-details">
                <p><strong>Description:</strong> {selectedPartner.description || 'Aucune description'}</p>
                <p><strong>Email:</strong> {selectedPartner.contact_email}</p>
                <p><strong>Site web:</strong> {selectedPartner.website || 'Non spécifié'}</p>
                <p><strong>Statut:</strong> {selectedPartner.status}</p>
                <p><strong>Créé le:</strong> {formatDate(selectedPartner.created_at)}</p>
              </div>
              
                             {selectedPartner.offers && selectedPartner.offers.length > 0 && (
                 <div className="offers-list">
                   <h4>🎯 Métiers ({selectedPartner.offers.length})</h4>
                   {selectedPartner.offers.map((offer) => (
                     <div key={offer.id} className="offer-item">
                       <h5>{offer.title}</h5>
                       <p>{offer.description}</p>
                       <span className="offer-type">{offer.offer_type}</span>
                       <span className="offer-status">
                         {offer.is_active ? '✅ Actif' : '❌ Inactif'}
                       </span>
                     </div>
                   ))}
                 </div>
               )}
            </div>
          </div>
        </div>
      )}

      {/* Modal création/modification d'offre */}
      {showOfferModal && selectedPartner && (
        <div className="modal-overlay" onClick={closeOfferModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>🎯 Gérer les métiers - {selectedPartner.name}</h3>
              <button onClick={closeOfferModal} className="close-btn">×</button>
            </div>
            <div className="modal-body">
              <div className="offer-form">
                <input
                  type="text"
                  placeholder="Titre du métier"
                  value={newOffer.title}
                  onChange={(e) => setNewOffer({...newOffer, title: e.target.value})}
                />
                <textarea
                  placeholder="Description du métier"
                  value={newOffer.description}
                  onChange={(e) => setNewOffer({...newOffer, description: e.target.value})}
                />
                <select
                  value={newOffer.offer_type}
                  onChange={(e) => setNewOffer({...newOffer, offer_type: e.target.value})}
                >
                  <option value="metier">Métier</option>
                  <option value="formation">Formation</option>
                  <option value="service">Service</option>
                  <option value="stage">Stage</option>
                  <option value="emploi">Emploi</option>
                </select>
                <input
                  type="url"
                  placeholder="URL du métier (optionnel)"
                  value={newOffer.url}
                  onChange={(e) => setNewOffer({...newOffer, url: e.target.value})}
                />
                <button onClick={createOffer} className="create-btn">
                  Créer le métier
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal connexions */}
      {showConnectionModal && selectedPartner && (
        <div className="modal-overlay" onClick={closeConnectionModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>👥 Connexions - {selectedPartner.name}</h3>
              <button onClick={closeConnectionModal} className="close-btn">×</button>
            </div>
            <div className="modal-body">
              {selectedPartner.connectionStats ? (
                <div className="connections-stats">
                  <div className="stats-overview">
                    <div className="stat-item">
                      <span className="stat-label">Total Connexions:</span>
                      <span className="stat-value">{selectedPartner.connectionStats.total_connections}</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Utilisateurs Uniques:</span>
                      <span className="stat-value">{selectedPartner.connectionStats.unique_users}</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Total Vues:</span>
                      <span className="stat-value">{selectedPartner.connectionStats.total_views}</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Période:</span>
                      <span className="stat-value">{selectedPartner.connectionStats.period_days} jours</span>
                    </div>
                  </div>
                  
                  {Object.keys(selectedPartner.connectionStats.offers || {}).length > 0 && (
                    <div className="offers-connections">
                      <h4>📋 Connexions par offre</h4>
                      {Object.entries(selectedPartner.connectionStats.offers).map(([offerId, offer]) => (
                        <div key={offerId} className="offer-connection-item">
                          <div className="offer-connection-header">
                            <span className="offer-id">Offre #{offerId}</span>
                            <span className="offer-connections">{offer.total_connections} connexions</span>
                          </div>
                          <div className="offer-connection-details">
                            <span>Utilisateurs uniques: {offer.unique_users}</span>
                            <span>Total vues: {offer.total_views}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {Object.keys(selectedPartner.connectionStats.daily_breakdown || {}).length > 0 && (
                    <div className="daily-breakdown">
                      <h4>📅 Répartition quotidienne</h4>
                      <div className="daily-chart">
                        {Object.entries(selectedPartner.connectionStats.daily_breakdown)
                          .sort(([a], [b]) => b.localeCompare(a))
                          .slice(0, 7)
                          .map(([date, count]) => (
                            <div key={date} className="daily-bar">
                              <span className="daily-date">{formatDate(date)}</span>
                              <div className="daily-bar-fill" style={{height: `${Math.max(20, count * 10)}px`}}></div>
                              <span className="daily-count">{count}</span>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="connections-info">
                  <p>Chargement des statistiques de connexions...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal édition partenaire */}
      {editingPartner && (
        <div className="modal-overlay" onClick={() => setEditingPartner(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>✏️ Modifier {editingPartner.name}</h3>
              <button onClick={() => setEditingPartner(null)} className="close-btn">×</button>
            </div>
            <div className="modal-body">
              <div className="partner-form">
                <input
                  type="text"
                  placeholder="Nom du partenaire"
                  value={editingPartner.name}
                  onChange={(e) => setEditingPartner({...editingPartner, name: e.target.value})}
                />
                <input
                  type="email"
                  placeholder="Email de contact"
                  value={editingPartner.contact_email}
                  onChange={(e) => setEditingPartner({...editingPartner, contact_email: e.target.value})}
                />
                <input
                  type="url"
                  placeholder="Site web"
                  value={editingPartner.website}
                  onChange={(e) => setEditingPartner({...editingPartner, website: e.target.value})}
                />
                <input
                  type="url"
                  placeholder="URL du logo"
                  value={editingPartner.logo_url}
                  onChange={(e) => setEditingPartner({...editingPartner, logo_url: e.target.value})}
                />
                <textarea
                  placeholder="Description du partenaire"
                  value={editingPartner.description}
                  onChange={(e) => setEditingPartner({...editingPartner, description: e.target.value})}
                />
                <select
                  value={editingPartner.status}
                  onChange={(e) => setEditingPartner({...editingPartner, status: e.target.value})}
                >
                  <option value="active">Actif</option>
                  <option value="inactive">Inactif</option>
                </select>
                <button onClick={updatePartner} className="update-btn">
                  Mettre à jour
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPartnersPage;
