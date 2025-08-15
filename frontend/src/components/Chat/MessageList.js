import React from 'react';
import { ServiceIcon } from '../icons/ModernIcons';

const ActionCard = ({ action, onClick, disabled, documentStatus }) => {
  return (
    <div
      onClick={() => !disabled && onClick()}
      style={{
        background: 'white',
        border: '1px solid #e5e7eb',
        borderRadius: '12px',
        padding: '1.5rem',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        transition: 'all 0.3s ease',
        position: 'relative'
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled) {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = 'none';
        }
      }}
    >
      {/* Icône moderne */}
      <div style={{
        marginBottom: '1rem',
        color: '#374151'
      }}>
        <ServiceIcon 
          type={action.iconType || 'document'} 
          size={28} 
        />
      </div>
      {/* Titre */}
      <h3 style={{
        margin: '0 0 0.75rem 0',
        fontSize: '1.1rem',
        fontWeight: '600',
        color: '#1f2937'
      }}>
        {action.title}
      </h3>
      {/* Conseils principaux - EN GRAND */}
      <div style={{
        marginBottom: '1rem',
        padding: '1rem',
        background: '#f8fafc',
        borderRadius: '8px',
        borderLeft: '4px solid #059669'
      }}>
        <h4 style={{
          margin: '0 0 0.5rem 0',
          fontSize: '0.9rem',
          fontWeight: '600',
          color: '#059669',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          💡 Conseils
        </h4>
        <p style={{
          margin: 0,
          fontSize: '0.85rem',
          color: '#374151',
          lineHeight: '1.4'
        }}>
          {action.advice || "Cliquez pour obtenir des conseils personnalisés"}
        </p>
      </div>
      {/* Prérequis - EN PETIT */}
      {(action.requiresCV || action.requiresOffer) && (
        <div style={{
          fontSize: '0.75rem',
          color: '#6b7280',
          marginTop: '0.5rem',
          padding: '0.75rem',
          background: '#f9fafb',
          borderRadius: '6px',
          border: '1px solid #f3f4f6'
        }}>
          <div style={{ 
            fontWeight: '600', 
            marginBottom: '0.25rem',
            color: '#4b5563'
          }}>
            Ce service nécessite :
          </div>
          <div style={{ 
            display: 'flex', 
            gap: '0.5rem', 
            flexWrap: 'wrap' 
          }}>
            {action.requiresCV && (
              <span style={{
                padding: '0.2rem 0.4rem',
                borderRadius: '4px',
                fontSize: '0.7rem',
                fontWeight: '500',
                background: documentStatus.cv?.uploaded ? '#dcfce7' : '#fef2f2',
                color: documentStatus.cv?.uploaded ? '#166534' : '#dc2626'
              }}>
                CV {documentStatus.cv?.uploaded ? '✓' : '✗'}
              </span>
            )}
            {action.requiresOffer && (
              <span style={{
                padding: '0.2rem 0.4rem',
                borderRadius: '4px',
                fontSize: '0.7rem',
                fontWeight: '500',
                background: documentStatus.offre_emploi?.uploaded ? '#dcfce7' : '#fef2f2',
                color: documentStatus.offre_emploi?.uploaded ? '#166534' : '#dc2626'
              }}>
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
