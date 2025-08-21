// frontend/src/components/Partners/PartnerJobs.js
// Composant pour afficher les partenaires et leurs métiers avec modal

import React, { useState, useEffect } from 'react';
import './PartnerJobs.css';

const PartnerJobs = () => {
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState(null);

  useEffect(() => {
    loadPartners();
  }, []);

  const loadPartners = async () => {
    try {
      setLoading(true);
      
      // Récupérer la liste des partenaires
      const response = await fetch('/api/admin/partners', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success && data.partners) {
        // Pour chaque partenaire, récupérer ses métiers
        const partnersWithOffers = await Promise.all(
          data.partners.map(async (partner) => {
            try {
              const offersResponse = await fetch(`/api/admin/partners/${partner.id}/offers`, {
                headers: {
                  'Authorization': `Bearer ${localStorage.getItem('token')}`,
                  'Content-Type': 'application/json'
                }
              });

              if (offersResponse.ok) {
                const offersData = await offersResponse.json();
                return {
                  ...partner,
                  offers: offersData.success ? offersData.offers : []
                };
              } else {
                return { ...partner, offers: [] };
              }
            } catch (error) {
              console.error(`Erreur chargement métiers pour ${partner.name}:`, error);
              return { ...partner, offers: [] };
            }
          })
        );

        setPartners(partnersWithOffers);
      } else {
        setError('Erreur lors du chargement des partenaires');
      }
    } catch (error) {
      console.error('Erreur chargement partenaires:', error);
      setError('Erreur de connexion au serveur');
    } finally {
      setLoading(false);
    }
  };

  const openOffersModal = (partner) => {
    setSelectedPartner(partner);
    setShowModal(true);
  };

  const closeOffersModal = () => {
    setShowModal(false);
    setSelectedPartner(null);
  };

  const testCompatibility = async (offer, partner) => {
    console.log('🚀 Test de compatibilité direct pour:', offer.title);
    
    try {
      // Pré-remplir automatiquement l'offre d'emploi
      const token = localStorage.getItem('token');
      
      // Limiter la taille du contenu pour éviter l'erreur "Request Line is too large"
      const maxDescriptionLength = 1000;
      const truncatedDescription = offer.description 
        ? offer.description.substring(0, maxDescriptionLength) + (offer.description.length > maxDescriptionLength ? '...' : '')
        : 'Description indisponible';

      const contentLines = [
        `Titre: ${offer.title}`,
        `Partenaire: ${partner.name}`,
        offer.offer_type ? `Type: ${offer.offer_type}` : null,
        '',
        `Description: ${truncatedDescription}`
      ].filter(Boolean);

      const textContent = contentLines.join('\n');

      console.log(`📝 Pré-remplissage offre (${textContent.length} caractères)`);

      // Pré-remplir le document "offre_emploi" côté serveur
      const resp = await fetch('/api/documents/upload-text', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          text: textContent,
          document_type: 'offre_emploi'
        })
      });

      if (resp.ok) {
        console.log('✅ Offre d\'emploi pré-remplie avec succès');
        // Redirection directe vers le service de compatibilité
        window.location.href = '/matching-cv-offre';
      } else {
        console.warn('⚠️ Échec pré-remplissage offre, redirection quand même');
        window.location.href = '/matching-cv-offre';
      }
      
    } catch (error) {
      console.error('❌ Erreur lors du pré-remplissage:', error);
      // En cas d'erreur, rediriger quand même
      window.location.href = '/matching-cv-offre';
    }
  };

  if (loading) {
    return (
      <div className="partner-jobs-container">
        <div className="loading-container">
          <h3>⏳ Chargement des partenaires...</h3>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="partner-jobs-container">
        <div className="error-container">
          <h3>❌ Erreur</h3>
          <p>{error}</p>
          <button onClick={loadPartners} className="retry-btn">🔄 Réessayer</button>
        </div>
      </div>
    );
  }

  if (!partners || partners.length === 0) {
    return (
      <div className="partner-jobs-container">
        <div className="no-partners">
          <h3>📋 Aucun partenaire disponible</h3>
          <p>Aucun partenaire n'est actuellement configuré.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="partner-jobs-container">
      <div className="partner-jobs-header">
        <h3>🤝 Testez votre compatibilité avec les métiers de nos partenaires</h3>
        <p>Sélectionnez un partenaire, puis choisissez un métier dans le modal</p>
      </div>

      <div className="partners-grid">
        {partners.map((partner) => (
          <div key={partner.id} className="partner-card small">
            <div className="partner-header">
              <div className="partner-logo">
                {partner.logo_url ? (
                  <img 
                    src={partner.logo_url} 
                    alt={`Logo ${partner.name}`}
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                ) : null}
                <span className="partner-initial" style={{ display: partner.logo_url ? 'none' : 'flex' }}>
                  {partner.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="partner-info">
                <h4>{partner.name}</h4>
                {partner.website && (
                  <a href={partner.website} target="_blank" rel="noopener noreferrer" className="partner-website">
                    🌐 Site web
                  </a>
                )}
              </div>
            </div>
            <div className="partner-actions">
              <button className="test-btn" onClick={() => openOffersModal(partner)}>
                👀 Voir les métiers
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal des métiers */}
      {showModal && selectedPartner && (
        <div className="partner-modal-overlay" onClick={closeOffersModal}>
          <div className="partner-modal" onClick={(e) => e.stopPropagation()}>
            <div className="partner-modal-header">
              <h4>🎯 Métiers de {selectedPartner.name}</h4>
              <button className="partner-modal-close" onClick={closeOffersModal}>×</button>
            </div>
            <div className="partner-modal-body">
              {selectedPartner.offers && selectedPartner.offers.length > 0 ? (
                <div className="offers-list">
                  {selectedPartner.offers.map((offer) => (
                    <div key={offer.id} className="offer-item">
                      <div className="offer-content">
                        <h6>{offer.title}</h6>
                        <p>{offer.description}</p>
                        <span className="offer-type">{offer.offer_type}</span>
                      </div>
                      <button 
                        onClick={() => testCompatibility(offer, selectedPartner)}
                        className="test-btn"
                      >
                        🧪 Tester
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="no-offers">
                  <p>Aucun métier disponible pour le moment</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PartnerJobs;
