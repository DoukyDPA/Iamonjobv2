// FICHIER : frontend/src/components/Services/ServicesGrid.js
// NOUVEAU FICHIER - Vue d'ensemble de tous les services avec API en temps réel

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { ServiceIcon, LogoIcon } from '../icons/ModernIcons';
import { FiArrowRight } from 'react-icons/fi';

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
    
    // Importer SERVICES_CONFIG pour le fallback
    const { SERVICES_CONFIG } = require('../../services/servicesConfig');
    
    Object.entries(apiThemes).forEach(([theme, services]) => {
      formatted[theme] = services.map(service => {
        const serviceId = service.service_id;
        const fallbackConfig = SERVICES_CONFIG[serviceId];
        
        return {
          id: serviceId,
          title: service.title,
          description: service.description || fallbackConfig?.description || '', // Description courte pour l'affichage
          coachAdvice: service.coach_advice || fallbackConfig?.coachAdvice || '',
          icon: getServiceIcon(service.theme),
          requiresCV: service.requires_cv,
          requiresJobOffer: service.requires_job_offer,
          requiresQuestionnaire: service.requires_questionnaire,
          difficulty: service.difficulty,
          visible: service.visible,
          featured: service.featured
        };
      });
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
          id: 'matching_cv_offre',
          title: 'Compatibilité CV-Offre',
          coachAdvice: 'Découvrez votre taux de compatibilité avec une offre d\'emploi',
          icon: <LogoIcon size={20} />,
          requiresCV: true,
          requiresJobOffer: true,
          requiresQuestionnaire: false
        },
        {
          id: 'analyse_emploi',
          title: 'Analysez une offre d\'emploi',
          coachAdvice: 'Décryptez les offres d\'emploi pour mieux candidater',
          icon: <LogoIcon size={20} />,
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
          icon: <LogoIcon size={20} />,
          requiresCV: true,
          requiresJobOffer: false,
          requiresQuestionnaire: false
        }
      ],
      apply_jobs: [
        {
          id: 'job_application',
          title: 'Candidature optimisée',
          coachAdvice: 'Optimisez votre candidature pour maximiser vos chances',
          icon: <LogoIcon size={20} />,
          requiresCV: true,
          requiresJobOffer: true,
          requiresQuestionnaire: false
        },
        {
          id: 'cover_letter',
          title: 'Lettre de motivation',
          coachAdvice: 'Rédigez une lettre de motivation percutante',
          icon: <LogoIcon size={20} />,
          requiresCV: true,
          requiresJobOffer: true,
          requiresQuestionnaire: false
        },
        {
          id: 'linkedin_optimization',
          title: 'Optimiser LinkedIn',
          coachAdvice: 'Améliorez votre profil LinkedIn pour attirer les recruteurs',
          icon: <LogoIcon size={20} />,
          requiresCV: true,
          requiresJobOffer: false,
          requiresQuestionnaire: false
        }
      ],
      improve_cv: [
        {
          id: 'analyze_cv',
          title: 'Analyse de CV',
          coachAdvice: 'Laissez notre IA analyser votre CV et obtenir des recommandations personnalisées',
          icon: <LogoIcon size={20} />,
          requiresCV: true,
          requiresJobOffer: false,
          requiresQuestionnaire: false
        },
        {
          id: 'cv_ats_optimization',
          title: 'Optimisez votre CV pour les ATS',
          coachAdvice: 'Améliorez votre CV pour passer les systèmes de recrutement automatisés',
          icon: <LogoIcon size={20} />,
          requiresCV: true,
          requiresJobOffer: true,
          requiresQuestionnaire: false
        }
      ],
      interview_prep: [
        {
          id: 'interview_prep',
          title: 'Conseils entretien',
          coachAdvice: 'Préparez-vous efficacement pour vos entretiens d\'embauche',
          icon: <LogoIcon size={20} />,
          requiresCV: true,
          requiresJobOffer: true,
          requiresQuestionnaire: false
        },
        {
          id: 'salary_negotiation',
          title: 'Négociez votre salaire',
          coachAdvice: 'Apprenez les techniques pour négocier votre salaire efficacement',
          icon: <LogoIcon size={20} />,
          requiresCV: true,
          requiresJobOffer: true,
          requiresQuestionnaire: true
        }
      ],
      career_project: [
        {
          id: 'career_transition',
          title: 'Vers quel métier ?',
          coachAdvice: 'Découvrez les métiers qui correspondent à votre profil',
          icon: <LogoIcon size={20} />,
          requiresCV: true,
          requiresJobOffer: false,
          requiresQuestionnaire: true
        },
        {
          id: 'reconversion_analysis',
          title: 'Idées de reconversion',
          coachAdvice: 'Explorez les possibilités de reconversion professionnelle',
          icon: <LogoIcon size={20} />,
          requiresCV: true,
          requiresJobOffer: false,
          requiresQuestionnaire: true
        },
        {
          id: 'skills_analysis',
          title: 'Évaluer compétences',
          coachAdvice: 'Évaluez vos compétences et identifiez vos points forts',
          icon: <LogoIcon size={20} />,
          requiresCV: true,
          requiresJobOffer: false,
          requiresQuestionnaire: true
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
        to={`/${convertServiceIdToUrl(service.id)}`}
        style={{
          display: 'block',
          textDecoration: 'none',
          color: 'inherit'
        }}
      >
        <div className="document-tile" style={{
          '--tile-color': '#0a6b79',
          cursor: 'pointer',
          transition: 'all 0.2s ease'
        }}>
          <div className="revolutionary-service-icon" style={{ background: canExecute ? '#0a6b79' : '#9ca3af' }}>
            {service.icon}
          </div>
          <div className="revolutionary-service-content">
            <h4 className="revolutionary-service-title">{service.title}</h4>
            <p className="revolutionary-service-description">{service.description || service.coachAdvice}</p>
            {!canExecute && (
              <div className="revolutionary-service-missing">
                <p className="revolutionary-service-missing-text">
                  Requis : {missingDocs.join(', ')}
                </p>
              </div>
            )}
            {canExecute && (
              <div className="revolutionary-service-access" style={{ color: '#0a6b79' }}>
                Accéder au service
                <FiArrowRight className="revolutionary-service-arrow" />
              </div>
            )}
          </div>
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
      {renderCategory('evaluate_offer', servicesByCategory.evaluate_offer, <><LogoIcon size={28} /> Évaluer une offre d'emploi</>)}
      {renderCategory('optimize_profile', servicesByCategory.optimize_profile, <><LogoIcon size={28} /> Améliorer mon CV</>)}
      {renderCategory('apply_jobs', servicesByCategory.apply_jobs, <><LogoIcon size={28} /> Candidater</>)}
      {renderCategory('interview_tips', servicesByCategory.interview_tips, <><LogoIcon size={28} /> Préparer l'entretien</>)}
      {renderCategory('networking', servicesByCategory.networking, <><LogoIcon size={32} /> Networking</>)}
    </div>
  );
};

export default ServicesGrid;
