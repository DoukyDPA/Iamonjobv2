// FICHIER : frontend/src/components/Services/ServicesGrid.js
// NOUVEAU FICHIER - Vue d'ensemble de tous les services

import React from 'react';
import { Link } from 'react-router-dom';
import { getServicesByCategory, canExecuteService } from '../../services/servicesConfig';
import { useApp } from '../../context/AppContext';
import { ServiceIcon } from '../icons/ModernIcons';

const ServicesGrid = () => {
  const { documentStatus } = useApp();
  const servicesByCategory = getServicesByCategory();
  
  // ✅ FONCTION DE CONVERSION ID -> URL
  const convertServiceIdToUrl = (serviceId) => {
    return serviceId.replace(/_/g, '-');  // Remplace _ par -
  };
  
  const renderServiceCard = (service) => {
    const canExecute = canExecuteService(service.id, documentStatus);
    
    return (
      <Link
        key={service.id}
        to={`/${convertServiceIdToUrl(service.id)}`}  // ✅ CONVERSION ID -> URL
        style={{
          display: 'block',
          textDecoration: 'none',
          color: 'inherit'
        }}
      >
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '1.5rem',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          border: '1px solid #e5e7eb',
          transition: 'all 0.3s ease',
          opacity: canExecute ? 1 : 0.6,
          cursor: 'pointer',
          ':hover': {
            transform: 'translateY(-2px)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
          }
        }}>
          <div style={{
            marginBottom: '1rem',
            textAlign: 'center',
            color: '#374151'
          }}>
            <ServiceIcon 
              type={service.iconType || 'document'} 
              size={32} 
              className="service-icon" 
            />
          </div>
          
          <h3 style={{
            margin: '0 0 0.5rem 0',
            fontSize: '1.2rem',
            fontWeight: '600',
            color: '#1f2937'
          }}>
            {service.title}
          </h3>
          
          <p style={{
            margin: '0 0 1rem 0',
            fontSize: '0.9rem',
            color: '#6b7280',
            lineHeight: '1.4'
          }}>
            {service.description}
          </p>
          
          <div style={{
            display: 'flex',
            gap: '0.5rem',
            flexWrap: 'wrap',
            marginBottom: '1rem'
          }}>
            {service.requiresCV && (
              <span style={{
                padding: '0.25rem 0.5rem',
                borderRadius: '4px',
                fontSize: '0.75rem',
                background: documentStatus.cv?.uploaded ? '#dcfce7' : '#fef2f2',
                color: documentStatus.cv?.uploaded ? '#166534' : '#dc2626'
              }}>
                CV {documentStatus.cv?.uploaded ? '✓' : '✗'}
              </span>
            )}
            {service.requiresJobOffer && (
              <span style={{
                padding: '0.25rem 0.5rem',
                borderRadius: '4px',
                fontSize: '0.75rem',
                background: documentStatus.offre_emploi?.uploaded ? '#dcfce7' : '#fef2f2',
                color: documentStatus.offre_emploi?.uploaded ? '#166534' : '#dc2626'
              }}>
                Offre {documentStatus.offre_emploi?.uploaded ? '✓' : '✗'}
              </span>
            )}
            {service.requiresQuestionnaire && (
              <span style={{
                padding: '0.25rem 0.5rem',
                borderRadius: '4px',
                fontSize: '0.75rem',
                background: documentStatus.questionnaire?.uploaded ? '#dcfce7' : '#fef2f2',
                color: documentStatus.questionnaire?.uploaded ? '#166534' : '#dc2626'
              }}>
                Questionnaire {documentStatus.questionnaire?.uploaded ? '✓' : '✗'}
              </span>
            )}
          </div>
          
          <div style={{
            padding: '0.5rem 1rem',
            borderRadius: '6px',
            background: canExecute ? '#e6f3ff' : '#f3f4f6',
            color: canExecute ? '#0066cc' : '#6b7280',
            fontSize: '0.85rem',
            textAlign: 'center',
            fontWeight: '500'
          }}>
            {canExecute ? 'Disponible' : 'Documents requis manquants'}
          </div>
        </div>
      </Link>
    );
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <h1 style={{ 
          fontSize: '2.5rem', 
          fontWeight: 'bold',
          background: 'linear-gradient(135deg, #0a6b79, #22c55e)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: '1rem'
        }}>
          🚀 Services IA pour l'Emploi
        </h1>
        <p style={{ 
          fontSize: '1.2rem',
          color: '#6b7280',
          maxWidth: '600px',
          margin: '0 auto'
        }}>
          Optimisez votre recherche d'emploi avec nos assistants IA spécialisés
        </p>
      </div>

      {Object.entries(servicesByCategory).map(([category, services]) => (
        <div key={category} style={{ marginBottom: '3rem' }}>
          <h2 style={{
            fontSize: '1.5rem',
            fontWeight: '600',
            color: '#1f2937',
            marginBottom: '1.5rem',
            textTransform: 'capitalize'
          }}>
            📂 {category}
          </h2>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '1.5rem'
          }}>
            {services.map(renderServiceCard)}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ServicesGrid;
