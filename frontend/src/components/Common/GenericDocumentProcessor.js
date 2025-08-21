// FICHIER : frontend/src/components/Common/GenericDocumentProcessor.js
// REMPLACER LE CONTENU EXISTANT PAR CETTE VERSION CORRIGÉE

import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Link } from 'react-router-dom';
import { FiArrowLeft, FiDownload, FiCopy, FiUser, FiFileText, FiBriefcase } from 'react-icons/fi';
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

// Petit composant pour afficher le statut d'un document de la même
// manière que sur le dashboard
const StatusTile = ({ title, icon, uploaded }) => (
  <div className="document-tile" style={{ '--tile-color': uploaded ? '#16a34a' : '#dc2626' }}>
    <div className={`revolutionary-service-icon ${uploaded ? '' : 'disabled'}`} style={{ background: uploaded ? '#16a34a' : '#9ca3af' }}>
      {icon}
    </div>
    <div className="revolutionary-service-content">
      <h4 className={`revolutionary-service-title ${uploaded ? '' : 'disabled'}`}>{title}</h4>
      <p className={`revolutionary-service-description ${uploaded ? '' : 'disabled'}`}>{uploaded ? 'Document fourni' : 'Manquant'}</p>
    </div>
  </div>
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
  useEffect(() => {
    if (canExecute && !result && !serviceLoading && serviceConfig?.id) {
      console.log(`🚀 Déclenchement automatique du service: ${serviceConfig.id}`);
      handleExecute();
    }
  }, [canExecute, result, serviceLoading, serviceConfig?.id]);

  // Exécuter le service directement avec l'API endpoint du serviceConfig
  const handleExecute = async () => {
    if (!canExecute || !serviceConfig?.apiEndpoint) return;

    setServiceLoading(true);
    setError(null);
    
    try {
      console.log(`🚀 Exécution service: ${serviceConfig.id}`);
      console.log(`📡 API Endpoint: ${serviceConfig.apiEndpoint}`);
      console.log(`📝 Notes utilisateur: ${userNotes || 'Aucune'}`);

      const response = await fetch(serviceConfig.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${safeGetStorageItem('token') || ''}`
        },
        body: JSON.stringify({
          notes: userNotes || '',
          service_id: serviceConfig.id
        })
      });

      // Vérifier si la réponse est du JSON valide
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.error('❌ Réponse non-JSON reçue:', response.status);
        const textResponse = await response.text();
        console.error('Contenu de la réponse:', textResponse.substring(0, 200));
        throw new Error(`Serveur a renvoyé du ${contentType} au lieu de JSON`);
      }

      const data = await response.json();
      console.log('📥 Réponse API:', data);
      console.log('🔍 data.analysis existe:', !!data.analysis);
      console.log('🔍 data.compatibility existe:', !!data.compatibility);

      if (response.ok && data.success) {
        const resultContent = data.analysis || data.compatibility || data.result || data.content || data.response || data.message;
        
        console.log('✅ Contenu sélectionné:', resultContent ? 'OUI' : 'NON');
        console.log('✅ Longueur:', resultContent ? resultContent.length : 0);
        
        if (resultContent) {
          setResult(resultContent);
          if (serviceConfig?.storageKey) {
            safeSetStorageItem(serviceConfig.storageKey, resultContent);
          }
          toast.success('Service exécuté avec succès !');
        } else {
          throw new Error('Réponse du serveur invalide - contenu manquant');
        }
      } else {
        throw new Error(data.error || `Erreur HTTP: ${response.status}`);
      }
    } catch (err) {
      console.error('❌ Erreur service:', err);
      setError(`Erreur: ${err.message}`);
      toast.error(`Erreur: ${err.message}`);
    } finally {
      setServiceLoading(false);
    }
  };

  // Copier le résultat
  const copyToClipboard = () => {
    if (result) {
      navigator.clipboard.writeText(result).then(() => {
        toast.success('Résultat copié dans le presse-papiers !');
      }).catch(() => {
        toast.error('Erreur lors de la copie');
      });
    }
  };

  // Télécharger le résultat
  const downloadAsText = () => {
    if (result) {
      const blob = new Blob([result], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${serviceConfig.id}_${new Date().toISOString().split('T')[0]}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success('Fichier téléchargé !');
    }
  };

  if (!serviceConfig) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h2 style={{ color: '#dc2626' }}>❌ Configuration de service manquante</h2>
        <p>Le service demandé n'est pas configuré correctement.</p>
        <Link to="/dashboard" style={{ color: '#0a6b79', textDecoration: 'underline' }}>
          Retour au tableau de bord
        </Link>
      </div>
    );
  }

  return (
    <div className="revolutionary-dashboard" style={{ background: 'var(--primary-color)', minHeight: '100vh' }}>
      <div className="revolutionary-tab-content" style={{ padding: '2rem 1rem' }}>
        {/* Header avec navigation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
          <Link
            to="/dashboard"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              color: '#6b7280',
              textDecoration: 'none',
              fontSize: '0.9rem'
            }}
          >
            <FiArrowLeft />
            Retour
          </Link>
        </div>
        <h2 className="revolutionary-section-title" style={{ marginBottom: '0.5rem' }}>
          {serviceConfig.icon} {serviceConfig.title}
        </h2>
        <p className="revolutionary-section-description" style={{ marginBottom: '2rem' }}>
          {serviceConfig.description}
        </p>

        {/* Conseils du coach */}
        <div className="revolutionary-service-card" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', marginBottom: '2rem', boxShadow: '0 4px 24px rgba(16,185,129,0.08)' }}>
          <h3 style={{ margin: 0, fontWeight: 600, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            💡 Conseils du coach
          </h3>
          <p style={{ margin: 0 }}>{serviceConfig.coachAdvice || serviceConfig.description}</p>
        </div>

        {/* Statut des documents */}
        <div className="revolutionary-service-card" style={{ marginBottom: '2rem' }}>
          <h3 style={{ margin: '0 0 1rem 0', color: '#374151', fontSize: '1.1rem', fontWeight: '600' }}>
            📋 Documents requis
          </h3>
          <div className="revolutionary-document-types">
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

        {/* Zone d'exécution */}
        {!canExecute ? (
          <div className="revolutionary-service-card" style={{ background: '#fef3c7', border: '1px solid #fbbf24', color: '#92400e', textAlign: 'center', marginBottom: '2rem' }}>
            <h3 style={{ color: '#92400e', marginBottom: '1rem' }}>
              📋 Documents manquants
            </h3>
            <p style={{ color: '#92400e', marginBottom: '1rem' }}>
              Pour utiliser ce service, vous devez d'abord uploader : <strong>{missingDocuments.join(', ')}</strong>
            </p>
            <Link
              to="/dashboard"
              style={{ display: 'inline-block', padding: '0.75rem 1.5rem', background: '#f59e0b', color: 'white', textDecoration: 'none', borderRadius: '8px', fontWeight: '600' }}
            >
              📄 Gérer mes documents
            </Link>
          </div>
        ) : !result ? (
          <div className="revolutionary-service-card" style={{ padding: '2rem', marginBottom: '2rem' }}>
            {/* Zone de notes personnelles */}
            {serviceConfig.allowsNotes && (
              <div style={{ marginBottom: '2rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#374151' }}>
                  📝 Notes personnelles (optionnel)
                </label>
                <textarea
                  value={userNotes}
                  onChange={(e) => setUserNotes(e.target.value)}
                  placeholder="Ajoutez des informations supplémentaires..."
                  style={{ width: '100%', minHeight: '100px', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.9rem', resize: 'vertical' }}
                />
              </div>
            )}
            {/* Bouton d'exécution */}
            <div style={{ textAlign: 'center' }}>
              <button
                onClick={handleExecute}
                disabled={serviceLoading || !canExecute}
                className="revolutionary-btn-upload"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '1rem 2rem', fontSize: '1rem', fontWeight: '500', borderRadius: '8px', background: canExecute ? undefined : '#9ca3af', cursor: canExecute ? 'pointer' : 'not-allowed' }}
              >
                {serviceLoading ? (
                  <>
                    <div style={{ width: '20px', height: '20px', border: '2px solid #ffffff', borderTop: '2px solid transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                    Traitement en cours...
                  </>
                ) : (
                  <>🚀 Lancer l'analyse</>
                )}
              </button>
              {error && (
                <div style={{ marginTop: '1rem', padding: '1rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#dc2626' }}>
                  ❌ {error}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Affichage des résultats */
          (serviceConfig?.id === 'matching_cv_offre' ? (
            <div className="revolutionary-service-card" style={{ padding: '2rem', marginBottom: '2rem' }}>
              {/* Actions sur le résultat */}
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid #e5e7eb' }}>
                <button
                  onClick={copyToClipboard}
                  className="revolutionary-btn-upload"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', fontSize: '0.9rem', fontWeight: '500', borderRadius: '8px', background: '#f3f4f6', color: '#0a6b79', border: '1px solid #d1d5db', cursor: 'pointer' }}
                >
                  <FiCopy />
                  Copier
                </button>
                <button
                  onClick={downloadAsText}
                  className="revolutionary-btn-upload"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', fontSize: '0.9rem', fontWeight: '500', borderRadius: '8px', background: '#0a6b79', color: 'white', border: 'none', cursor: 'pointer' }}
                >
                  <FiDownload />
                  Télécharger
                </button>
              </div>
              <MatchingAnalysis preloadedData={result} hideButton={true} />
            </div>
          ) : (
            <div className="revolutionary-service-card" style={{ padding: '2rem', marginBottom: '2rem' }}>
              {/* Actions sur le résultat */}
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid #e5e7eb' }}>
                <button
                  onClick={copyToClipboard}
                  className="revolutionary-btn-upload"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', fontSize: '0.9rem', fontWeight: '500', borderRadius: '8px', background: '#f3f4f6', color: '#0a6b79', border: '1px solid #d1d5db', cursor: 'pointer' }}
                >
                  <FiCopy />
                  Copier
                </button>
                <button
                  onClick={downloadAsText}
                  className="revolutionary-btn-upload"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', fontSize: '0.9rem', fontWeight: '500', borderRadius: '8px', background: '#0a6b79', color: 'white', border: 'none', cursor: 'pointer' }}
                >
                  <FiDownload />
                  Télécharger
                </button>
              </div>
              <SimpleMarkdownRenderer content={result} serviceType={serviceConfig.id} />
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default GenericDocumentProcessor;
