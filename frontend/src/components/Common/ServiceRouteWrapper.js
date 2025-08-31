import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { URL_TO_SERVICE_MAPPING } from '../../services/servicesConfig';
import GenericDocumentProcessor from './GenericDocumentProcessor';

const ServiceRouteWrapper = () => {
  const { serviceId } = useParams();
  const [serviceConfig, setServiceConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Utiliser le mapping pour convertir l'URL en ID de service
  const mappedServiceId = URL_TO_SERVICE_MAPPING[serviceId];
  const convertedServiceId = mappedServiceId || serviceId.replace(/-/g, '_');
  
  // Charger la configuration du service depuis l'API admin
  useEffect(() => {
    const loadServiceConfig = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Charger la configuration depuis l'API admin
        const response = await fetch('/api/services/config');
        const data = await response.json();
        
        if (data.success && data.services) {
          // Trouver le service correspondant
          const service = data.services.find(s => s.id === convertedServiceId);
          if (service) {
            // Convertir le format de l'API admin au format attendu par GenericDocumentProcessor
            const config = {
              id: service.id,
              title: service.title,
              description: service.description || service.coach_advice,
              coachAdvice: service.coach_advice,
              requiresCV: service.requires_cv,
              requiresJobOffer: service.requires_job_offer,
              requiresQuestionnaire: service.requires_questionnaire,
              allowsNotes: service.allows_notes,
              apiEndpoint: service.api_endpoint || `/api/${service.id.replace(/_/g, '/')}`,
              storageKey: `iamonjob_${service.id}`,
              outputType: service.output_type || 'text'
            };
            setServiceConfig(config);
          } else {
            setError(`Service ${convertedServiceId} non trouvé`);
          }
        } else {
          throw new Error(data.error || 'Erreur lors du chargement de la configuration');
        }
      } catch (error) {
        console.error('Erreur chargement configuration service:', error);
        setError(error.message);
        // Fallback avec configuration locale si l'API échoue
        setServiceConfig(getFallbackConfig(convertedServiceId));
      } finally {
        setLoading(false);
      }
    };
    
    loadServiceConfig();
  }, [convertedServiceId]);
  
  // Configuration de fallback si l'API échoue
  const getFallbackConfig = (serviceId) => {
    const fallbackConfigs = {
      'follow_up_email': {
        id: 'follow_up_email',
        title: 'Email de relance',
        description: 'Rédigez un email de relance professionnel',
        coachAdvice: 'L\'IA crée un email de relance professionnel. Votre mission : personnalisez-le avec des éléments de suivi concrets.',
        requiresCV: false,
        requiresJobOffer: true,
        requiresQuestionnaire: false,
        allowsNotes: true,
        apiEndpoint: '/api/followup/generate',
        storageKey: 'iamonjob_follow_up',
        outputType: 'email'
      },
      'matching_cv_offre': {
        id: 'matching_cv_offre',
        title: 'Analyse de compatibilité CV-Offre',
        description: 'Analysez la compatibilité entre votre CV et une offre d\'emploi',
        coachAdvice: 'L\'IA analyse la compatibilité entre votre CV et l\'offre. Votre mission : identifier les points d\'amélioration.',
        requiresCV: true,
        requiresJobOffer: true,
        requiresQuestionnaire: false,
        allowsNotes: false,
        apiEndpoint: '/api/matching/cv-offre',
        storageKey: 'iamonjob_matching',
        outputType: 'analysis'
      }
    };
    
    return fallbackConfigs[serviceId] || null;
  };
  
  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '50vh',
        color: 'white',
        fontSize: '1.1rem'
      }}>
        Chargement de la configuration du service...
      </div>
    );
  }
  
  if (error || !serviceConfig) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '50vh',
        color: 'white',
        fontSize: '1.1rem'
      }}>
        {error || 'Service non trouvé'}
      </div>
    );
  }
  
  return <GenericDocumentProcessor serviceConfig={serviceConfig} />;
};

export default ServiceRouteWrapper; 
