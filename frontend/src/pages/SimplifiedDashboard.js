import React, { useState } from 'react';
import { 
  FiUpload, 
  FiCheck, 
  FiArrowRight, 
  FiTarget, 
  FiTrendingUp, 
  FiCompass,
  FiDownload,
  FiFileText,
  FiChevronDown,
  FiChevronUp,
  FiAlertCircle
} from 'react-icons/fi';
import { LogoIcon } from '../components/icons/ModernIcons';

const SimplifiedDashboard = () => {
  // États de la maquette
  const [hasCV, setHasCV] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(true); // Pour plier/déplier l'analyse

  // Simulation d'upload
  const handleFakeUpload = () => {
    setIsUploading(true);
    setTimeout(() => {
      setIsUploading(false);
      setHasCV(true);
      setShowAnalysis(true); // On affiche l'analyse automatiquement après l'upload
    }, 1500);
  };

  // --- STYLES ---
  const styles = {
    container: {
      minHeight: '100vh',
      background: '#f8fafc',
      fontFamily: '-apple-system, sans-serif',
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
      transition: 'all 0.3s ease',
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
    analysisSection: {
      marginTop: '20px',
      borderTop: '1px solid #e5e7eb',
      paddingTop: '20px',
      animation: 'fadeIn 0.5s ease-in',
    },
    analysisGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
      gap: '20px',
      marginTop: '15px'
    },
    statCard: {
      background: '#f8fafc',
      padding: '20px',
      borderRadius: '12px',
      border: '1px solid #e2e8f0'
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
    }
  };

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

      {/* SECTION 1 : LE CV ET SON ANALYSE */}
      <div style={styles.mainCard}>
        {!hasCV ? (
          // --- ÉTAT : PAS DE CV ---
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <h2 style={{ fontSize: '1.8rem', marginBottom: '10px', color: '#1f2937' }}>Bienvenue !</h2>
            <p style={{ color: '#6b7280', marginBottom: '30px' }}>
              Pour commencer, déposez votre CV. Notre IA va l'analyser instantanément.
            </p>
            
            <div style={styles.uploadArea} onClick={handleFakeUpload}>
              {isUploading ? (
                <div style={{ color: '#0a6b79', fontWeight: '600', fontSize: '1.2rem' }}>
                  ⚙️ Analyse de votre parcours en cours...
                </div>
              ) : (
                <>
                  <FiUpload style={{ fontSize: '3rem', color: '#0a6b79' }} />
                  <div>
                    <h3 style={{ margin: '0 0 5px 0', fontSize: '1.2rem' }}>Cliquez pour déposer votre CV</h3>
                    <p style={{ margin: 0, color: '#9ca3af', fontSize: '0.9rem' }}>PDF ou Word (Max 5Mo)</p>
                  </div>
                  <button style={styles.primaryButton}>Sélectionner un fichier</button>
                </>
              )}
            </div>
          </div>
        ) : (
          // --- ÉTAT : CV CHARGÉ ---
          <div>
            {/* En-tête du fichier chargé */}
            <div style={styles.uploadedHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <div style={{ width: '40px', height: '40px', background: '#dcfce7', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#166534' }}>
                  <FiCheck size={24} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1rem', color: '#166534' }}>mon_cv_2024.pdf</h3>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#15803d' }}>Analysé avec succès • Ajouté à l'instant</p>
                </div>
              </div>
              <button 
                onClick={() => setShowAnalysis(!showAnalysis)}
                style={{ background: 'transparent', border: 'none', color: '#166534', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontWeight: '600' }}
              >
                {showAnalysis ? 'Masquer l\'analyse' : 'Voir l\'analyse'} 
                {showAnalysis ? <FiChevronUp /> : <FiChevronDown />}
              </button>
            </div>

            {/* ZONE D'ANALYSE (Visible ou Repliée) */}
            {showAnalysis && (
              <div style={styles.analysisSection}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                  <div>
                    <h3 style={{ fontSize: '1.4rem', color: '#0a6b79', margin: '0 0 5px 0' }}>Bilan de votre profil</h3>
                    <p style={{ color: '#6b7280', margin: 0 }}>Basé sur l'analyse IA de votre CV</p>
                  </div>
                  <button style={styles.downloadButton}>
                    <FiDownload /> Télécharger le rapport
                  </button>
                </div>

                <div style={styles.analysisGrid}>
                  {/* Points Forts */}
                  <div style={styles.statCard}>
                    <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 15px 0', color: '#166534' }}>
                      <FiCheck /> Points Forts détectés
                    </h4>
                    <ul style={{ margin: 0, paddingLeft: '20px', color: '#374151', lineHeight: '1.6' }}>
                      <li>Expérience solide en gestion de projet</li>
                      <li>Double compétence technique et commerciale</li>
                      <li>Maîtrise de l'anglais professionnel</li>
                    </ul>
                  </div>

                  {/* Axes d'amélioration */}
                  <div style={styles.statCard}>
                    <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 15px 0', color: '#b45309' }}>
                      <FiAlertCircle /> Axes d'amélioration
                    </h4>
                    <ul style={{ margin: 0, paddingLeft: '20px', color: '#374151', lineHeight: '1.6' }}>
                      <li>Détailler davantage les résultats chiffrés</li>
                      <li>Mettre à jour la section "Outils"</li>
                    </ul>
                  </div>
                </div>

                <div style={{ marginTop: '20px', padding: '15px', background: '#eff6ff', borderRadius: '8px', borderLeft: '4px solid #3b82f6', color: '#1e40af' }}>
                  <strong>💡 Conseil du coach :</strong> Votre profil est très pertinent pour des postes de Chef de Projet. Pour augmenter vos chances, nous vous conseillons d'adapter votre CV à chaque offre.
                </div>
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
            {/* Option A : Chercher un job */}
            <div style={styles.actionCard} className="hover-scale">
              <div style={{ marginBottom: '16px', width: '50px', height: '50px', borderRadius: '12px', background: '#ecfeff', color: '#0a6b79', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>
                <FiTarget />
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: '700', margin: '0 0 10px 0', color: '#1f2937' }}>J'ai vu une offre</h3>
              <p style={{ color: '#6b7280', fontSize: '0.95rem', lineHeight: '1.5', flex: 1 }}>
                Collez le lien ou le texte d'une offre. Je vérifierai si ça matche avec votre CV actuel.
              </p>
              <div style={{ marginTop: '20px', color: '#0a6b79', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '5px' }}>
                Tester la compatibilité <FiArrowRight />
              </div>
            </div>

            {/* Option B : Améliorer le profil */}
            <div style={styles.actionCard} className="hover-scale">
              <div style={{ marginBottom: '16px', width: '50px', height: '50px', borderRadius: '12px', background: '#fdf2f8', color: '#be185d', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>
                <FiTrendingUp />
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: '700', margin: '0 0 10px 0', color: '#1f2937' }}>Améliorer mon CV</h3>
              <p style={{ color: '#6b7280', fontSize: '0.95rem', lineHeight: '1.5', flex: 1 }}>
                Utilisons l'analyse ci-dessus pour réécrire les parties faibles de votre CV.
              </p>
              <div style={{ marginTop: '20px', color: '#be185d', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '5px' }}>
                Optimiser mon CV <FiArrowRight />
              </div>
            </div>

            {/* Option C : Projet Pro */}
            <div style={styles.actionCard} className="hover-scale">
              <div style={{ marginBottom: '16px', width: '50px', height: '50px', borderRadius: '12px', background: '#fffbeb', color: '#b45309', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>
                <FiCompass />
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: '700', margin: '0 0 10px 0', color: '#1f2937' }}>Préparer mon projet</h3>
              <p style={{ color: '#6b7280', fontSize: '0.95rem', lineHeight: '1.5', flex: 1 }}>
                Clarifions vos compétences transférables pour trouver de nouvelles pistes.
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
