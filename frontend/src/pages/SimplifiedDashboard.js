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
import MatchingAnalysis from '../components/Analysis/MatchingAnalysis';
import PartnerJobs from '../components/Partners/PartnerJobs';
import { LogoIcon } from '../components/icons/ModernIcons';

const SimplifiedDashboard = () => {
  // --- ÉTATS ---
  const { documentStatus, uploadDocument } = useApp();
  const [currentView, setCurrentView] = useState('dashboard'); // 'dashboard', 'match', 'project'
  
  // États CV
  const [isUploading, setIsUploading] = useState(false);
  const [cvAnalysis, setCvAnalysis] = useState(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(true);

  // Charger l'analyse CV au démarrage
  useEffect(() => {
    const savedAnalysis = localStorage.getItem('cvAnalysis');
    if (savedAnalysis && documentStatus.cv?.uploaded) {
      try { setCvAnalysis(JSON.parse(savedAnalysis)); } catch (e) {}
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
          toast.success('Offre chargée avec succès !');
        }
      }
    } catch (error) { toast.error("Erreur upload"); } 
    finally { if (type === 'cv') setIsUploading(false); }
  };

  const triggerCVAnalysis = async () => {
    setAnalysisLoading(true);
    setShowAnalysis(true);
    try {
      // CORRECTION : Utilisation de la route générique services/execute
      const response = await fetch('/api/services/execute/analyze_cv', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        },
        body: JSON.stringify({ force_new: true })
      });
      const data = await response.json();
      if (data.success) {
        // CORRECTION : Prise en compte du champ 'result' ou 'analysis'
        const content = data.result || data.analysis || data.content;
        setCvAnalysis(content);
        localStorage.setItem('cvAnalysis', JSON.stringify(content));
      }
    } catch (err) { console.error(err); } 
    finally { setAnalysisLoading(false); }
  };

  // --- VUE 1 : MATCHING OFFRE ---
  const MatchOfferView = () => {
    const [offerText, setOfferText] = useState('');
    const [inputType, setInputType] = useState('text');
    const [analyzing, setAnalyzing] = useState(false);
    const [compatibilityResult, setCompatibilityResult] = useState(null);
    const hasOfferUploaded = documentStatus.offre_emploi?.uploaded;

    const handleMatch = async () => {
      if (inputType === 'text' && !offerText.trim()) return toast.error('Collez une offre d\'abord');
      if (inputType === 'file' && !hasOfferUploaded) return toast.error('Chargez un fichier d\'abord');

      setAnalyzing(true);
      setCompatibilityResult(null);

      try {
        if (inputType === 'text') {
           // On crée un fichier temporaire pour le texte collé
           const blob = new Blob([offerText], { type: 'text/plain' });
           const file = new File([blob], "offre_collee.txt", { type: "text/plain" });
           await uploadDocument(file, 'offre_emploi');
        }

        // CORRECTION MAJEURE : Appel à la bonne route '/api/services/analyse_emploi'
        const response = await fetch('/api/services/analyse_emploi', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
          },
          body: JSON.stringify({ notes: '' })
        });
        const data = await response.json();
        
        if (data.success) {
          toast.success("Analyse terminée !");
          // CORRECTION : On récupère 'result' car c'est ce que renvoie services_api.py
          setCompatibilityResult(data.result || data.matching);
        } else {
          toast.error("Erreur lors de l'analyse");
        }
      } catch (e) { toast.error("Erreur technique"); } 
      finally { setAnalyzing(false); }
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
          <h2 style={{ fontSize: '1.8rem', color: '#1f2937', marginBottom: '10px' }}>Compatibilité Offre</h2>
        </div>

        {/* INPUT (Caché si analyse affichée, sauf si on veut refaire) */}
        {!compatibilityResult && (
          <div style={styles.inputCard}>
            <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', marginBottom: '20px' }}>
              <button onClick={() => setInputType('text')} style={{...styles.tabButton, borderBottom: inputType === 'text' ? '2px solid #0a6b79' : 'none', color: inputType === 'text' ? '#0a6b79' : '#64748b'}}>
                <FiEdit3 /> Coller texte
              </button>
              <button onClick={() => setInputType('file')} style={{...styles.tabButton, borderBottom: inputType === 'file' ? '2px solid #0a6b79' : 'none', color: inputType === 'file' ? '#0a6b79' : '#64748b'}}>
                <FiPaperclip /> Fichier
              </button>
            </div>

            {inputType === 'text' ? (
              <textarea 
                style={styles.textArea} 
                placeholder="Collez le texte de l'offre ici..." 
                value={offerText} 
                onChange={(e) => setOfferText(e.target.value)} 
              />
            ) : (
              <div style={{ padding: '40px', border: '2px dashed #cbd5e1', borderRadius: '12px', textAlign: 'center', background: '#f8fafc' }}>
                {hasOfferUploaded ? (
                  <div><FiCheck size={30} color="green"/><p>Fichier prêt</p></div>
                ) : (
                  <div><FiUpload size={30} color="gray"/><p>Importer un fichier</p></div>
                )}
                <input type="file" onChange={(e) => handleFileUpload(e, 'offre_emploi')} />
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button onClick={handleMatch} disabled={analyzing} style={styles.primaryButton}>
                {analyzing ? 'Analyse...' : 'Comparer'} <FiArrowRight />
              </button>
            </div>
          </div>
        )}

        {/* RÉSULTAT */}
        {compatibilityResult && (
          <div style={{ marginTop: '20px' }}>
            <div style={{textAlign: 'right', marginBottom: '10px'}}>
               <button onClick={() => setCompatibilityResult(null)} style={{background:'none', border:'none', textDecoration:'underline', cursor:'pointer'}}>Nouvelle recherche</button>
            </div>
            <MatchingAnalysis preloadedData={compatibilityResult} />
          </div>
        )}

        {/* PARTENAIRES */}
        <div style={{ marginTop: '50px', borderTop: '1px solid #e2e8f0', paddingTop: '40px' }}>
          <h3 style={{ textAlign: 'center', color: '#1f2937' }}>Ou testez nos partenaires</h3>
          <PartnerJobs />
        </div>
      </div>
    );
  };

  // --- VUE 2 : PROJET PRO ---
  const ProjectView = () => (
    <div style={styles.subPageContainer}>
      <button onClick={() => setCurrentView('dashboard')} style={styles.backButton}><FiArrowLeft /> Retour</button>
      <div style={{ textAlign: 'center', marginBottom: '30px' }}>
        <div style={{ width: '60px', height: '60px', background: '#fffbeb', color: '#b45309', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '30px', margin: '0 auto 20px auto' }}><FiCompass /></div>
        <h2 style={{ fontSize: '1.8rem', color: '#1f2937' }}>Exploration de Carrière</h2>
      </div>
      <div style={styles.gridTwo}>
        <div style={styles.infoCard}>
          <h3 style={{ color: '#b45309', display: 'flex', alignItems: 'center', gap: '10px' }}><FiActivity /> Compétences clés</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            {['Gestion', 'Communication', 'Analyse'].map(s => <span key={s} style={{background:'#fff7ed', color:'#9a3412', padding:'6px 12px', borderRadius:'20px', fontSize:'0.85rem'}}>{s}</span>)}
          </div>
        </div>
        <div style={styles.infoCard}>
          <h3 style={{ color: '#0a6b79', display: 'flex', alignItems: 'center', gap: '10px' }}><FiBriefcase /> Pistes</h3>
          <p>Métiers suggérés : Chef de projet, Consultant...</p>
        </div>
      </div>
    </div>
  );

  // --- RENDU PRINCIPAL ---
  const styles = {
    container: { minHeight: '100vh', background: '#f8fafc', fontFamily: 'sans-serif', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 20px' },
    mainCard: { background: 'white', borderRadius: '24px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', width: '100%', maxWidth: '1000px', padding: '30px', marginBottom: '30px' },
    primaryButton: { background: '#0a6b79', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' },
    subPageContainer: { width: '100%', maxWidth: '900px', animation: 'fadeIn 0.3s' },
    backButton: { background: 'none', border: 'none', color: '#64748b', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginBottom: '20px' },
    inputCard: { background: 'white', padding: '30px', borderRadius: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' },
    tabButton: { padding: '10px 20px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '600' },
    textArea: { width: '100%', minHeight: '150px', padding: '15px', border: '1px solid #e2e8f0', borderRadius: '8px' },
    gridTwo: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' },
    infoCard: { background: 'white', padding: '25px', borderRadius: '16px', border: '1px solid #e5e7eb' },
    actionCard: { background: 'white', border: '1px solid #e5e7eb', borderRadius: '20px', padding: '30px', cursor: 'pointer', transition: 'all 0.2s' }
  };

  if (currentView === 'match') return <div style={styles.container}><MatchOfferView /></div>;
  if (currentView === 'project') return <div style={styles.container}><ProjectView /></div>;

  return (
    <div style={styles.container}>
      <div style={{ width: '100%', maxWidth: '1000px', marginBottom: '30px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <LogoIcon size={32} /> <h1 style={{ margin: 0, color: '#1f2937' }}>Mon Espace</h1>
      </div>

      <div style={styles.mainCard}>
        {!documentStatus.cv?.uploaded ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <h2>Bonjour !</h2>
            <p>Déposez votre CV pour commencer.</p>
            <input type="file" onChange={(e) => handleFileUpload(e, 'cv')} />
            {isUploading && <p>Analyse...</p>}
          </div>
        ) : (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f0fdf4', padding: '15px', borderRadius: '12px' }}>
               <div style={{display:'flex', gap:'10px', alignItems:'center'}}><FiCheck color="green"/> CV Analysé</div>
               <button onClick={() => setShowAnalysis(!showAnalysis)} style={{background:'none', border:'none', cursor:'pointer', color:'#0a6b79'}}>
                 {showAnalysis ? 'Masquer' : 'Voir'} détails
               </button>
            </div>
            {showAnalysis && <div style={{marginTop:'20px'}}><CVAnalysisDashboard analysisData={cvAnalysis} loading={analysisLoading} /></div>}
          </div>
        )}
      </div>

      {documentStatus.cv?.uploaded && (
        <div style={{ width: '100%', maxWidth: '1000px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
          <div onClick={() => setCurrentView('match')} style={styles.actionCard} className="hover-scale">
            <div style={{background:'#ecfeff', width:'50px', height:'50px', borderRadius:'12px', display:'flex', alignItems:'center', justifyContent:'center', color:'#0a6b79', marginBottom:'15px'}}><FiTarget size={24}/></div>
            <h3>J'ai vu une offre</h3>
            <p style={{color:'#64748b'}}>Analysez votre compatibilité et adaptez votre candidature.</p>
          </div>
          <div onClick={() => setCurrentView('project')} style={styles.actionCard} className="hover-scale">
            <div style={{background:'#fffbeb', width:'50px', height:'50px', borderRadius:'12px', display:'flex', alignItems:'center', justifyContent:'center', color:'#b45309', marginBottom:'15px'}}><FiCompass size={24}/></div>
            <h3>Projet professionnel</h3>
            <p style={{color:'#64748b'}}>Explorez de nouvelles pistes selon vos compétences.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default SimplifiedDashboard;
