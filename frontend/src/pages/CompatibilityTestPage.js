// frontend/src/pages/CompatibilityTestPage.js
// Page de test de compatibilité pour les métiers des partenaires

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import './CompatibilityTestPage.css';

const CompatibilityTestPage = () => {
  const { user } = useAuth();
  const [testOffer, setTestOffer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Récupérer les informations du métier à tester depuis localStorage
    const storedOffer = localStorage.getItem('test_offer');
    if (storedOffer) {
      try {
        const offerData = JSON.parse(storedOffer);
        setTestOffer(offerData);
        console.log('🎯 Métier à tester:', offerData);
      } catch (err) {
        console.error('Erreur parsing offre:', err);
        setError('Erreur lors du chargement du métier à tester');
      }
    } else {
      setError('Aucun métier sélectionné pour le test');
    }
    setLoading(false);
  }, []);

  const startCompatibilityTest = () => {
    if (!testOffer) return;
    
    console.log('🚀 Démarrage test de compatibilité pour:', testOffer.title);
    
    // Rediriger vers la page de test de compatibilité existante
    // avec les paramètres du métier
    const params = new URLSearchParams({
      offer_id: testOffer.id,
      offer_title: testOffer.title,
      offer_description: testOffer.description,
      partner_id: testOffer.partner_id,
      partner_name: testOffer.partner_name
    });
    
    window.location.href = `/compatibility?${params.toString()}`;
  };

  const goBackToPartners = () => {
    // Nettoyer localStorage et retourner à la page des partenaires
    localStorage.removeItem('test_offer');
    window.location.href = '/admin/partners';
  };

  if (loading) {
    return (
      <div className="compatibility-test-page">
        <div className="loading-container">
          <h1>⏳ Chargement...</h1>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="compatibility-test-page">
        <div className="error-container">
          <h1>❌ Erreur</h1>
          <p>{error}</p>
          <button onClick={goBackToPartners} className="back-btn">
            ← Retour aux partenaires
          </button>
        </div>
      </div>
    );
  }

  if (!testOffer) {
    return (
      <div className="compatibility-test-page">
        <div className="error-container">
          <h1>❌ Aucun métier sélectionné</h1>
          <p>Veuillez sélectionner un métier depuis la page des partenaires.</p>
          <button onClick={goBackToPartners} className="back-btn">
            ← Retour aux partenaires
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="compatibility-test-page">
      <div className="test-header">
        <h1>🧪 Test de Compatibilité</h1>
        <p>Testez la compatibilité de votre CV avec ce métier</p>
      </div>

      <div className="offer-details">
        <div className="offer-card">
          <div className="offer-header">
            <h2>🎯 {testOffer.title}</h2>
            <span className="offer-type">{testOffer.offer_type}</span>
          </div>
          
          <div className="offer-info">
            <p><strong>Description:</strong> {testOffer.description}</p>
            <p><strong>Partenaire:</strong> {testOffer.partner_name}</p>
          </div>

          <div className="test-actions">
            <button 
              onClick={startCompatibilityTest}
              className="start-test-btn"
            >
              🚀 Commencer le test
            </button>
            
            <button 
              onClick={goBackToPartners}
              className="back-btn"
            >
              ← Retour aux partenaires
            </button>
          </div>
        </div>
      </div>

      <div className="test-info">
        <h3>ℹ️ Comment fonctionne le test ?</h3>
        <div className="info-steps">
          <div className="step">
            <span className="step-number">1</span>
            <p>Votre CV sera analysé automatiquement</p>
          </div>
          <div className="step">
            <span className="step-number">2</span>
            <p>IA évalue la compatibilité avec le métier</p>
          </div>
          <div className="step">
            <span className="step-number">3</span>
            <p>Vous recevez un score et des recommandations</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompatibilityTestPage;
