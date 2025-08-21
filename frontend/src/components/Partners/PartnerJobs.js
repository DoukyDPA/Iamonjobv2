// frontend/src/components/Partners/PartnerJobs.js
// Composant pour afficher les partenaires et leurs métiers

import React, { useState, useEffect } from 'react';
import './PartnerJobs.css';

const PartnerJobs = () => {
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
                return {
                  ...partner,
                  offers: []
                };
              }
            } catch (error) {
              console.error(`Erreur chargement métiers pour ${partner.name}:`, error);
              return {
                ...partner,
                offers: []
              };
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

  const testCompatibility = (offer, partner) => {
    // Stocker les informations du métier pour la page de test
    localStorage.setItem('test_offer', JSON.stringify({
      id: offer.id,
      title: offer.title,
      description: offer.description,
      offer_type: offer.offer_type,
      partner_id: partner.id,
      partner_name: partner.name
    }));

    // Rediriger vers la page de test de compatibilité
    window.location.href = '/compatibility-test';
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
          <button onClick={loadPartners} className="retry-btn">
            🔄 Réessayer
          </button>
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
        <p>Sélectionnez un métier qui vous intéresse pour lancer l'analyse de compatibilité avec votre CV</p>
      </div>

      <div className="partners-grid">
        {partners.map((partner) => (
          <div key={partner.id} className="partner-card">
            <div className="partner-header">
              <div className="partner-logo">
                {partner.logo_url ? (
                  <img 
                    src={partner.logo_url} 
                    alt={`Logo ${partner.name}`}
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'block';
                    }}
                  />
                ) : null}
                <span className="partner-initial" style={{ display: partner.logo_url ? 'none' : 'block' }}>
                  {partner.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="partner-info">
                <h4>{partner.name}</h4>
                <p className="partner-description">{partner.description || 'Aucune description disponible'}</p>
                {partner.website && (
                  <a href={partner.website} target="_blank" rel="noopener noreferrer" className="partner-website">
                    🌐 Site web
                  </a>
                )}
              </div>
            </div>

            <div className="partner-offers">
              <h5>🎯 Métiers disponibles ({partner.offers?.length || 0})</h5>
              
              {partner.offers && partner.offers.length > 0 ? (
                <div className="offers-list">
                  {partner.offers.map((offer) => (
                    <div key={offer.id} className="offer-item">
                      <div className="offer-content">
                        <h6>{offer.title}</h6>
                        <p>{offer.description}</p>
                        <span className="offer-type">{offer.offer_type}</span>
                      </div>
                      <button 
                        onClick={() => testCompatibility(offer, partner)}
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
        ))}
      </div>
    </div>
  );
};

export default PartnerJobs;
