// frontend/src/components/Common/UserIndividualization.js
import React, { useEffect, useState } from 'react';

/**
 * Composant pour gérer l'individualisation des utilisateurs
 * Assure que chaque utilisateur a un identifiant unique même sur le même ordinateur
 */
const UserIndividualization = ({ children }) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [clientId, setClientId] = useState(null);

  useEffect(() => {
    const initializeUserIndividualization = async () => {
      try {
        // Vérifier si un client_id existe déjà dans les cookies
        const existingClientId = getCookie('iamonjob_client_id');
        
        if (existingClientId) {
          setClientId(existingClientId);
          console.log('🆔 Client ID existant trouvé:', existingClientId);
        } else {
          // Créer un nouveau client_id
          const response = await fetch('/api/health/set-client-id', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include', // Important pour les cookies
          });

          if (response.ok) {
            const data = await response.json();
            if (data.success) {
              setClientId(data.client_id);
              console.log('🆔 Nouveau Client ID créé:', data.client_id);
            }
          } else {
            console.warn('⚠️ Impossible de créer un Client ID, utilisation du fallback');
            // Fallback: créer un ID local
            const fallbackId = generateFallbackId();
            setClientId(fallbackId);
          }
        }
      } catch (error) {
        console.error('❌ Erreur lors de l\'initialisation de l\'individualisation:', error);
        // Fallback: créer un ID local
        const fallbackId = generateFallbackId();
        setClientId(fallbackId);
      } finally {
        setIsInitialized(true);
      }
    };

    initializeUserIndividualization();
  }, []);

  // Fonction pour récupérer un cookie
  const getCookie = (name) => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
  };

  // Fonction de fallback pour générer un ID local
  const generateFallbackId = () => {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 9);
    return `${timestamp}_${random}`;
  };

  // Afficher un indicateur de chargement si pas encore initialisé
  if (!isInitialized) {
    return (
      <div style={{ 
        position: 'fixed', 
        top: 0, 
        left: 0, 
        right: 0, 
        bottom: 0, 
        background: 'rgba(255, 255, 255, 0.8)', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        zIndex: 9999
      }}>
        <div style={{ 
          padding: '20px', 
          background: 'white', 
          borderRadius: '8px', 
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          textAlign: 'center'
        }}>
          <div style={{ 
            width: '40px', 
            height: '40px', 
            border: '4px solid #f3f3f3', 
            borderTop: '4px solid #3498db', 
            borderRadius: '50%', 
            animation: 'spin 1s linear infinite',
            margin: '0 auto 10px'
          }}></div>
          <p style={{ margin: 0, color: '#666' }}>Initialisation de votre session...</p>
        </div>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // Rendre les enfants une fois initialisé
  return children;
};

export default UserIndividualization;
