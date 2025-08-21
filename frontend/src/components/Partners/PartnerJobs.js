// frontend/src/components/Partners/PartnerJobs.js
// Composant simplifié pour rediriger vers la page des partenaires

import React from 'react';
import { FiArrowRight, FiUsers, FiTarget } from 'react-icons/fi';
import './PartnerJobs.css';

const PartnerJobs = () => {
  console.log('PartnerJobs mounted');
  
  // Redirection vers la page des partenaires
  const navigateToPartners = () => {
    window.location.href = '/admin/partners';
  };

  return (
    <div className="partner-jobs-simple">
      <div className="partner-jobs-card">
        <div className="partner-jobs-icon">
          <FiUsers size={48} />
        </div>
        
        <div className="partner-jobs-content">
          <h3>🎯 Découvrez nos partenaires</h3>
          <p>
            Explorez les métiers proposés par nos partenaires et testez votre compatibilité 
            avec votre CV. Sélectionnez un métier qui vous intéresse pour lancer l'analyse.
          </p>
          
          <button 
            onClick={navigateToPartners}
            className="partner-jobs-btn"
          >
            <span>Voir les métiers</span>
            <FiArrowRight className="arrow-icon" />
          </button>
        </div>
        
        <div className="partner-jobs-features">
          <div className="feature">
            <FiTarget className="feature-icon" />
            <span>Métiers variés</span>
          </div>
          <div className="feature">
            <FiUsers className="feature-icon" />
            <span>Partenaires vérifiés</span>
          </div>
          <div className="feature">
            <FiArrowRight className="feature-icon" />
            <span>Test de compatibilité</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PartnerJobs;
