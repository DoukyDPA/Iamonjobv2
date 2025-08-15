// REMPLACER frontend/src/components/Services/ActionCard.js
// ActionCard SANS styles inline - utilise les classes CSS

import React from 'react';

const ActionCard = ({ action, onClick, disabled, documentStatus }) => {
  return (
    <div
      onClick={() => !disabled && onClick()}
      className={`action-card ${disabled ? 'action-card-disabled' : 'action-card-enabled'}`}
    >
      {/* Icône */}
      <div className="action-card-icon">
        {action.icon || '📄'}
      </div>
      
      {/* Titre */}
      <h3 className="action-card-title">
        {action.title}
      </h3>
      
      {/* Section conseils mise en avant */}
      <div className="action-card-advice">
        <h4 className="advice-title">
          💡 Conseils
        </h4>
        <p className="advice-content">
          {action.advice || action.description || "Cliquez pour obtenir des conseils personnalisés"}
        </p>
      </div>
      
      {/* Section prérequis discrète */}
      {(action.requiresCV || action.requiresOffer) && (
        <div className="action-card-requirements">
          <div className="requirements-title">
            Ce service nécessite :
          </div>
          <div className="requirements-badges">
            {action.requiresCV && (
              <span className={`requirement-badge ${documentStatus.cv?.uploaded ? 'available' : 'missing'}`}>
                CV {documentStatus.cv?.uploaded ? '✓' : '✗'}
              </span>
            )}
            {action.requiresOffer && (
              <span className={`requirement-badge ${documentStatus.offre_emploi?.uploaded ? 'available' : 'missing'}`}>
                Offre d'emploi {documentStatus.offre_emploi?.uploaded ? '✓' : '✗'}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ActionCard;
