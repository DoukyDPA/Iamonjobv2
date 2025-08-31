// FICHIER : frontend/src/components/Services/ServicesGrid.js
// NOUVEAU FICHIER - Vue d'ensemble de tous les services avec API en temps réel

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { ServiceIcon, LogoIcon } from '../icons/ModernIcons';

const ServicesGrid = ({ filterTheme = null }) => {
  const { documentStatus } = useApp();
  const [servicesByCategory, setServicesByCategory] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Charger les services depuis l'API Supabase
  useEffect(() => {
    const loadServices = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Charger les services depuis l'API
        const response = await fetch('/api/services/by-theme');
        const data = await response.json();
        
        if (data.success && data.themes) {
          // Convertir les services Supabase au format attendu par le composant
          const formattedServices = formatServicesFromAPI(data.themes);
          
          if (filterTheme) {
            // Filtrer par thème
            const filtered = {};
            if (formattedServices[filterTheme]) {
              filtered[filterTheme] = formattedServices[filterTheme];
            }
            setServicesByCategory(filtered);
          } else {
            setServicesByCategory(formattedServices);
          }
        } else {
          throw new Error(data.error || 'Erreur lors du chargement des services');
        }
        
      } catch (error) {
        console.error('Erreur chargement services:', error);
        setError(error.message);
        // Fallback avec configuration locale si l'API échoue
        setServicesByCategory(getFallbackServices());
      } finally {
        setLoading(false);
      }
    };
    
    loadServices();
    
    // Rafraîchir les services toutes les 30 secondes pour les mises à jour admin
    const refreshInterval = setInterval(loadServices, 30000);
    
    return () => clearInterval(refreshInterval);
  }, [filterTheme]);

  // Formater les services de l'API au format attendu par le composant
  const formatServicesFromAPI = (apiThemes) => {
    const formatted = {};
    
    Object.entries(apiThemes).forEach(([theme, services]) => {
      formatted[theme] = services.map(service => ({
        id: service.service_id,
        title: service.title,
        coachAdvice: service.coach_advice,
        icon: getServiceIcon(service.theme),
        requiresCV: service.requires_cv,
        requiresJobOffer: service.requires_job_offer,
        requiresQuestionnaire: service.requires_questionnaire,
        difficulty: service.difficulty,
        durationMinutes: service.duration_minutes,
        visible: service.visible,
        featured: service.featured
      }));
    });
    
    return formatted;
  };

  // Obtenir l'icône appropriée selon le thème
  const getServiceIcon = (theme) => {
    const iconMap = {
      'optimize_profile': <LogoIcon size={20} />,
      'evaluate_offer': <LogoIcon size={20} />,
      'apply_jobs': <LogoIcon size={20} />,
      'interview_tips': <LogoIcon size={20} />,
      'networking': <LogoIcon size={24} />,
      'career_development': <LogoIcon size={20} />
    };
    return iconMap[theme] || <LogoIcon size={20} />;
  };

  // Configuration de fallback si l'API échoue
  const getFallbackServices = () => {
    return {
      evaluate_offer: [
        {
          id: 'cv_offer_compatibility',
          title: 'Compatibilité CV-Offre',
          coachAdvice: 'Découvrez votre taux de compatibilité avec une offre d\'emploi',
          icon: '🎯',
          requiresCV: true,
          requiresJobOffer: true,
          requiresQuestionnaire: false
        }
      ],
      optimize_profile: [
        {
          id: 'analyze_cv',
          title: 'Analyse de CV',
          coachAdvice: 'Laissez notre IA analyser votre CV et obtenir des recommandations personnalisées',
          icon: '📄',
          requiresCV: true,
          requiresJobOffer: false,
          requiresQuestionnaire: false
        }
      ]
    };
  };

  // Vérifier si un service peut être exécuté
  const canExecuteService = (service) => {
    const missingDocs = [];
    
    if (service.requiresCV && !documentStatus.cv?.uploaded) {
      missingDocs.push('CV');
    }
    if (service.requiresJobOffer && !documentStatus.offre_emploi?.uploaded) {
      missingDocs.push('Offre d\'emploi');
    }
    if (service.requiresQuestionnaire && !documentStatus.questionnaire?.uploaded) {
      missingDocs.push('Questionnaire');
    }
    
    return { canExecute: missingDocs.length === 0, missingDocs };
  };

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

  // Affichage des erreurs
  if (error) {
    return (
      <div style={{
        textAlign: 'center',
        padding: '2rem',
        color: '#dc2626'
      }}>
        <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⚠️</div>
        Erreur de chargement : {error}
        <button 
          onClick={() => window.location.reload()}
          style={{
            marginTop: '1rem',
            padding: '0.5rem 1rem',
            background: '#dc2626',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          Réessayer
        </button>
      </div>
    );
  }

  const renderServiceCard = (service) => {
    const { canExecute, missingDocs } = canExecuteService(service);
    
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
          {/* Badge de mise en avant */}
          {service.featured && (
            <div style={{
              position: 'absolute',
              top: '1rem',
              right: '1rem',
              background: '#f59e0b',
              color: 'white',
              padding: '0.25rem 0.5rem',
              borderRadius: '4px',
              fontSize: '0.75rem',
              fontWeight: '600'
            }}>
              ⭐ Mis en avant
            </div>
          )}

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

          {/* Badge de difficulté */}
          {service.difficulty && (
            <div style={{
              display: 'inline-block',
              padding: '0.25rem 0.5rem',
              borderRadius: '4px',
              fontSize: '0.75rem',
              fontWeight: '500',
              marginBottom: '1rem',
              background: getDifficultyColor(service.difficulty).background,
              color: getDifficultyColor(service.difficulty).color
            }}>
              {getDifficultyLabel(service.difficulty)}
            </div>
          )}

          {/* Durée */}
          {service.durationMinutes && (
            <div style={{
              textAlign: 'center',
              fontSize: '0.8rem',
              color: '#6b7280',
              marginBottom: '1rem'
            }}>
              ⏱️ {service.durationMinutes} min
            </div>
          )}
          
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
            {canExecute ? 'Disponible' : `Documents requis : ${missingDocs.join(', ')}`}
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

  // Obtenir la couleur de difficulté
  const getDifficultyColor = (difficulty) => {
    const colors = {
      'beginner': { background: '#dcfce7', color: '#166534' },
      'intermediate': { background: '#fef3c7', color: '#92400e' },
      'advanced': { background: '#fee2e2', color: '#991b1b' }
    };
    return colors[difficulty] || colors.beginner;
  };

  // Obtenir le label de difficulté
  const getDifficultyLabel = (difficulty) => {
    const labels = {
      'beginner': 'Débutant',
      'intermediate': 'Intermédiaire',
      'advanced': 'Avancé'
    };
    return labels[difficulty] || 'Débutant';
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
      {renderCategory('evaluate_offer', servicesByCategory.evaluate_offer, <><LogoIcon size={28} /> Évaluer une offre d'emploi</>)}
      {renderCategory('optimize_profile', servicesByCategory.optimize_profile, <><LogoIcon size={28} /> Améliorer mon CV</>)}
      {renderCategory('apply_jobs', servicesByCategory.apply_jobs, <><LogoIcon size={28} /> Candidater</>)}
      {renderCategory('interview_tips', servicesByCategory.interview_tips, <><LogoIcon size={28} /> Préparer l'entretien</>)}
      {renderCategory('networking', servicesByCategory.networking, <><LogoIcon size={32} /> Networking</>)}
    </div>
  );
};

export default ServicesGrid;
