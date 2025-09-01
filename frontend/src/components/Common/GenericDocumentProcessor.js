// FICHIER : frontend/src/components/Common/GenericDocumentProcessor.js
// VERSION AVEC STYLE COHÉRENT DE LA HOME

import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Link } from 'react-router-dom';
import { FiArrowLeft, FiDownload, FiCopy, FiUser, FiFileText, FiBriefcase } from 'react-icons/fi';
import { LogoIcon } from '../icons/ModernIcons';
import toast from 'react-hot-toast';
import MatchingAnalysis from '../Analysis/MatchingAnalysis';
import SimpleMarkdownRenderer from './SimpleMarkdownRenderer';

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

const GenericDocumentProcessor = ({ serviceConfig }) => {
  const { documentStatus, loading } = useApp();
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [userNotes, setUserNotes] = useState('');
  const [serviceLoading, setServiceLoading] = useState(false);

  // Charger un résultat déjà sauvegardé le cas échéant
  useEffect(() => {
    if (serviceConfig?.storageKey) {
      const stored = safeGetStorageItem(serviceConfig.storageKey);
      if (stored) {
        setResult(stored);
      }
    }
  }, [serviceConfig]);

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
    if (canExecute && !result && !serviceLoading && serviceConfig?.id) {
      // Si le service permet des notes, ne pas lancer automatiquement
      if (!serviceConfig.allowsNotes) {
        console.log('🚀 Lancement automatique du service:', serviceConfig.id);
        handleExecute();
      }
    }
  }, [canExecute, result, serviceLoading, serviceConfig]);

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
          service_id: serviceConfig.id,
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
      {/* Header avec navigation */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '1rem', 
        marginBottom: '2rem' 
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

      {/* Titre du service */}
      <div style={{ 
        background: 'white',
        padding: '2rem',
        borderRadius: '16px',
        textAlign: 'center',
        marginBottom: '2rem',
        boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
      }}>
        <h1 style={{ 
          margin: '0 0 0.5rem 0', 
          fontSize: '2rem', 
          fontWeight: '700',
          color: '#0a6b79'
        }}>
          {serviceConfig.title}
        </h1>
        <p style={{ 
          margin: 0, 
          fontSize: '1.1rem', 
          color: '#6b7280'
        }}>
          {serviceConfig.description}
        </p>
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
            {serviceConfig.coachAdvice || serviceConfig.description}
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

        {/* Section 3: Statut des documents - COMPACTE */}
        <div style={{ 
          background: 'white',
          padding: '1.5rem',
          borderRadius: '16px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
          borderLeft: '4px solid #f59e0b'
        }}>
          <h3 style={{ 
            margin: '0 0 1rem 0', 
            color: '#f59e0b', 
            fontSize: '1.1rem', 
            fontWeight: '600', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.75rem' 
          }}>
            <LogoIcon size={20} /> Documents requis
          </h3>
          <div style={{
            display: 'flex',
            gap: '0.75rem',
            flexWrap: 'wrap'
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

        {/* Section 4: Zone d'exécution ou message d'erreur */}
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
            {/* Zone de notes personnelles */}
            {serviceConfig.allowsNotes && (
              <div style={{ marginBottom: '2rem' }}>
                <div style={{ 
                  background: '#f0fdf4', 
                  border: '1px solid #bbf7d0', 
                  borderRadius: '12px', 
                  padding: '1.5rem', 
                  marginBottom: '1.5rem' 
                }}>
                  <h4 style={{ 
                    margin: '0 0 0.75rem 0', 
                    color: '#10b981', 
                    fontSize: '1.1rem', 
                    fontWeight: '600',
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.5rem' 
                  }}>
                    <LogoIcon size={20} /> Voulez-vous ajouter un complément d'information ?
                  </h4>
                  <p style={{ 
                    margin: '0 0 1rem 0', 
                    color: '#166534', 
                    fontSize: '1rem', 
                    lineHeight: '1.5' 
                  }}>
                    Ajoutez des détails personnels, exemples concrets ou contraintes pour personnaliser l'analyse de l'IA.
                  </p>
                  <textarea
                    value={userNotes}
                    onChange={(e) => setUserNotes(e.target.value)}
                    placeholder="Exemples : vos réalisations chiffrées, contraintes géographiques, motivations spécifiques, expériences pertinentes..."
                    style={{ 
                      width: '100%', 
                      minHeight: '120px', 
                      padding: '1rem', 
                      border: '1px solid #d1d5db', 
                      borderRadius: '8px', 
                      fontSize: '1rem', 
                      resize: 'vertical',
                      fontFamily: 'inherit',
                      lineHeight: '1.5'
                    }}
                  />
                </div>
              </div>
            )}
            
            {/* Bouton d'exécution */}
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
                  background: canExecute ? (serviceConfig.allowsNotes ? '#10b981' : '#0a6b79') : '#9ca3af', 
                  color: 'white',
                  cursor: canExecute ? 'pointer' : 'not-allowed',
                  border: 'none',
                  boxShadow: canExecute ? '0 4px 16px rgba(16,185,129,0.3)' : 'none',
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
          /* Section 5: Affichage des résultats */
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
