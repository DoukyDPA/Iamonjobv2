// FICHIER : frontend/src/components/Common/GenericDocumentProcessor.js
// VERSION AVEC STYLE COHÉRENT DE LA HOME

import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Link, useParams } from 'react-router-dom';
import { FiArrowLeft, FiDownload, FiCopy, FiUser, FiFileText, FiBriefcase } from 'react-icons/fi';
import { LogoIcon } from '../icons/ModernIcons';
import toast from 'react-hot-toast';
import MatchingAnalysis from '../Analysis/MatchingAnalysis';
import SimpleMarkdownRenderer from './SimpleMarkdownRenderer';
import { getServiceConfig, URL_TO_SERVICE_MAPPING } from '../../services/servicesConfig';

// Utilitaires pour accéder au localStorage sans casser l'exécution
const safeGetStorageItem = (key) => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(key);
    }
  } catch (e) {
    console.warn('localStorage inaccessible', e);
  }
  return null;
};

const safeSetStorageItem = (key, value) => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value);
    }
  } catch (e) {
    console.warn('localStorage inaccessible', e);
  }
};

// Petit composant pour afficher le statut d'un document de manière compacte
const StatusTile = ({ title, icon, uploaded }) => (
  <Link 
    to="/dashboard" 
    style={{ textDecoration: 'none', color: 'inherit' }}
    title={uploaded ? 'Document fourni' : 'Cliquez pour gérer vos documents'}
  >
    <div style={{ 
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      padding: '0.5rem 0.75rem',
      background: uploaded ? '#dcfce7' : '#fef2f2',
      border: `1px solid ${uploaded ? '#16a34a' : '#fecaca'}`,
      borderRadius: '6px',
      color: uploaded ? '#166534' : '#dc2626',
      fontSize: '0.85rem',
      fontWeight: '500',
      cursor: 'pointer',
      transition: 'all 0.2s ease'
    }}>
      {icon}
      <span>{title}</span>
      <span style={{ fontSize: '0.75rem' }}>
        {uploaded ? '✓' : '✗'}
      </span>
    </div>
  </Link>
);

