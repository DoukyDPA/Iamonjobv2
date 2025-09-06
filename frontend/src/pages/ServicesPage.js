// NOUVEAU FICHIER : frontend/src/pages/ServicesPage.js
// Page principale des services organisée par thèmes

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';

const ServicesPage = () => {
  const { documentStatus } = useApp();
  const [servicesData, setServicesData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Charger la configuration des services depuis le backend
    fetchServicesConfig();
  }, []);

  const fetchServicesConfig = async () => {
    try {
      const response = await fetch('/api/services/config');
      const data = await response.json();
      
      if (data.success && data.themes) {
        // Appliquer le fallback pour les coachAdvice
        const enhancedData = enhanceServicesWithFallback(data);
        setServicesData(enhancedData);
      } else {
        // Fallback avec configuration locale
        setServicesData(getLocalServicesConfig());
      }
    } catch (error) {
      console.error('Erreur chargement services:', error);
      // Fallback avec configuration locale
      setServicesData(getLocalServicesConfig());
    } finally {
      setLoading(false);
    }
  };

  const enhanceServicesWithFallback = (data) => {
    // Importer SERVICES_CONFIG pour le fallback
    const { SERVICES_CONFIG } = require('../services/servicesConfig');
    
    const enhanced = { ...data };
    
    if (enhanced.themes) {
      Object.keys(enhanced.themes).forEach(themeKey => {
        if (enhanced.themes[themeKey] && enhanced.themes[themeKey].services) {
          enhanced.themes[themeKey].services = enhanced.themes[themeKey].services.map(service => {
            const fallbackConfig = SERVICES_CONFIG[service.id];
            return {
              ...service,
              coachAdvice: service.coach_advice || fallbackConfig?.coachAdvice || ''
            };
          });
        }
      });
    }
    
    if (enhanced.featured) {
      const fallbackConfig = SERVICES_CONFIG[enhanced.featured.id];
      enhanced.featured = {
        ...enhanced.featured,
        coachAdvice: enhanced.featured.coach_advice || fallbackConfig?.coachAdvice || ''
      };
    }
    
    return enhanced;
  };

  const getLocalServicesConfig = () => {
    // Configuration de fallback
    return {
      themes: {
        evaluate_offer: {
          title: "🎯 Évaluer une offre d'emploi",
          services: [
            {
              id: 'matching_cv_offre',
              title: 'Matching CV/Offre',
              coachAdvice: 'Découvrez précisément votre adéquation avec cette offre grâce à une analyse IA approfondie avec graphiques détaillés.',
              slug: 'matching-cv-offre',
              requiresCV: true,
              requiresJobOffer: true,
              difficulty: 'intermediate',
              // duration removed - not needed
            }
          ]
        },
        improve_cv: {
          title: "📄 Améliorer mon CV",
          services: [
            {
              id: 'analyze_cv',
              title: 'Évaluez votre CV',
              coachAdvice: 'Obtenez une évaluation professionnelle de votre CV avec des recommandations concrètes pour l\'optimiser.',
              slug: 'analyze-cv',
              requiresCV: true,
              requiresJobOffer: false,
              difficulty: 'beginner',
              // duration removed - not needed
            },
            {
              id: 'cv_ats_optimization',
              title: 'Optimisez votre CV pour les ATS',
              coachAdvice: 'Adaptez votre CV pour qu\'il soit parfaitement lisible par les systèmes de tri automatiques des entreprises.',
              slug: 'cv-ats-optimization',
              requiresCV: true,
              requiresJobOffer: true,
              difficulty: 'intermediate',
              // duration removed - not needed
            }
          ]
        },
        apply_jobs: {
          title: "✉️ Candidater",
          services: [
            {
              id: 'cover_letter_advice',
              title: 'Conseils lettre de motivation',
              coachAdvice: 'Recevez des conseils personnalisés pour structurer et rédiger une lettre de motivation percutante.',
              slug: 'cover-letter-advice',
              requiresCV: true,
              requiresJobOffer: true,
              difficulty: 'beginner',
              // duration removed - not needed
            },
            {
              id: 'professional_pitch',
              title: 'Présentez-vous en 30 secondes chrono',
              coachAdvice: 'Développez un pitch percutant pour vous présenter efficacement en entretien ou en networking.',
              slug: 'professional-pitch',
              requiresCV: true,
              requiresJobOffer: false,
              difficulty: 'intermediate',
              // duration removed - not needed
            }
          ]
        },
        career_project: {
          title: "🚀 Reconstruire mon projet professionnel",
          services: [
            {
              id: 'reconversion_analysis',
              title: 'Découvrez des pistes de reconversion',
              coachAdvice: 'Explorez une reconversion professionnelle avec une analyse détaillée des étapes et opportunités.',
              slug: 'reconversion-analysis',
              requiresCV: true,
              requiresJobOffer: false,
              difficulty: 'advanced',
              // duration removed - not needed
            },
            {
              id: 'career_transition',
              title: 'Vers quel métier aller ?',
              coachAdvice: 'Découvrez les métiers compatibles avec votre profil et vos envies.',
              slug: 'career-transition',
              requiresCV: true,
              requiresJobOffer: false,
              difficulty: 'intermediate',
              // duration removed - not needed
            },
            {
              id: 'industry_orientation',
              title: "Et pourquoi pas un métier dans l'industrie ?",
              coachAdvice: 'Analyse personnalisée des métiers industriels accessibles.',
              slug: 'industry-orientation',
              requiresCV: true,
              requiresJobOffer: false,
              difficulty: 'intermediate',
              // duration removed - not needed
            }
          ]
        }
      },
      featured: {
        id: 'reconversion_analysis',
        title: 'Tester ma compatibilité avec le métier de chauffeur de bus',
        coachAdvice: 'Découvrez si le métier de chauffeur de bus correspond à votre profil et vos aspirations professionnelles.',
        slug: 'reconversion-analysis'
      }
    };
  };

  const canExecuteService = (service) => {
    const missing = [];
    if (service.requiresCV && !documentStatus.cv?.uploaded) missing.push('CV');
    if (service.requiresJobOffer && !documentStatus.offre_emploi?.uploaded) missing.push('Offre d\'emploi');
    if (service.requiresQuestionnaire && !documentStatus.questionnaire?.uploaded) missing.push('Questionnaire');
    return missing;
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'beginner': return '#10b981';
      case 'intermediate': return '#f59e0b';
      case 'advanced': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getDifficultyLabel = (difficulty) => {
    switch (difficulty) {
      case 'beginner': return 'Débutant';
      case 'intermediate': return 'Intermédiaire';
      case 'advanced': return 'Avancé';
      default: return difficulty;
    }
  };

  if (loading) {
    return (
      <div className="services-page-loading">
        <div className="services-loading-text">
          Chargement des services...
        </div>
      </div>
    );
  }

  return (
    <div className="services-page">
      {/* En-tête */}
      <div className="services-header">
        <h1 className="services-theme-title">
          🚀 Services IA pour l'Emploi
        </h1>
        <p className="services-theme-description">
          Optimisez votre recherche d'emploi avec nos assistants IA spécialisés
        </p>
      </div>

      {/* Service mis en avant */}
      {servicesData?.featured && (
        <div className="service-featured">
          <div className="service-featured-badge">
            ⭐ Service du mois
          </div>
          <h2 className="service-title">
            {servicesData.featured.title}
          </h2>
          <p className="service-description">
            {servicesData.featured.coachAdvice}
          </p>
          <Link
            to={`/${servicesData.featured.slug}`}
            className="service-featured-link"
          >
            🎯 Découvrir ce service
          </Link>
        </div>
      )}

      {/* Services par thème */}
      {servicesData?.themes && Object.entries(servicesData.themes).map(([themeId, theme]) => (
        <div key={themeId} className="services-theme">
          <h2 className="services-theme-title">
            {theme.title}
          </h2>
          <div className="services-grid">
            {theme.services.map(service => {
              const missingDocs = canExecuteService(service);
              const canExecute = missingDocs.length === 0;
              return (
                <Link
                  key={service.id}
                  to={`/${service.slug}`}
                  className="service-link"
                >
                  <div className={`service-card${canExecute ? '' : ' service-card-disabled'}`}
                  >
                    {/* Badge difficulté */}
                    <div className={`service-difficulty ${service.difficulty}`}>
                      {getDifficultyLabel(service.difficulty)}
                    </div>
                    <h3 className="service-title">
                      {service.title}
                    </h3>
                    {/* Conseil de coach */}
                    <div className="service-coach-advice">
                      <div className="service-coach-label">
                        💡 Conseil de coach
                      </div>
                      <p className="service-coach-text">
                        {service.coachAdvice}
                      </p>
                    </div>
                    {/* Documents requis */}
                    <div className="service-documents">
                      <strong>Documents requis :</strong>
                      <div className="service-documents-list">
                        {service.requiresCV && (
                          <span className={`service-doc-tag${documentStatus.cv?.uploaded ? ' uploaded' : ' missing'}`}>
                            CV {documentStatus.cv?.uploaded ? '✓' : '✗'}
                          </span>
                        )}
                        {service.requiresJobOffer && (
                          <span className={`service-doc-tag${documentStatus.offre_emploi?.uploaded ? ' uploaded' : ' missing'}`}>
                            Offre d'emploi {documentStatus.offre_emploi?.uploaded ? '✓' : '✗'}
                          </span>
                        )}
                        {service.requiresQuestionnaire && (
                          <span className={`service-doc-tag${documentStatus.questionnaire?.uploaded ? ' uploaded' : ' missing'}`}>
                            Questionnaire {documentStatus.questionnaire?.uploaded ? '✓' : '✗'}
                          </span>
                        )}
                      </div>
                    </div>
                    {/* Footer avec statut */}
                    <div className="service-card-footer">
                      <div className={`service-status${canExecute ? ' available' : ' missing-docs'}`}>
                        {canExecute ? '🚀 Disponible' : `📋 ${missingDocs.join(', ')} requis`}
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ServicesPage;
