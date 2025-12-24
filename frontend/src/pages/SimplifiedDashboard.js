import React, { useState, useEffect } from 'react';
import { 
  FiUpload, FiCheck, FiArrowRight, FiTarget, 
  FiCompass, FiDownload, FiChevronDown, FiChevronUp, 
  FiFileText, FiArrowLeft, FiBriefcase, FiActivity,
  FiPaperclip, FiEdit3
} from 'react-icons/fi';
import toast from 'react-hot-toast';

// Imports existants
import { useApp } from '../context/AppContext';
import CVAnalysisDashboard from '../components/Analysis/CVAnalysisDashboard';
import PartnerJobs from '../components/Partners/PartnerJobs'; // Ajout des Jobs Partenaires
import { LogoIcon } from '../components/icons/ModernIcons';

const SimplifiedDashboard = () => {
  // --- ÉTATS GLOBAUX ---
  const { documentStatus, uploadDocument } = useApp();
  const [currentView, setCurrentView] = useState('dashboard'); // 'dashboard', 'match', 'project'
  
  // États CV et Analyse
  const [isUploading, setIsUploading] = useState(false);
  const [cvAnalysis, setCvAnalysis] = useState(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(true);

  // Charger l'analyse existante
  useEffect(() => {
    const savedAnalysis = localStorage.getItem('cvAnalysis');
    if (savedAnalysis && documentStatus.cv?.uploaded) {
      try {
        setCvAnalysis(JSON.parse(savedAnalysis));
      } catch (e) { console.error(e); }
    }
  }, [documentStatus.cv?.uploaded]);

  // --- LOGIQUE MÉTIER ---

  const handleFileUpload = async (event, type = 'cv') => {
    const file = event.target.files[0];
    if (!file) return;

    if (type === 'cv') setIsUploading(true);
    
    try {
      const result = await uploadDocument(file, type);
      
      if (result.success) {
        if (type === 'cv') {
          toast.success('CV reçu ! Analyse en cours...');
          triggerCVAnalysis();
        } else if (type === 'offre_emploi') {
          toast.success('Offre d\'emploi chargée avec succès !');
        }
      }
    } catch (error) {
      toast.error("Erreur lors de l'envoi du fichier.");
    } finally {
      if (type === 'cv') setIsUploading(false);
    }
  };

  const triggerCVAnalysis = async () => {
    setAnalysisLoading(true);
    setShowAnalysis(true);
    try {
      const response = await fetch('/api/actions/analyze-cv', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        },
        body: JSON.stringify({ service_id: 'analyze_cv', force_new: true })
      });
      const data = await response.json();
      if (response.ok && data.success) {
        const content = data.analysis || data.result || data.content;
        setCvAnalysis(content);
        localStorage.setItem('cvAnalysis', JSON.stringify(content));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAnalysisLoading(false);
    }
  };

  // --- COMPOSANTS DE VUES INTERMÉDIAIRES ---

  // 1. VUE "J'AI VU UNE OFFRE" (Mise à jour avec Upload + PartnerJobs)
  const MatchOfferView = () => {
    const [offerText, setOfferText] = useState('');
    const [inputType, setInputType] = useState('text'); // 'text' ou 'file'
    const [analyzing, setAnalyzing] = useState(false);
    
    // Vérifier si une offre est déjà chargée
    const hasOfferUploaded = documentStatus.offre_emploi?.uploaded;

    const handleMatch = () => {
      if (inputType === 'text' && !offerText.trim()) return toast.error('Collez une offre d\'abord');
      if (inputType === 'file' && !hasOfferUploaded) return toast.error('Veuillez charger un fichier d\'abord');

      setAnalyzing(true);
      // Simulation d'appel API de matching
      setTimeout(() => {
        setAnalyzing(false);
        toast.success("Analyse de compatibilité terminée !");
        // Ici : Redirection vers le résultat ou affichage du matching
      }, 2000);
    };

    return (
      <div style={styles.subPageContainer}>
        <button onClick={() => setCurrentView('dashboard')} style={styles.backButton}>
          <FiArrowLeft /> Retour au tableau de bord
        </button>
        
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <div style={{ width: '60px', height: '60px', background: '#ecfeff', color: '#0a6b79', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '30px', margin: '0 auto 20px auto' }}>
            <FiTarget />
          </div>
          <h2 style={{ fontSize: '1.8rem', color: '#1f2937', marginBottom: '10px' }}>Analyse de Compatibilité</h2>
          <p style={{ color: '#6b7280', maxWidth: '600px', margin: '0 auto' }}>
            Vérifiez si votre CV correspond à l'offre visée et obtenez des conseils pour l'adapter.
          </p>
        </div>

        {/* Carte de Saisie / Upload */}
        <div style={styles.inputCard}>
          {/* Onglets */}
          <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', marginBottom: '20px' }}>
            <button 
              onClick={() => setInputType('text')}
              style={{ padding: '10px 20px', borderBottom: inputType === 'text' ? '2px solid #0a6b79' : 'none', color: inputType === 'text' ? '#0a6b79' : '#64748b', fontWeight: '600', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <FiEdit3 /> Coller le texte
            </button>
            <button 
              onClick={() => setInputType('file')}
              style={{ padding: '10px 20px', borderBottom: inputType === 'file' ? '2px solid #0a6b79' : 'none', color: inputType === 'file' ? '#0a6b79' : '#64748b', fontWeight: '600', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <FiPaperclip /> Télécharger un fichier
            </button>
          </div>

          {/* Contenu Onglet Texte */}
          {inputType === 'text' && (
            <textarea 
              style={styles.textArea}
              placeholder="Collez le titre, la description et les prérequis de l'offre ici..."
              value={offerText}
              onChange={(e) => setOfferText(e.target.value)}
            />
          )}

          {/* Contenu Onglet Fichier */}
          {inputType === 'file' && (
            <div style={{ padding: '40px', border: '2px dashed #cbd5e1', borderRadius: '12px', textAlign: 'center', background: '#f8fafc' }}>
              {hasOfferUploaded ? (
                <div>
                  <div style={{ width: '50px', height: '50px', background: '#dcfce7', color: '#166534', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 15px auto', fontSize: '24px' }}>
                    <FiCheck />
                  </div>
                  <h3 style={{ color: '#1f2937', margin: '0 0 5px 0' }}>Offre chargée !</h3>
                  <p style={{ color: '#64748b', margin: '0 0 20px 0' }}>{documentStatus.offre_emploi?.fileName || 'Document prêt'}</p>
                  <label htmlFor="offer-upload" style={{ ...styles.secondaryButton, display: 'inline-flex', cursor: 'pointer' }}>
                    Remplacer le fichier
                  </label>
                </div>
              ) : (
                <div>
                  <FiUpload style={{ fontSize: '40px', color: '#94a3b8', marginBottom: '15px' }} />
                  <h3 style={{ color: '#1f2937', margin: '0 0 5px 0' }}>Importez votre offre</h3>
                  <p style={{ color: '#64748b', margin: '0 0 20px 0' }}>PDF, Word ou Texte</p>
                  <label htmlFor="offer-upload" style={{ ...styles.secondaryButton, display: 'inline-flex', cursor: 'pointer' }}>
                    Sélectionner un fichier
                  </label>
                </div>
              )}
              <input 
                id="offer-upload" 
                type="file" 
                accept=".pdf,.doc,.docx,.txt" 
                style={{ display: 'none' }}
                onChange={(e) => handleFileUpload(e, 'offre_emploi')}
              />
            </div>
          )}

          {/* Bouton d'action commun */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
            <button 
              onClick={handleMatch}
              disabled={analyzing}
              style={{ ...styles.primaryButton, opacity: analyzing ? 0.7 : 1 }}
            >
              {analyzing ? 'Analyse en cours...' : 'Comparer avec mon CV'} <FiArrowRight />
            </button>
          </div>
        </div>

        {/* SECTION PARTENAIRES INTÉGRÉE */}
        <div style={{ marginTop: '50px', borderTop: '1px solid #e2e8f0', paddingTop: '40px' }}>
          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <h3 style={{ fontSize: '1.5rem', color: '#1f2937', marginBottom: '10px' }}>
              Pas d'offre sous la main ?
            </h3>
            <p style={{ color: '#64748b' }}>
              Testez directement votre compatibilité avec les métiers qui recrutent chez nos partenaires.
            </p>
          </div>
          <PartnerJobs />
        </div>
      </div>
    );
  };

  // 2. VUE "PROJET PROFESSIONNEL" (Inchangée)
  const ProjectView = () => (
    <div style={styles.subPageContainer}>
      <button onClick={() => setCurrentView('dashboard')} style={styles.backButton}>
        <FiArrowLeft /> Retour au tableau de bord
      </button>

      <div style={{ textAlign: 'center', marginBottom: '30px' }}>
        <div style={{ width: '60px', height: '60px', background: '#fffbeb', color: '#b45309', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '30px', margin: '0 auto 20px auto' }}>
          <FiCompass />
        </div>
        <h2 style={{ fontSize: '1.8rem', color: '#1f2937', marginBottom: '10px' }}>Exploration de Carrière</h2>
        <p style={{ color: '#6b7280', maxWidth: '600px', margin: '0 auto' }}>
          Basé sur votre CV, identifions vos compétences transférables et les métiers où vous pourriez exceller.
        </p>
      </div>

      <div style={styles.gridTwo}>
        <div style={styles.infoCard}>
          <h3 style={{ color: '#b45309', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FiActivity /> Vos compétences clés
          </h3>
          <p style={{ fontSize: '0.9rem', color: '#6b7280', marginBottom: '15px' }}>Détectées dans votre CV</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            {['Gestion de projet', 'Communication', 'Analyse de données', 'Management'].map(skill => (
              <span key={skill} style={{ background: '#fff7ed', color: '#9a3412', padding: '6px 12px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: '500' }}>
                {skill}
              </span>
            ))}
          </div>
        </div>

        <div style={styles.infoCard}>
          <h3 style={{ color: '#0a6b79', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FiBriefcase /> Pistes suggérées
          </h3>
          <p style={{ fontSize: '0.9rem', color: '#6b7280', marginBottom: '15px' }}>Métiers compatibles</p>
          <ul style={{ paddingLeft: '20px', margin: 0, color: '#374151' }}>
            <li style={{ marginBottom: '8px' }}>Chef de produit (85% compatible)</li>
            <li style={{ marginBottom: '8px' }}>Consultant en organisation</li>
            <li>Responsable opérationnel</li>
          </ul>
          <button style={{ marginTop: '20px', color: '#b45309', background: 'none', border: 'none', fontWeight: '600', cursor: 'pointer', padding: 0 }}>
            Lancer une analyse approfondie →
          </button>
        </div>
      </div>
    </div>
  );

  // --- STYLES ---
  const styles = {
    container: {
      minHeight: '100vh', background: '#f8fafc', fontFamily: '-apple-system, sans-serif',
      display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 20px',
    },
    header: {
      width: '100%', maxWidth: '1000px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px',
    },
    mainCard: {
      background: 'white', borderRadius: '24px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
      width: '100%', maxWidth: '1000px', padding: '30px', marginBottom: '30px',
    },
    actionGridTwo: {
      display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '30px', marginTop: '20px'
    },
    actionCard: {
      background: 'white', border: '1px solid #e5e7eb', borderRadius: '20px', padding: '30px',
      textAlign: 'left', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', flexDirection: 'column', height: '100%',
    },
    uploadedHeader: {
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '15px 20px',
      background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', marginBottom: '20px'
    },
    subPageContainer: {
      width: '100%', maxWidth: '900px', animation: 'fadeIn 0.3s ease-out'
    },
    backButton: {
      background: 'transparent', border: 'none', color: '#64748b', fontSize: '1rem',
      display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginBottom: '20px', padding: '10px 0'
    },
    inputCard: {
      background: 'white', padding: '30px', borderRadius: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)'
    },
    textArea: {
      width: '100%', minHeight: '200px', padding: '20px', border: '2px solid #e5e7eb', borderRadius: '12px',
      fontSize: '1rem', fontFamily: 'inherit', resize: 'vertical', outline: 'none'
    },
    primaryButton: {
      background: '#0a6b79', color: 'white', border: 'none', padding: '14px 28px', fontSize: '1rem',
      borderRadius: '12px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '10px', fontWeight: '600',
    },
    secondaryButton: {
      background: 'white', color: '#1f2937', border: '1px solid #cbd5e1', padding: '10px 20px', fontSize: '0.95rem',
      borderRadius: '8px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px', fontWeight: '600',
    },
    gridTwo: {
      display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px'
    },
    infoCard: {
      background: 'white', padding: '25px', borderRadius: '16px', border: '1px solid #e5e7eb'
    },
    downloadButton: {
      background: 'white', color: '#0a6b79', border: '1px solid #0a6b79', padding: '8px 16px', fontSize: '0.9rem', borderRadius: '6px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px', fontWeight: '500'
    }
  };

  const hasCV = documentStatus.cv?.uploaded;

  // --- RENDU PRINCIPAL ---

  if (currentView === 'match') return <div style={styles.container}><MatchOfferView /></div>;
  if (currentView === 'project') return <div style={styles.container}><ProjectView /></div>;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <LogoIcon size={32} />
          <h1 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1f2937', margin: 0 }}>Mon Espace</h1>
        </div>
      </div>

      <div style={styles.mainCard}>
        {/* SECTION UPLOAD / ANALYSE CV */}
        {!hasCV ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <h2 style={{ fontSize: '2rem', marginBottom: '15px', color: '#1f2937' }}>Bonjour !</h2>
            <p style={{ color: '#6b7280', marginBottom: '40px', fontSize: '1.1rem' }}>
              Pour que je puisse vous aider, j'ai besoin de comprendre votre parcours.<br/>
              Déposez votre CV ci-dessous.
            </p>
            <label htmlFor="cv-upload-input" style={{ display: 'inline-block', border: '3px dashed #e2e8f0', borderRadius: '20px', padding: '50px', cursor: 'pointer', background: '#f8fafc', transition: 'border-color 0.2s' }}>
              {isUploading ? (
                <div style={{ color: '#0a6b79', fontWeight: '600' }}>Analyse en cours...</div>
              ) : (
                <>
                  <FiUpload style={{ fontSize: '3rem', color: '#0a6b79', marginBottom: '15px' }} />
                  <div style={{ fontWeight: '600', color: '#334155' }}>Cliquez pour déposer votre CV</div>
                </>
              )}
            </label>
            <input id="cv-upload-input" type="file" accept=".pdf,.doc,.docx" style={{ display: 'none' }} onChange={(e) => handleFileUpload(e, 'cv')} />
          </div>
        ) : (
          <div>
            <div style={styles.uploadedHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <div style={{ width: '40px', height: '40px', background: '#dcfce7', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#166534' }}>
                  <FiCheck size={24} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1rem', color: '#166534' }}>CV Analysé</h3>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#15803d' }}>Prêt à être utilisé</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '15px' }}>
                <label htmlFor="cv-replace" style={{ cursor: 'pointer', fontSize: '0.9rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <FiUpload /> Remplacer
                </label>
                <input id="cv-replace" type="file" style={{ display: 'none' }} onChange={(e) => handleFileUpload(e, 'cv')} />
                
                <button onClick={() => setShowAnalysis(!showAnalysis)} style={{ background: 'none', border: 'none', color: '#0a6b79', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  {showAnalysis ? 'Masquer détails' : 'Voir détails'} {showAnalysis ? <FiChevronUp /> : <FiChevronDown />}
                </button>
              </div>
            </div>

            {showAnalysis && (
              <div style={{ marginTop: '20px', borderTop: '1px solid #f1f5f9', paddingTop: '20px' }}>
                 <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
                    {cvAnalysis && (
                      <button style={styles.downloadButton} onClick={() => toast.success("Téléchargement du rapport...")}>
                        <FiDownload /> Télécharger Rapport
                      </button>
                    )}
                 </div>
                 <CVAnalysisDashboard analysisData={cvAnalysis} loading={analysisLoading} />
              </div>
            )}
          </div>
        )}
      </div>

      {/* SECTION CHOIX ACTIONS (Visible si CV présent) */}
      {hasCV && (
        <div style={{ width: '100%', maxWidth: '1000px' }}>
          <h2 style={{ fontSize: '1.6rem', fontWeight: '700', color: '#1f2937', marginBottom: '20px' }}>
            Quelle est votre prochaine étape ?
          </h2>
          
          <div style={styles.actionGridTwo}>
            {/* OPTION 1 : OFFRE */}
            <div style={styles.actionCard} className="hover-scale" onClick={() => setCurrentView('match')}>
              <div style={{ width: '60px', height: '60px', background: '#ecfeff', color: '#0a6b79', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', marginBottom: '20px' }}>
                <FiTarget />
              </div>
              <h3 style={{ fontSize: '1.4rem', color: '#1f2937', marginBottom: '10px' }}>J'ai vu une offre</h3>
              <p style={{ color: '#64748b', lineHeight: '1.6', flex: 1 }}>
                Vous avez repéré une annonce ? Copiez-la ou téléchargez-la.
                <br/><br/>
                Je vais analyser la compatibilité avec votre CV, identifier les mots-clés manquants et vous aider à rédiger votre lettre de motivation.
              </p>
              <div style={{ marginTop: '25px', color: '#0a6b79', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                Tester ma compatibilité <FiArrowRight />
              </div>
            </div>

            {/* OPTION 2 : PROJET */}
            <div style={styles.actionCard} className="hover-scale" onClick={() => setCurrentView('project')}>
              <div style={{ width: '60px', height: '60px', background: '#fffbeb', color: '#b45309', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', marginBottom: '20px' }}>
                <FiCompass />
              </div>
              <h3 style={{ fontSize: '1.4rem', color: '#1f2937', marginBottom: '10px' }}>Je prépare mon projet</h3>
              <p style={{ color: '#64748b', lineHeight: '1.6', flex: 1 }}>
                Vous ne visez pas une offre précise pour le moment ?
                <br/><br/>
                Analysons vos compétences transférables pour identifier des pistes de reconversion ou des métiers où vous seriez performant.
              </p>
              <div style={{ marginTop: '25px', color: '#b45309', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
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