const GenericDocumentProcessor = ({ serviceConfig: propServiceConfig }) => {
  const { documentStatus, loading } = useApp();
  const { serviceId } = useParams();
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [userNotes, setUserNotes] = useState('');
  const [serviceLoading, setServiceLoading] = useState(false);
  const [serviceConfig, setServiceConfig] = useState(null);
  const [autoExecuted, setAutoExecuted] = useState(false);

  // Récupérer la configuration du service depuis l'URL
  useEffect(() => {
    const loadConfig = async () => {
      if (propServiceConfig) {
        // Si la config est passée en prop (ancien usage)
        setServiceConfig(propServiceConfig);
        return;
      }

      if (!serviceId) return;

      // Utiliser le mapping ou convertir les tirets en underscores
      const mappedServiceId =
        URL_TO_SERVICE_MAPPING[serviceId] || serviceId.replace(/-/g, '_');

      // Récupérer la configuration locale (fallback)
      const localConfig = getServiceConfig(mappedServiceId) || {};

      // Toujours tenter de charger la configuration depuis l'API pour récupérer
      // les dernières modifications depuis Supabase
      try {
        const apiServiceId = mappedServiceId.replace(/_/g, '-');
        const timestamp = Date.now();
        let response = await fetch(`/api/services/${apiServiceId}?t=${timestamp}`);
        let data = await response.json();
        if (!(response.ok && data.success && data.service)) {
          response = await fetch(`/api/services/${mappedServiceId}?t=${timestamp}`);
          data = await response.json();
        }
        if (response.ok && data.success && data.service) {
          const serviceApiId = data.service.id || apiServiceId;
          const clientId = serviceApiId.replace(/-/g, '_');
          console.log('🔍 GenericDocumentProcessor - Service reçu:', {
            id: serviceApiId,
            title: data.service.title,
            coach_advice: data.service.coach_advice
          });
          const finalConfig = {
            id: clientId,
            apiId: serviceApiId,
            title: data.service.title || localConfig.title || '',
            coachAdvice: data.service.coach_advice || localConfig.coachAdvice || '',
            requiresCV: data.service.requires_cv ?? localConfig.requiresCV ?? false,
            requiresJobOffer: data.service.requires_job_offer ?? localConfig.requiresJobOffer ?? false,
            requiresQuestionnaire: data.service.requires_questionnaire ?? localConfig.requiresQuestionnaire ?? false,
            allowsNotes: data.service.allows_notes ?? localConfig.allowsNotes ?? false,
            apiEndpoint: `/api/services/execute/${serviceApiId}`,
            storageKey: `iamonjob_${clientId}`
          };
          console.log('🔍 GenericDocumentProcessor - Config finale:', finalConfig);
          setServiceConfig(finalConfig);
          return;
        }
        console.log('⚠️ Service non trouvé dans l\'API, utilisation de la config locale');
        if (Object.keys(localConfig).length > 0) {
          const fallbackConfig = {
            ...localConfig,
            id: mappedServiceId,
            apiId: apiServiceId,
            coachAdvice: localConfig.coachAdvice || '',
            apiEndpoint: `/api/services/execute/${apiServiceId}`,
            storageKey: `iamonjob_${mappedServiceId}`
          };
          console.log('🔍 GenericDocumentProcessor - Config fallback:', fallbackConfig);
          setServiceConfig(fallbackConfig);
        } else {
          setError(`Service "${serviceId}" non trouvé`);
        }
      } catch (err) {
        console.error('Erreur chargement service:', err);
        console.log('⚠️ Erreur API, utilisation de la config locale');
        if (Object.keys(localConfig).length > 0) {
          const fallbackConfig = {
            ...localConfig,
            id: mappedServiceId,
            apiId: mappedServiceId.replace(/_/g, '-'),
            coachAdvice: localConfig.coachAdvice || '',
            apiEndpoint: `/api/services/execute/${mappedServiceId.replace(/_/g, '-')}`,
            storageKey: `iamonjob_${mappedServiceId}`
          };
          console.log('🔍 GenericDocumentProcessor - Config fallback (erreur):', fallbackConfig);
          setServiceConfig(fallbackConfig);
        } else {
          setError(`Service "${serviceId}" non trouvé`);
        }
      }
    };

    loadConfig();
    setAutoExecuted(false);
  }, [serviceId, propServiceConfig]);

  // Charger un résultat déjà sauvegardé le cas échéant
  useEffect(() => {
    if (serviceConfig?.storageKey) {
      const stored = safeGetStorageItem(serviceConfig.storageKey);
      if (stored) {
        setResult(stored);
      }
    }
  }, [serviceConfig]);

  // 🗑️ REMETTRE À ZÉRO quand les documents changent
  useEffect(() => {
    if (serviceConfig?.storageKey) {
      // Nettoyer le localStorage et le résultat quand les documents changent
      safeSetStorageItem(serviceConfig.storageKey, '');
      setResult(null);
      setError(null);
      setAutoExecuted(false);
      console.log(`🗑️ Service ${serviceConfig.id} remis à zéro suite au changement de documents`);
    }
  }, [documentStatus.cv?.upload_timestamp, documentStatus.offre_emploi?.upload_timestamp, documentStatus.questionnaire?.upload_timestamp, serviceConfig]);

  // Vérifier les documents requis
  const checkRequiredDocuments = () => {
    const missing = [];
    if (serviceConfig?.requiresCV && !documentStatus.cv?.uploaded) {
      missing.push('CV');
    }
    if (serviceConfig?.requiresJobOffer && !documentStatus.offre_emploi?.uploaded) {
      missing.push('Offre d\'emploi');
    }
    if (serviceConfig?.requiresQuestionnaire && !documentStatus.questionnaire?.uploaded) {
      missing.push('Questionnaire personnel');
    }
    return missing;
  };

  const missingDocuments = checkRequiredDocuments();
  const canExecute = missingDocuments.length === 0;

  // 🚀 ANALYSE AUTOMATIQUE quand on arrive sur la page et que tout est prêt
  // MAIS PAS pour les services qui permettent des notes personnelles
  useEffect(() => {
    if (
      canExecute &&
      !result &&
      !serviceLoading &&
      serviceConfig?.id &&
      !serviceConfig.allowsNotes &&
      !autoExecuted
    ) {

      setAutoExecuted(true);
      handleExecute();
    }
  }, [canExecute, result, serviceLoading, serviceConfig, autoExecuted]);

  const handleExecute = async () => {
    if (!canExecute || serviceLoading) return;

    setServiceLoading(true);
    setError(null);

    try {
      const response = await fetch(serviceConfig.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        },
        body: JSON.stringify({
          service_id: serviceConfig.apiId || serviceConfig.id,
          notes: userNotes || ''
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        const resultContent = data.result || data.response || data.matching || data.analysis || data.content || '';
        setResult(resultContent);
        
        // Sauvegarder le résultat
        if (serviceConfig.storageKey) {
          safeSetStorageItem(serviceConfig.storageKey, resultContent);
        }
        
        toast.success('Analyse terminée avec succès !');
      } else {
        throw new Error(data.error || 'Erreur lors de l\'analyse');
      }
    } catch (err) {
      console.error('❌ Erreur service:', err);
      setError(err.message);
      toast.error('Erreur lors de l\'analyse');
    } finally {
      setServiceLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (result) {
      navigator.clipboard.writeText(result);
      toast.success('Copié dans le presse-papier !');
    }
  };

  const downloadAsText = () => {
    if (result) {
      const blob = new Blob([result], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${serviceConfig.id}_resultat.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Téléchargement terminé !');
    }
  };

  // Afficher un message d'erreur si le service n'est pas trouvé
  if (error) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h2>🚧 Service non trouvé</h2>
        <p>{error}</p>
        <p>
          <Link to="/" style={{ color: '#0a6b79' }}>← Retour à l'accueil</Link>
        </p>
      </div>
    );
  }

  // Afficher un loading si la configuration n'est pas encore chargée
  if (!serviceConfig) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h2>🔄 Chargement du service...</h2>
        <p>Veuillez patienter...</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ 
        background: '#0a6b79', 
        minHeight: '100vh', 
        padding: '2rem', 
        textAlign: 'center',
        color: 'white'
      }}>
        <div>Chargement...</div>
      </div>
    );
  }

  return (
    <div style={{ 
      background: '#0a6b79', 
      minHeight: '100vh', 
      padding: '2rem'
    }}>
      {/* Navigation en haut à gauche */}
      <div style={{ 
        marginBottom: '1rem' 
      }}>
        <Link to="/dashboard" style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '0.5rem', 
          color: 'white', 
          textDecoration: 'none',
          fontSize: '0.9rem',
          opacity: 0.9
        }}>
          <FiArrowLeft />
          Retour au tableau de bord
        </Link>
      </div>

      {/* Header avec titre au milieu et documents requis à droite */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '2rem' 
      }}>
        {/* Titre du service au milieu */}
        <div style={{ 
          background: '#0a6b79',
          color: 'white',
          padding: '1.5rem 2rem',
          borderRadius: '16px',
          textAlign: 'center',
          boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
          flex: '1',
          marginRight: '2rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <h1 style={{ 
            margin: '0 0 0.5rem 0', 
            fontSize: '2rem', 
            fontWeight: '700',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.75rem'
          }}>
            <LogoIcon size={32} />
            {serviceConfig.title}
          </h1>
          <p style={{ 
            margin: 0, 
            fontSize: '1.1rem', 
            color: 'white',
            opacity: 0.9
          }}>
            {serviceConfig.description}
          </p>
        </div>

        {/* Documents requis en haut à droite */}
        <div style={{ 
          background: 'white',
          padding: '1rem',
          borderRadius: '12px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
          borderLeft: '3px solid #c7356c',
          minWidth: '200px'
        }}>
          <h4 style={{ 
            margin: '0 0 0.75rem 0', 
            color: '#c7356c', 
            fontSize: '0.9rem', 
            fontWeight: '600',
            textAlign: 'center'
          }}>
            Documents requis
          </h4>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem'
          }}>
            {serviceConfig.requiresCV && (
              <StatusTile title="CV" icon={<FiFileText />} uploaded={documentStatus.cv?.uploaded} />
            )}
            {serviceConfig.requiresJobOffer && (
              <StatusTile title="Offre d'emploi" icon={<FiBriefcase />} uploaded={documentStatus.offre_emploi?.uploaded} />
            )}
            {serviceConfig.requiresQuestionnaire && (
              <StatusTile title="Questionnaire" icon={<FiUser />} uploaded={documentStatus.questionnaire?.uploaded} />
            )}
          </div>
        </div>
      </div>

      {/* Grille des sections avec style Home */}
      <div style={{ 
        display: 'grid',
        gap: '2rem',
        gridTemplateColumns: '1fr'
      }}>
        {/* Section 1: Conseils du coach */}
        <div style={{ 
          background: 'white',
          padding: '2rem',
          borderRadius: '16px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
          borderLeft: '4px solid #10b981'
        }}>
          <h3 style={{ 
            margin: '0 0 1rem 0', 
            fontWeight: '600', 
            fontSize: '1.2rem', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.75rem',
            color: '#10b981'
          }}>
            <LogoIcon size={24} /> Conseils du coach
          </h3>
          <p style={{ 
            margin: 0, 
            fontSize: '1rem', 
            lineHeight: '1.6',
            color: '#374151'
          }}>
            {serviceConfig.coachAdvice}
          </p>
        </div>

        {/* Section 2: Message d'offre pré-remplie (si applicable) */}
        {serviceConfig.id === 'matching_cv_offre' && documentStatus.offre_emploi?.uploaded && (
          <div style={{ 
            background: 'white',
            padding: '2rem',
            borderRadius: '16px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
            borderLeft: '4px solid #ec4899'
          }}>
            <h3 style={{ 
              margin: '0 0 1rem 0', 
              fontWeight: '600', 
              fontSize: '1.2rem', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.75rem',
              color: '#ec4899'
            }}>
              <LogoIcon size={24} /> Offre d'emploi chargée automatiquement
            </h3>
            <p style={{ 
              margin: 0, 
              fontSize: '1rem',
              lineHeight: '1.6',
              color: '#374151'
            }}>
              Votre offre d'emploi a été pré-remplie et est prête pour l'analyse de compatibilité avec votre CV.
            </p>
          </div>
        )}

        {/* Section 3: Zone d'exécution ou message d'erreur */}
        {!canExecute ? (
          <div style={{ 
            background: 'white',
            textAlign: 'center', 
            padding: '1.5rem',
            borderRadius: '16px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
            borderLeft: '4px solid #ef4444'
          }}>
            <p style={{ 
              color: '#dc2626', 
              fontSize: '1rem', 
              margin: 0,
              lineHeight: '1.6'
            }}>
              Cliquez sur les documents manquants ci-dessus pour les gérer
            </p>
          </div>
        ) : !result ? (
          <div style={{ 
            background: 'white',
            padding: '2rem',
            borderRadius: '16px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
            borderLeft: '4px solid #10b981'
          }}>
            {/* Zone de notes personnelles - RÉDUITE */}
            {serviceConfig.allowsNotes && (
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ 
                  background: '#f0fdf4', 
                  border: '1px solid #bbf7d0', 
                  borderRadius: '12px', 
                  padding: '1rem', 
                  marginBottom: '1rem' 
                }}>
                  <h4 style={{ 
                    margin: '0 0 0.5rem 0', 
                    color: '#10b981', 
                    fontSize: '1rem', 
                    fontWeight: '600',
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.5rem' 
                  }}>
                    <LogoIcon size={18} /> Voulez-vous ajouter un complément d'information ?
                  </h4>
                  <p style={{ 
                    margin: '0 0 0.75rem 0', 
                    color: '#166534', 
                    fontSize: '0.9rem', 
                    lineHeight: '1.4' 
                  }}>
                    Ajoutez des détails personnels, exemples concrets ou contraintes pour personnaliser encore mieux l'analyse.
                  </p>
                  <textarea
                    value={userNotes}
                    onChange={(e) => setUserNotes(e.target.value)}
                    placeholder="Exemples : vos réalisations chiffrées, contraintes géographiques, motivations spécifiques, expériences pertinentes..."
                    style={{ 
                      width: '100%', 
                      minHeight: '80px', 
                      padding: '0.75rem', 
                      border: '1px solid #d1d5db', 
                      borderRadius: '8px', 
                      fontSize: '0.9rem', 
                      resize: 'vertical',
                      fontFamily: 'inherit',
                      lineHeight: '1.4'
                    }}
                  />
                </div>
              </div>
            )}
            
            {/* Bouton d'exécution - ROSE DU LOGO */}
            <div style={{ textAlign: 'center' }}>
              <button
                onClick={handleExecute}
                disabled={serviceLoading || !canExecute}
                style={{ 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  gap: '0.75rem', 
                  padding: '1.25rem 2.5rem', 
                  fontSize: '1.1rem', 
                  fontWeight: '600', 
                  borderRadius: '12px', 
                  background: canExecute ? '#c7356c' : '#9ca3af', 
                  color: 'white',
                  cursor: canExecute ? 'pointer' : 'not-allowed',
                  border: 'none',
                  boxShadow: canExecute ? '0 4px 16px rgba(199,53,108,0.3)' : 'none',
                  transition: 'all 0.2s ease'
                }}
              >
                {serviceLoading ? (
                  <>
                    <div style={{ 
                      width: '20px', 
                      height: '20px', 
                      border: '2px solid #ffffff', 
                      borderTop: '2px solid transparent', 
                      borderRadius: '50%', 
                      animation: 'spin 1s linear infinite' 
                    }} />
                    Traitement en cours...
                  </>
                ) : (
                  <>{serviceConfig.allowsNotes ? 'Lancer l\'analyse personnalisée' : 'Lancer l\'analyse'}</>
                )}
              </button>
              
              {error && (
                <div style={{ 
                  marginTop: '1.5rem', 
                  padding: '1rem', 
                  background: '#fef2f2', 
                  border: '1px solid #fecaca', 
                  borderRadius: '8px', 
                  color: '#dc2626',
                  fontSize: '0.95rem'
                }}>
                  {error}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Section 4: Affichage des résultats */
          <div style={{ 
            background: 'white',
            padding: '2rem',
            borderRadius: '16px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
            borderLeft: '4px solid #10b981'
          }}>
            {/* Actions sur le résultat */}
            <div style={{ 
              display: 'flex', 
              gap: '1rem', 
              marginBottom: '2rem', 
              paddingBottom: '1.5rem', 
              borderBottom: '1px solid #e5e7eb',
              flexWrap: 'wrap'
            }}>
              <button
                onClick={copyToClipboard}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.5rem', 
                  padding: '0.75rem 1.5rem', 
                  fontSize: '1rem', 
                  fontWeight: '500', 
                  borderRadius: '8px', 
                  background: '#f3f4f6', 
                  color: '#0a6b79', 
                  border: '1px solid #d1d5db', 
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                <FiCopy />
                Copier
              </button>
              <button
                onClick={downloadAsText}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.5rem', 
                  padding: '0.75rem 1.5rem', 
                  fontSize: '1rem', 
                  fontWeight: '500', 
                  borderRadius: '8px', 
                  background: '#0a6b79', 
                  color: 'white', 
                  border: 'none', 
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                <FiDownload />
                Télécharger
              </button>
            </div>
            
            {/* Contenu du résultat */}
            {serviceConfig?.id === 'matching_cv_offre' ? (
              <MatchingAnalysis preloadedData={result} hideButton={true} />
            ) : (
              <SimpleMarkdownRenderer content={result} serviceType={serviceConfig.id} />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default GenericDocumentProcessor;
