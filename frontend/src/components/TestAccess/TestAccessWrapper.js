// FICHIER : frontend/src/components/TestAccess/TestAccessWrapper.js
// NOUVEAU FICHIER À CRÉER

import React, { useState, useEffect } from 'react';
import TestAccessModal from './TestAccessModal';

const TestAccessWrapper = ({ children }) => {
  const [hasAccess, setHasAccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAccess();
  }, []);

  const checkAccess = () => {
    try {
      const access = localStorage.getItem('iamonjob_test_access');
      const accessDate = localStorage.getItem('iamonjob_test_access_date');
      
      if (access === 'granted' && accessDate) {
        // Vérifier si l'accès n'est pas trop ancien (optionnel - 7 jours)
        const grantedDate = new Date(accessDate);
        const now = new Date();
        const daysDifference = (now - grantedDate) / (1000 * 60 * 60 * 24);
        
        if (daysDifference <= 7) {
          setHasAccess(true);
        } else {
          // Accès expiré, le supprimer
          localStorage.removeItem('iamonjob_test_access');
          localStorage.removeItem('iamonjob_test_access_date');
        }
      }
    } catch (error) {
      console.error('Erreur lors de la vérification d\'accès:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccessGranted = () => {
    setHasAccess(true);
  };

  // Afficher un loader pendant la vérification
  if (isLoading) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'linear-gradient(135deg, #0a6b79 0%, #22c55e 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999
      }}>
        <div style={{
          background: 'white',
          borderRadius: '20px',
          padding: '2rem',
          textAlign: 'center',
          boxShadow: '0 25px 50px rgba(0, 0, 0, 0.3)'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid #e2e8f0',
            borderTop: '4px solid #0a6b79',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 1rem auto'
          }}></div>
          <p style={{ margin: 0, color: '#64748b' }}>Chargement...</p>
        </div>
      </div>
    );
  }

  // Si pas d'accès, afficher le modal
  if (!hasAccess) {
    return <TestAccessModal onAccessGranted={handleAccessGranted} />;
  }

  // Si accès accordé, afficher le contenu normal
  return children;
};

export default TestAccessWrapper;
