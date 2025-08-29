// FICHIER : frontend/src/components/Services/ServicesGrid.js
// NOUVEAU FICHIER - Vue d'ensemble de tous les services

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getServicesByCategory, canExecuteService, SERVICES_CONFIG } from '../../services/servicesConfig';
import { useApp } from '../../context/AppContext';
import { ServiceIcon } from '../icons/ModernIcons';

const ServicesGrid = ({ filterTheme = null }) => {
  const { documentStatus } = useApp();
  const [servicesByCategory, setServicesByCategory] = useState({});
  const [loading, setLoading] = useState(true);
  const [adminServices, setAdminServices] = useState({});

  // Charger les services depuis l'API admin
  useEffect(() => {
    const loadAdminServices = async () => {
      try {
        setLoading(true);
        
        // Récupérer le token d'authentification
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        
        if (token) {
          const response = await fetch('/api/admin/services', {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });

          if (response.ok) {
            const data = await response.json();
            if (data.success && data.services) {
              setAdminServices(data.services);
              
              // Filtrer les services selon la visibilité admin ET le thème
              const filteredServices = {};
              Object.entries(data.services).forEach(([serviceId, adminService]) => {
                if (adminService.visible && SERVICES_CONFIG[serviceId]) {
                  const category = adminService.theme;
                  
                  // Si un filtre de thème est spécifié, ne garder que ce thème
                  if (filterTheme && category !== filterTheme) {
                    return;
                  }
                  
                  if (!filteredServices[category]) {
                    filteredServices[category] = [];
                  }
                  filteredServices[category].push(SERVICES_CONFIG[serviceId]);
                }
              });
              
              setServicesByCategory(filteredServices);
            } else {
              // Fallback vers la config par défaut
              const defaultServices = getServicesByCategory();
              if (filterTheme) {
                // Filtrer par thème
                const filtered = {};
                Object.entries(defaultServices).forEach(([category, services]) => {
                  if (category === filterTheme) {
                    filtered[category] = services;
                  }
                });
                setServicesByCategory(filtered);
              } else {
                setServicesByCategory(defaultServices);
              }
            }
          } else {
            // Fallback vers la config par défaut
            const defaultServices = getServicesByCategory();
            if (filterTheme) {
              // Filtrer par thème
              const filtered = {};
              Object.entries(defaultServices).forEach(([category, services]) => {
                if (category === filterTheme) {
                  filtered[category] = services;
                }
              });
              setServicesByCategory(filtered);
            } else {
              setServicesByCategory(defaultServices);
            }
          }
        } else {
          // Pas de token, utiliser la config par défaut
          const defaultServices = getServicesByCategory();
          if (filterTheme) {
            // Filtrer par thème
            const filtered = {};
            Object.entries(defaultServices).forEach(([category, services]) => {
              if (category === filterTheme) {
                filtered[category] = services;
              }
            });
            setServicesByCategory(filtered);
          } else {
            setServicesByCategory(defaultServices);
          }
        }
      } catch (error) {
        console.error('Erreur chargement services admin:', error);
        // Fallback vers la config par défaut
        const defaultServices = getServicesByCategory();
        if (filterTheme) {
          // Filtrer par thème
          const filtered = {};
          Object.entries(defaultServices).forEach(([category, services]) => {
            if (category === filterTheme) {
              filtered[category] = services;
            }
          });
          setServicesByCategory(filtered);
        } else {
          setServicesByCategory(defaultServices);
        }
      } finally {
        setLoading(false);
      }
    };

    loadAdminServices();
  }, [filterTheme]);

  // ✅ FONCTION DE CONVERSION ID -> URL
  const convertServiceIdToUrl = (serviceId) => {
    return serviceId.replace(/_/g, '-');  // Remplace _ par -
  };

  // Indicateur de chargement
  if (loading) {
    return (
      <div style={{
        textAlign: 'center',
        padding: '2rem',
        color: '#6b7280'
      }}>
        <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⏳</div>
        Chargement des services...
      </div>
    );
  }

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
        <div 
          className="service-card"
          style={{
            background: 'white',
            borderRadius: '12px',
            padding: '1.5rem',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            border: '1px solid #e5e7eb',
            transition: 'all 0.3s ease',
            opacity: canExecute ? 1 : 0.6,
            cursor: 'pointer',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          {/* Effet de brillance */}
          <div 
            className="service-shine"
            style={{
              position: 'absolute',
              top: 0,
              left: '-100%',
              width: '100%',
              height: '100%',
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
              transition: 'left 0.5s',
              pointerEvents: 'none'
            }} 
          />
          
          {/* Icône du service */}
          <div style={{
            marginBottom: '1rem',
            textAlign: 'center',
            fontSize: '2rem'
          }}>
            {service.icon}
          </div>
          
          {/* Titre du service */}
          <h3 style={{
            margin: '0 0 0.5rem 0',
            fontSize: '1.2rem',
            fontWeight: '600',
            color: '#1f2937',
            textAlign: 'center'
          }}>
            {service.title}
          </h3>
          
          {/* Description du service */}
          <p style={{
            margin: '0 0 1rem 0',
            fontSize: '0.9rem',
            color: '#6b7280',
            lineHeight: '1.4',
            textAlign: 'center'
          }}>
            {service.coachAdvice}
          </p>
          
          {/* Indicateurs de documents requis */}
          <div style={{
            display: 'flex',
            gap: '0.5rem',
            flexWrap: 'wrap',
            marginBottom: '1rem',
            justifyContent: 'center'
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
          
          {/* Bouton d'action */}
          <div style={{
            textAlign: 'center',
            padding: '0.75rem 1rem',
            borderRadius: '6px',
            background: canExecute ? '#e6f3ff' : '#f3f4f6',
            color: canExecute ? '#0066cc' : '#9ca3af',
            fontSize: '0.85rem',
            fontWeight: '500',
            transition: 'all 0.2s ease'
          }}>
            {canExecute ? 'Disponible' : 'Documents requis manquants'}
          </div>
          
          {/* Effet hover */}
          <style>{`
            .service-card:hover {
              transform: translateY(-2px);
              box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            }
            .service-card:hover .service-shine {
              left: 100%;
            }
          `}</style>
        </div>
      </Link>
    );
  };

  // Si un thème est filtré, afficher directement les services de ce thème
  if (filterTheme) {
    const themeServices = servicesByCategory[filterTheme] || [];
    if (themeServices.length > 0) {
      return (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '1.5rem',
          padding: '0 1rem'
        }}>
          {themeServices.map(renderServiceCard)}
        </div>
      );
    } else {
      // Aucun service pour ce thème
      return (
        <div style={{
          textAlign: 'center',
          padding: '2rem',
          color: '#6b7280'
        }}>
          <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>📭</div>
          Aucun service disponible pour cette catégorie
        </div>
      );
    }
  }

  // Rendu des catégories (pour l'affichage complet)
  const renderCategory = (categoryKey, services, categoryTitle) => {
    if (!services || services.length === 0) return null;

    return (
      <div key={categoryKey} style={{ marginBottom: '3rem' }}>
        <h2 style={{
          fontSize: '1.5rem',
          fontWeight: '700',
          color: '#1f2937',
          marginBottom: '1.5rem',
          textAlign: 'center'
        }}>
          {categoryTitle}
        </h2>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '1.5rem',
          padding: '0 1rem'
        }}>
          {services.map(renderServiceCard)}
        </div>
      </div>
    );
  };

  // Rendu principal (affichage complet)
  return (
    <div style={{ padding: '2rem 0' }}>
      {renderCategory('evaluate_offer', servicesByCategory.evaluate_offer, '🎯 Évaluer une offre d\'emploi')}
      {renderCategory('improve_cv', servicesByCategory.improve_cv, '📄 Améliorer mon CV')}
      {renderCategory('apply_jobs', servicesByCategory.apply_jobs, '✉️ Candidater')}
      {renderCategory('career_project', servicesByCategory.career_project, '🚀 Reconstruire mon projet professionnel')}
    </div>
  );
};

export default ServicesGrid;
