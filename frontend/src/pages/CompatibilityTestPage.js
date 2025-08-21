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

  const startCompatibilityTest = async () => {
    if (!testOffer) return;

    console.log('🚀 Démarrage test de compatibilité pour:', testOffer.title);

    try {
      const token = localStorage.getItem('token');
      
      // Limiter la taille du contenu pour éviter l'erreur "Request Line is too large"
      const maxDescriptionLength = 2000; // Limite à 2000 caractères
      const truncatedDescription = testOffer.description 
        ? testOffer.description.substring(0, maxDescriptionLength) + (testOffer.description.length > maxDescriptionLength ? '...' : '')
        : 'Description indisponible';

      const contentLines = [
        `Titre: ${testOffer.title}`,
        testOffer.partner_name ? `Partenaire: ${testOffer.partner_name}` : null,
        testOffer.offer_type ? `Type: ${testOffer.offer_type}` : null,
        '',
        `Description: ${truncatedDescription}`
      ].filter(Boolean);

      const textContent = contentLines.join('\n');

      console.log(`📝 Contenu à envoyer (${textContent.length} caractères):`, textContent.substring(0, 200) + '...');

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

      if (!resp.ok) {
        const txt = await resp.text();
        console.warn('⚠️ Échec upload offre_emploi:', txt);
      } else {
        console.log('✅ Offre d\'emploi pré-remplie avec succès');
      }
    } catch (e) {
      console.warn('⚠️ Erreur lors du préremplissage offre_emploi:', e);
    }

    // Redirection vers le service configuré "matching_cv_offre"
    window.location.href = '/matching-cv-offre';
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
