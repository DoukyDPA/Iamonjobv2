// FICHIER : frontend/src/components/CoverLetter/CoverLetterGenerator.js
// REMPLACER LE CONTENU EXISTANT PAR CETTE VERSION COMPLÈTE

import React, { useState, useEffect } from 'react';
import { 
  FiMail, 
  FiFileText, 
  FiZap, 
  FiDownload, 
  FiCopy,
  FiEdit3,
  FiCheckCircle,
  FiAlertCircle,
  FiLoader
} from 'react-icons/fi';
import { useApp } from '../../context/AppContext';
import { coverLetterApi } from '../../services/coverLetterApi';
import toast from 'react-hot-toast';

const CoverLetterGenerator = () => {
  const { documentStatus } = useApp();
  const [activeStep, setActiveStep] = useState('advice'); // 'advice' ou 'generate'
  const [loading, setLoading] = useState(false);
  const [advice, setAdvice] = useState(null);
  const [generatedLetter, setGeneratedLetter] = useState(null);
  const [personalNotes, setPersonalNotes] = useState('');
  const [error, setError] = useState(null);
  const [status, setStatus] = useState({
    can_generate_advice: false,
    can_generate_letter: false,
    documents: {
      cv: false,
      job_offer: false,
      questionnaire: false
    }
  });

  // Charger le statut au montage du composant
  useEffect(() => {
    loadStatus();
  }, [documentStatus]);

  // Fonction pour charger le statut depuis l'API
  const loadStatus = async () => {
    try {
      const response = await coverLetterApi.getStatus();
      if (response.success) {
        setStatus(response.status);
      } else {
        // Fallback basé sur documentStatus local
        setStatus({
          can_generate_advice: documentStatus.cv?.uploaded || documentStatus.offre_emploi?.uploaded,
          can_generate_letter: documentStatus.cv?.uploaded && documentStatus.offre_emploi?.uploaded,
          documents: {
            cv: documentStatus.cv?.uploaded || false,
            job_offer: documentStatus.offre_emploi?.uploaded || false,
            questionnaire: documentStatus.questionnaire?.uploaded || false
          }
        });
      }
    } catch (error) {
      console.error('Erreur chargement statut:', error);
      // Fallback basé sur documentStatus local
      setStatus({
        can_generate_advice: documentStatus.cv?.uploaded || documentStatus.offre_emploi?.uploaded,
        can_generate_letter: documentStatus.cv?.uploaded && documentStatus.offre_emploi?.uploaded,
        documents: {
          cv: documentStatus.cv?.uploaded || false,
          job_offer: documentStatus.offre_emploi?.uploaded || false,
          questionnaire: documentStatus.questionnaire?.uploaded || false
        }
      });
    }
  };

  const saveToLocalStorage = (key, data) => {
    try {
      localStorage.setItem(key, JSON.stringify({
        content: data,
        timestamp: new Date().toISOString()
      }));
    } catch (e) {
      console.warn('localStorage non disponible');
    }
  };

  const getFromLocalStorage = (key) => {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  };

  useEffect(() => {
    restoreData();
  }, []);

  // Nettoyer les données locales quand un nouveau document est chargé
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'iamonjob_clear_cache' && e.newValue === 'true') {
        console.log('🗑️ Nettoyage données locales CoverLetter');
        setAdvice('');
        setGeneratedLetter(null);
        setPersonalNotes('');
        localStorage.removeItem('iamonjob_clear_cache');
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const restoreData = () => {
    // Restaurer uniquement depuis localStorage pour éviter la persistance d'anciennes lettres
    if (!advice) {
      const stored = getFromLocalStorage('iamonjob_advice');
      if (stored) {
        setAdvice(stored.content);
        console.log('✅ Conseils restaurés depuis localStorage');
      }
    }
    if (!generatedLetter) {
      const stored = getFromLocalStorage('iamonjob_letter');
      if (stored) {
        setGeneratedLetter({ content: stored.content, metadata: {} });
        console.log('✅ Lettre restaurée depuis localStorage');
      }
    }
    if (!personalNotes) {
      const stored = getFromLocalStorage('iamonjob_notes');
      if (stored) {
        setPersonalNotes(stored.content);
        console.log('✅ Notes restaurées depuis localStorage');
      }
    }
  };

  // Fonction pour obtenir des conseils
  const getAdvice = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await coverLetterApi.getCoverLetterAdvice();
      
      if (response.success) {
        setAdvice(response.advice);
        toast.success('Conseils générés avec succès !');
        saveToLocalStorage('iamonjob_advice', response.advice);
      } else {
        throw new Error(response.error || 'Erreur lors de la génération des conseils');
      }
    } catch (err) {
      const errorMessage = err.message || 'Erreur lors de la génération des conseils';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Fonction pour générer la lettre complète
  const generateLetter = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await coverLetterApi.generateCoverLetter(personalNotes);
      
      if (response.success) {
        setGeneratedLetter({
          content: response.letter,
          metadata: response.metadata
        });
        toast.success('Lettre de motivation générée avec succès !');
        saveToLocalStorage('iamonjob_letter', response.letter);
      } else {
        throw new Error(response.error || 'Erreur lors de la génération de la lettre');
      }
    } catch (err) {
      const errorMessage = err.message || 'Erreur lors de la génération de la lettre';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Fonction pour copier dans le presse-papier
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success('Copié dans le presse-papier !');
    }).catch(() => {
      toast.error('Erreur lors de la copie');
    });
  };

  const escapeHtml = (text) =>
    text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

  const buildHtmlDocument = (title, content) => `<!DOCTYPE html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <title>${escapeHtml(title)}</title>
    <style>
      body {
        font-family: 'Georgia', 'Times New Roman', serif;
        background: #f9fafb;
        color: #1f2937;
        margin: 0;
        padding: 2.5rem;
        line-height: 1.8;
      }
      .container {
        background: #ffffff;
        border-radius: 12px;
        padding: 2rem;
        box-shadow: 0 18px 40px rgba(15, 23, 42, 0.12);
        border: 1px solid #e5e7eb;
      }
      h1 {
        margin-top: 0;
        color: #0a6b79;
        font-size: 2rem;
      }
      .timestamp {
        font-size: 0.95rem;
        color: #6b7280;
        margin-bottom: 1.5rem;
      }
      .content {
        font-size: 1.05rem;
        white-space: normal;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <h1>${escapeHtml(title)}</h1>
      <div class="timestamp">Lettre générée le ${new Date().toLocaleString('fr-FR')}</div>
      <div class="content">${content}</div>
    </div>
  </body>
</html>`;

  const downloadAsHtml = (content, filename, title = 'Lettre de motivation') => {
    const formattedContent = escapeHtml(content).replace(/\n/g, '<br />');
    const html = buildHtmlDocument(title, formattedContent);
    const element = document.createElement('a');
    const file = new Blob([html], { type: 'text/html' });
    element.href = URL.createObjectURL(file);
    element.download = filename.replace(/\.txt$/, '.html');
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    toast.success('Lettre exportée en HTML !');
  };

  // Formatage du texte markdown simple
  const formatText = (text) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/### (.*?)$/gm, '<h3 style="color: #374151; margin: 1rem 0 0.5rem 0;">$1</h3>')
      .replace(/## (.*?)$/gm, '<h2 style="color: #374151; margin: 1rem 0 0.5rem 0;">$1</h2>')
      .replace(/\n/g, '<br/>');
  };

  useEffect(() => {
    if (personalNotes.trim()) {
      saveToLocalStorage('iamonjob_notes', personalNotes);
    }
  }, [personalNotes]);

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>
      
      {/* En-tête */}
      <div style={{ 
        textAlign: 'center', 
        marginBottom: '2rem',
        padding: '1.5rem',
        background: 'linear-gradient(135deg, #0a6b79, #22c55e)',
        borderRadius: '12px',
        color: 'white'
      }}>
        <FiMail size={48} style={{ marginBottom: '1rem' }} />
        <h1 style={{ margin: '0 0 0.5rem 0', fontSize: '1.75rem' }}>
          Lettre de Motivation IA
        </h1>
        <p style={{ margin: 0, opacity: 0.9 }}>
          Créez une lettre de motivation professionnelle et personnalisée
        </p>
      </div>

      {/* Statut des documents */}
      <div style={{
        background: '#f8f9fa',
        borderRadius: '8px',
        padding: '1rem',
        marginBottom: '2rem'
      }}>
        <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', color: '#374151' }}>
          📄 Documents disponibles
        </h3>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          {[
            { key: 'cv', label: 'CV', icon: <FiFileText />, required: true },
            { key: 'job_offer', label: 'Offre d\'emploi', icon: <FiFileText />, required: true },
            { key: 'questionnaire', label: 'Questionnaire', icon: <FiEdit3 />, required: false }
          ].map(doc => {
            const isAvailable = status.documents[doc.key];
            return (
              <div key={doc.key} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                background: isAvailable ? '#dcfce7' : '#fef2f2',
                color: isAvailable ? '#166534' : '#dc2626',
                fontSize: '0.9rem'
              }}>
                {isAvailable ? <FiCheckCircle /> : <FiAlertCircle />}
                {doc.icon}
                {doc.label}
                {doc.required && !isAvailable && <span style={{ fontSize: '0.8rem' }}>(requis)</span>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Navigation par étapes */}
      <div style={{ 
        display: 'flex', 
        gap: '1rem', 
        marginBottom: '2rem',
        borderBottom: '2px solid #e5e7eb'
      }}>
        <button
          onClick={() => setActiveStep('advice')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '1rem 1.5rem',
            background: 'none',
            border: 'none',
            borderBottom: activeStep === 'advice' ? '3px solid #0a6b79' : '3px solid transparent',
            color: activeStep === 'advice' ? '#0a6b79' : '#6b7280',
            fontWeight: '500',
            cursor: 'pointer',
            marginBottom: '-2px'
          }}
        >
          <FiZap />
          1. Conseils de rédaction
        </button>
        
        <button
          onClick={() => setActiveStep('generate')}
          disabled={!status.can_generate_letter}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '1rem 1.5rem',
            background: 'none',
            border: 'none',
            borderBottom: activeStep === 'generate' ? '3px solid #0a6b79' : '3px solid transparent',
            color: activeStep === 'generate' ? '#0a6b79' : '#6b7280',
            fontWeight: '500',
            cursor: status.can_generate_letter ? 'pointer' : 'not-allowed',
            opacity: status.can_generate_letter ? 1 : 0.5,
            marginBottom: '-2px'
          }}
        >
          <FiMail />
          2. Génération complète
        </button>
      </div>

      {/* Contenu selon l'étape active */}
      {activeStep === 'advice' && (
        <div>
          <div style={{ marginBottom: '2rem' }}>
            <h2 style={{ marginBottom: '1rem' }}>📝 Conseils de rédaction personnalisés</h2>
            <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
              Obtenez des conseils adaptés à votre profil et à l'offre d'emploi visée.
            </p>
            
            <button
              onClick={getAdvice}
              disabled={loading || !status.can_generate_advice}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '1rem 2rem',
                background: status.can_generate_advice ? '#0a6b79' : '#9ca3af',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: status.can_generate_advice ? 'pointer' : 'not-allowed',
                fontSize: '1rem',
                fontWeight: '500'
              }}
            >
              {loading ? <FiLoader style={{animation: 'spin 1s linear infinite'}} /> : <FiZap />}
              {loading ? 'Génération...' : 'Obtenir des conseils'}
            </button>

            {!status.can_generate_advice && (
              <p style={{ color: '#dc2626', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                Veuillez uploader au moins votre CV ou une offre d'emploi
              </p>
            )}
          </div>

          {/* Affichage des conseils */}
          {advice && (
            <div style={{
              background: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '1.5rem'
            }}>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: '1rem'
              }}>
                <h3 style={{ margin: 0, color: '#374151' }}>💡 Vos conseils personnalisés</h3>
                <button
                  onClick={() => copyToClipboard(advice)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.5rem 1rem',
                    background: '#f3f4f6',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '0.9rem'
                  }}
                >
                  <FiCopy />
                  Copier
                </button>
              </div>
              
              <div 
                style={{ lineHeight: '1.6', color: '#4b5563' }}
                dangerouslySetInnerHTML={{ __html: formatText(advice) }}
              />
            </div>
          )}
        </div>
      )}

      {activeStep === 'generate' && (
        <div>
          <div style={{ marginBottom: '2rem' }}>
            <h2 style={{ marginBottom: '1rem' }}>✉️ Génération de lettre complète</h2>
            <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
              Générez une lettre de motivation professionnelle basée sur vos documents.
            </p>

            {/* Notes personnelles */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                📝 Notes personnelles (optionnel)
              </label>
              <textarea
                value={personalNotes}
                onChange={(e) => setPersonalNotes(e.target.value)}
                placeholder="Ajoutez des informations spécifiques que vous souhaitez inclure dans votre lettre..."
                style={{
                  width: '100%',
                  minHeight: '100px',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '0.9rem',
                  resize: 'vertical'
                }}
              />
            </div>
            
            <button
              onClick={generateLetter}
              disabled={loading || !status.can_generate_letter}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '1rem 2rem',
                background: status.can_generate_letter ? '#22c55e' : '#9ca3af',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: status.can_generate_letter ? 'pointer' : 'not-allowed',
                fontSize: '1rem',
                fontWeight: '500'
              }}
            >
              {loading ? <FiLoader style={{animation: 'spin 1s linear infinite'}} /> : <FiMail />}
              {loading ? 'Génération...' : 'Générer ma lettre'}
            </button>

            {!status.can_generate_letter && (
              <p style={{ color: '#dc2626', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                CV et offre d'emploi requis pour générer une lettre complète
              </p>
            )}
          </div>

          {/* Affichage de la lettre générée */}
          {generatedLetter && (
            <div style={{
              background: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '1.5rem'
            }}>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: '1rem'
              }}>
                <h3 style={{ margin: 0, color: '#374151' }}>📄 Votre lettre de motivation</h3>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={() => copyToClipboard(generatedLetter.content)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.5rem 1rem',
                      background: '#f3f4f6',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '0.9rem'
                    }}
                  >
                    <FiCopy />
                    Copier
                  </button>
                  <button
                    onClick={() => downloadAsHtml(generatedLetter.content, 'lettre_motivation.html')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.5rem 1rem',
                      background: '#0a6b79',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '0.9rem'
                    }}
                  >
                    <FiDownload />
                    Télécharger en HTML
                  </button>
                </div>
              </div>

              {/* Métadonnées */}
              {generatedLetter.metadata && (
                <div style={{
                  background: '#f0f9fa',
                  padding: '0.75rem',
                  borderRadius: '6px',
                  marginBottom: '1rem',
                  fontSize: '0.9rem'
                }}>
                  <strong>📊 Documents utilisés :</strong>
                  {generatedLetter.metadata.used_cv && ' CV ✓'}
                  {generatedLetter.metadata.used_job_offer && ' Offre d\'emploi ✓'}
                  {generatedLetter.metadata.used_questionnaire && ' Questionnaire ✓'}
                  {generatedLetter.metadata.used_notes && ' Notes personnelles ✓'}
                </div>
              )}
              
              <div 
                style={{ 
                  lineHeight: '1.8', 
                  color: '#374151',
                  fontFamily: 'Georgia, serif',
                  whiteSpace: 'pre-wrap',
                  background: '#fafafa',
                  padding: '1.5rem',
                  borderRadius: '6px',
                  border: '1px solid #e5e7eb'
                }}
              >
                {generatedLetter.content}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Affichage des erreurs */}
      {error && (
        <div style={{
          marginTop: '1rem',
          padding: '1rem',
          background: '#fef2f2',
          borderRadius: '8px',
          border: '1px solid #fca5a5',
          color: '#dc2626'
        }}>
          ⚠️ {error}
        </div>
      )}

      {/* CSS pour animation spin */}
      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default CoverLetterGenerator;
