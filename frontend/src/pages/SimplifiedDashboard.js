import React, { useState, useEffect } from 'react';
import { 
  FiUpload, FiCheck, FiArrowRight, FiTarget, FiTrendingUp, 
  FiCompass, FiDownload, FiChevronDown, FiChevronUp, FiFileText
} from 'react-icons/fi';
import toast from 'react-hot-toast';

// Imports des composants existants
import { useApp } from '../context/AppContext'; // Le "dispositif existant" pour l'upload
import CVAnalysisDashboard from '../components/Analysis/CVAnalysisDashboard'; // L'affichage JSON prévu
import { LogoIcon } from '../components/icons/ModernIcons';

const SimplifiedDashboard = () => {
  // --- ÉTATS FONCTIONNELS ---
  const { documentStatus, uploadDocument } = useApp();
  const [isUploading, setIsUploading] = useState(false);
  const [cvAnalysis, setCvAnalysis] = useState(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState(null);
  const [showAnalysis, setShowAnalysis] = useState(true);

  // Charger l'analyse depuis le localStorage au démarrage si elle existe
  useEffect(() => {
    const savedAnalysis = localStorage.getItem('cvAnalysis');
    if (savedAnalysis && documentStatus.cv?.uploaded) {
      try {
        setCvAnalysis(JSON.parse(savedAnalysis));
      } catch (e) {
        console.error("Erreur lecture analyse sauvegardée");
      }
    }
  }, [documentStatus.cv?.uploaded]);

  // --- LOGIQUE MÉTIER (Le "Cerveau") ---

  // 1. Gérer l'upload réel et déclencher l'analyse
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsUploading(true);
    try {
      // A. Upload du fichier via le contexte existant
      const result = await uploadDocument(file, 'cv');
      
      if (result.success) {
        toast.success('CV reçu ! Analyse en cours...');
        
        // B. Appel à l'API d'analyse (utilise le prompt Supabase côté backend)
        setAnalysisLoading(true);
        setAnalysisError(null);
        setShowAnalysis(true);
        
        try {
          const response = await fetch('/api/actions/analyze-cv', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
            },
            body: JSON.stringify({ 
              service_id: 'analyze_cv',
              force_new: true 
            })
          });

          const data = await response.json();

          if (response.ok && data.success) {
            // Récupération du JSON généré par le prompt Supabase
            const analysisContent = data.analysis || data.result || data.content;
            setCvAnalysis(analysisContent);
            localStorage.setItem('cvAnalysis', JSON.stringify(analysisContent)); // Persistance
          } else {
            throw new Error(data.error || "L'analyse n'a pas pu aboutir.");
          }
        } catch (err) {
          console.error("Erreur analyse:", err);
          setAnalysisError("Impossible d'analyser le CV pour le moment. Réessayez plus tard.");
        } finally {
          setAnalysisLoading(false);
        }
      }
    } catch (error) {
      console.error("Erreur upload:", error);
      toast.error("Erreur lors de l'envoi du fichier.");
    } finally {
      setIsUploading(false);
    }
  };

  // 2. Fonction de téléchargement du rapport
  const downloadReport = () => {
    if (!cvAnalysis) return;
    
    // Convertir l'objet d'analyse en texte lisible
    const data = typeof cvAnalysis === 'string' ? JSON.parse(cvAnalysis) : cvAnalysis;
    const textContent = `
RAPPORT D'ANALYSE CV - IAMONJOB
Date: ${new Date().toLocaleDateString()}
Note Globale: ${data.globalScore || 'N/A'}/10

SYNTHÈSE:
${data.synthesis || 'Non disponible'}

POINTS FORTS:
${(data.strengths || []).map(s => `- ${s}`).join('\n')}

AXES D'AMÉLIORATION:
${(data.improvements || []).map(i => `- ${i}`).join('\n')}

RECOMMANDATIONS:
${(data.recommendations || []).map(r => `- ${r}`).join('\n')}
    `.trim();

    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Analyse_CV_IAMONJOB.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- STYLES ---
  const styles = {
    container: {
      minHeight: '100vh',
      background: '#f8fafc',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '40px 20px',
    },
    header: {
      width: '100%',
      maxWidth: '1100px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '30px',
    },
    mainCard: {
      background: 'white',
      borderRadius: '24px',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      width: '100%',
      maxWidth: '1100px',
      padding: '30px',
      marginBottom: '30px',
      overflow: 'hidden'
    },
    uploadArea: {
      border: '2px dashed #e5e7eb',
      borderRadius: '16px',
      padding: '40px',
      textAlign: 'center',
      cursor: 'pointer',
      background: '#f9fafb',
      transition: 'all 0.2s',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '15px'
    },
    uploadedHeader: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '15px 20px',
      background: '#f0fdf4',
      border: '1px solid #bbf7d0',
      borderRadius: '12px',
      marginBottom: '20px'
    },
    analysisContainer: {
      marginTop: '20px',
      borderTop: '1px solid #e5e7eb',
      paddingTop: '20px',
      animation: 'fadeIn 0.5s ease-in',
    },
    actionGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
      gap: '24px',
    },
    actionCard: {
      background: 'white',
      border: '1px solid #e5e7eb',
      borderRadius: '20px',
      padding: '30px',
      textAlign: 'left',
      cursor: 'pointer',
      transition: 'transform 0.2s, box-shadow 0.2s',
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
    },
    primaryButton: {
      background: '#0a6b79',
      color: 'white',
      border: 'none',
      padding: '12px 24px',
      fontSize: '1rem',
      borderRadius: '8px',
      cursor: 'pointer',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '8px',
      fontWeight: '600',
    },
    downloadButton: {
      background: 'white',
      color: '#0a6b79',
      border: '1px solid #0a6b79',
      padding: '8px 16px',
      fontSize: '0.9rem',
      borderRadius: '6px',
      cursor: 'pointer',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '8px',
      fontWeight: '500',
      transition: 'all 0.2s'
    }
  };

  const hasCV = documentStatus.cv?.uploaded;

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <LogoIcon size={32} />
          <h1 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1f2937', margin: 0 }}>
            Mon Espace Candidat
          </h1>
        </div>
      </div>

      {/* SECTION 1 : ZONE DOCUMENT & ANALYSE */}
      <div style={styles.mainCard}>
        
        {/* CAS A : PAS ENCORE DE CV */}
        {!hasCV && !isUploading && (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <h2 style={{ fontSize: '1.8rem', marginBottom: '10px', color: '#1f2937' }}>Bienvenue !</h2>
            <p style={{ color: '#6b7280', marginBottom: '30px' }}>
              Pour commencer, déposez votre CV. Notre IA va l'analyser instantanément.
            </p>
            
            <label htmlFor="cv-upload-input" style={styles.uploadArea}>
              <FiUpload style={{ fontSize: '3rem', color: '#0a6b79' }} />
              <div>
                <h3 style={{ margin: '0 0 5px 0', fontSize: '1.2rem' }}>Cliquez pour déposer votre CV</h3>
                <p style={{ margin: 0, color: '#9ca3af', fontSize: '0.9rem' }}>PDF ou Word (Max 5Mo)</p>
              </div>
              <div style={styles.primaryButton}>Sélectionner un fichier</div>
            </label>
            <input 
              id="cv-upload-input"
              type="file"
              accept=".pdf,.doc,.docx"
              style={{ display: 'none' }}
              onChange={handleFileUpload}
            />
          </div>
        )}

        {/* CAS B : UPLOAD EN COURS */}
        {isUploading && (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <div style={{ fontSize: '3rem', marginBottom: '20px', animation: 'spin 2s linear infinite' }}>⚙️</div>
            <h3 style={{ color: '#0a6b79', margin: 0 }}>Analyse de votre parcours en cours...</h3>
            <p style={{ color: '#64748b' }}>Cela prend quelques secondes.</p>
          </div>
        )}

        {/* CAS C : CV PRÉSENT */}
        {hasCV && !isUploading && (
          <div>
            {/* Header du fichier */}
            <div style={styles.uploadedHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <div style={{ width: '40px', height: '40px', background: '#dcfce7', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#166534' }}>
                  <FiCheck size={24} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1rem', color: '#166534' }}>CV enregistré</h3>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#15803d' }}>Prêt pour vos candidatures</p>
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '10px' }}>
                {/* Bouton pour remplacer le CV */}
                <label 
                  htmlFor="cv-replace-input"
                  style={{ cursor: 'pointer', fontSize: '0.9rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '5px', padding: '0 10px' }}
                >
                  <FiUpload /> Remplacer
                </label>
                <input 
                  id="cv-replace-input"
                  type="file"
                  accept=".pdf,.doc,.docx"
                  style={{ display: 'none' }}
                  onChange={handleFileUpload}
                />

                {/* Bouton pour voir/masquer l'analyse */}
                <button 
                  onClick={() => setShowAnalysis(!showAnalysis)}
                  style={{ background: 'transparent', border: 'none', color: '#0a6b79', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontWeight: '600' }}
                >
                  {showAnalysis ? 'Masquer l\'analyse' : 'Voir l\'analyse'} 
                  {showAnalysis ? <FiChevronUp /> : <FiChevronDown />}
                </button>
              </div>
            </div>

            {/* ZONE D'ANALYSE DYNAMIQUE */}
            {showAnalysis && (
              <div style={styles.analysisContainer}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', padding: '0 10px' }}>
                  <h3 style={{ fontSize: '1.2rem', color: '#334155', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FiFileText /> Analyse IA de votre profil
                  </h3>
                  {cvAnalysis && (
                    <button onClick={downloadReport} style={styles.downloadButton}>
                      <FiDownload /> Télécharger le rapport
                    </button>
                  )}
                </div>

                {/* --- LE COMPOSANT D'ANALYSE ORIGINAL --- */}
                <CVAnalysisDashboard 
                  analysisData={cvAnalysis}
                  loading={analysisLoading}
                  error={analysisError}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* SECTION 2 : ACTIONS POSSIBLES (Visible uniquement si CV présent) */}
      {hasCV && (
        <div style={{ width: '100%', maxWidth: '1100px' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1f2937', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            Que souhaitez-vous faire maintenant ?
          </h2>
          
          <div style={styles.actionGrid}>
            
            {/* Action 1 : OFFRE */}
            <div 
              style={styles.actionCard} 
              onClick={() => window.location.href = '/evaluate'}
              className="hover-scale"
            >
              <div style={{ marginBottom: '16px', width: '50px', height: '50px', borderRadius: '12px', background: '#ecfeff', color: '#0a6b79', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>
                <FiTarget />
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: '700', margin: '0 0 10px 0', color: '#1f2937' }}>J'ai vu une offre</h3>
              <p style={{ color: '#6b7280', fontSize: '0.95rem', lineHeight: '1.5', flex: 1 }}>
                Testez votre compatibilité avec une offre et adaptez votre candidature.
              </p>
              <div style={{ marginTop: '20px', color: '#0a6b79', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '5px' }}>
                Tester la compatibilité <FiArrowRight />
              </div>
            </div>

            {/* Action 2 : PROFIL */}
            <div 
              style={styles.actionCard}
              onClick={() => window.location.href = '/improve'}
              className="hover-scale"
            >
              <div style={{ marginBottom: '16px', width: '50px', height: '50px', borderRadius: '12px', background: '#fdf2f8', color: '#be185d', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>
                <FiTrendingUp />
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: '700', margin: '0 0 10px 0', color: '#1f2937' }}>Améliorer mon CV</h3>
              <p style={{ color: '#6b7280', fontSize: '0.95rem', lineHeight: '1.5', flex: 1 }}>
                Utilisez l'analyse détaillée ci-dessus pour corriger vos points faibles.
              </p>
              <div style={{ marginTop: '20px', color: '#be185d', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '5px' }}>
                Optimiser mon CV <FiArrowRight />
              </div>
            </div>

            {/* Action 3 : PROJET */}
            <div 
              style={styles.actionCard}
              onClick={() => window.location.href = '/career'}
              className="hover-scale"
            >
              <div style={{ marginBottom: '16px', width: '50px', height: '50px', borderRadius: '12px', background: '#fffbeb', color: '#b45309', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>
                <FiCompass />
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: '700', margin: '0 0 10px 0', color: '#1f2937' }}>Préparer mon projet</h3>
              <p style={{ color: '#6b7280', fontSize: '0.95rem', lineHeight: '1.5', flex: 1 }}>
                Identifiez vos compétences transférables et explorez de nouvelles pistes.
              </p>
              <div style={{ marginTop: '20px', color: '#b45309', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '5px' }}>
                Explorer les pistes <FiArrowRight />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SimplifiedDashboard;
