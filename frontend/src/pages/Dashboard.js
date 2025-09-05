// REMPLACER frontend/src/pages/Dashboard.js

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import CVAnalysisDashboard from '../components/Analysis/CVAnalysisDashboard';
import { 
  FiMessageSquare, 
  FiFileText, 
  FiZap, 
  FiTarget,
  FiUpload,
  FiMail,
  FiMic,
  FiCpu,
  FiCheckCircle,
  FiUser,
  FiRefreshCw,
  FiArrowRight,
  FiMessageCircle,
  FiArrowLeft,
  FiSave,
  FiX,
  FiTrendingUp,
  FiClock,
  FiEdit3,
  FiSend,
  FiUsers,
  FiDollarSign,
  FiHandHeart,
  FiInfo,
  FiHelpCircle
} from 'react-icons/fi';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import PartnerJobs from '../components/Partners/PartnerJobs';
import SimpleMarkdownRenderer from '../components/Common/SimpleMarkdownRenderer';
import MatchingAnalysis from '../components/Analysis/MatchingAnalysis';
import ActionTile from '../components/Common/ActionTile';
import ServicesGrid from '../components/Services/ServicesGrid';
import ProfileAdviceModal from '../components/Common/ProfileAdviceModal';
import { LogoIcon } from '../components/icons/ModernIcons';



const ServiceCard = ({ title, description, icon, route, color = '#0a6b79', disabled = false, requiredDocs = [], documentStatus }) => {
  const navigate = useNavigate();
  const missingDocs = requiredDocs.filter(doc => !documentStatus[doc]?.uploaded);
  const canAccess = missingDocs.length === 0 && !disabled;
  const handleClick = () => {
    if (canAccess) {
      navigate(route);
    }
  };
  return (
    <div
      onClick={handleClick}
      className={`revolutionary-service-card ${canAccess ? 'accessible' : 'disabled'}`}
      style={{ 
         borderColor: canAccess ? color : '#bbf7d0',
        background: '#f0fdf4',
        '--service-color': color,
        '--service-glow': `${color}40`
      }}
    >
      <div className="revolutionary-service-shine" />
      <div className={`revolutionary-service-icon ${canAccess ? '' : 'disabled'}`} style={{ background: canAccess ? color : '#9ca3af' }}>
        {icon}
      </div>
      <div className="revolutionary-service-content">
        <h4 className={`revolutionary-service-title ${canAccess ? '' : 'disabled'}`}>{title}</h4>
        <p className={`revolutionary-service-description ${canAccess ? '' : 'disabled'}`}>{description}</p>
        {!canAccess && (
          <div className="revolutionary-service-missing">
            <p className="revolutionary-service-missing-text">
              Requis : {missingDocs.join(', ')}
            </p>
          </div>
        )}
        {canAccess && (
          <div className="revolutionary-service-access" style={{ color }}>
            Accéder au service
            <FiArrowRight className="revolutionary-service-arrow" />
          </div>
        )}
      </div>
      <div className="revolutionary-service-particles">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="service-particle" style={{
            '--delay': `${i * 0.3}s`,
            '--x': `${20 + i * 20}%`,
            '--y': `${30 + i * 15}%`
          }} />
        ))}
      </div>
    </div>
  );
};

// Nouveau composant DocumentCard (fusion wow + logique upload)
const DocumentCard = ({
  type,
  title,
  description,
  icon,
  color,
  uploaded,
  fileName,
  onFileUpload,
  onTextClick,
  isTextOnly,
  isUploading
}) => {
  console.log('DocumentCard render', type);
  return (
    <div
      className="document-tile"
      style={{ '--tile-color': color }}
    >
      <div className={`revolutionary-service-icon ${uploaded ? '' : 'disabled'}`} style={{ background: uploaded ? color : '#9ca3af' }}>
        {icon}
      </div>
      <div className="revolutionary-service-content">
        <h4 className={`revolutionary-service-title ${uploaded ? '' : 'disabled'}`}>{title}</h4>
        {description && (
          <p className={`revolutionary-service-description ${uploaded ? '' : 'disabled'}`}>{description}</p>
        )}
        {uploaded && fileName && (
          <div className="revolutionary-service-missing">
            <p className="revolutionary-service-missing-text">📄 {fileName}</p>
          </div>
        )}
        <div className="revolutionary-document-actions" style={{ marginTop: 12 }}>
          {!isTextOnly && (
            <>
              <input
                type="file"
                id={`file-${type}`}
                accept={type === 'cv' ? '.pdf,.doc,.docx' : type === 'offre_emploi' ? '.pdf,.doc,.docx,.txt' : type === 'metier_reconversion' ? '.txt,.pdf' : undefined}
                style={{ display: 'none' }}
                onChange={onFileUpload}
                disabled={isUploading}
              />
              <label htmlFor={`file-${type}`} className="revolutionary-btn-upload" style={{ cursor: isUploading ? 'not-allowed' : 'pointer', opacity: isUploading ? 0.6 : 1 }}>
                <FiUpload /> {uploaded ? 'Remplacer' : 'Uploader'}
              </label>
            </>
          )}
          <button onClick={e => { e.stopPropagation(); console.log('CLICK BTN', type); onTextClick(); }} className="revolutionary-btn-text" disabled={isUploading}>
            <FiEdit3 /> Saisir le texte
          </button>
        </div>
      </div>
    </div>
  );
};

const Dashboard = () => {
  const { user } = useAuth();
  const { documentStatus, loading, uploadDocument, uploadText, executeQuickAction } = useApp();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('documents');
  
  // États questionnaire simple
  const [showQuestionnaireModal, setShowQuestionnaireModal] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState(['', '', '', '', '', '', '', '', '', '']);

  // États pour le modal de texte
  const [showTextModal, setShowTextModal] = useState(null);
  const [textContent, setTextContent] = useState('');

  // État pour le modal de conseils
  const [showAdviceModal, setShowAdviceModal] = useState(false);

  // Questions simples
  const questions = [
    "1. Quelles sont vos 3 principales qualités professionnelles ?",
    "2. Quelles compétences souhaitez-vous développer ?",
    "3. Quel est votre environnement de travail idéal ?",
    "4. Quels secteurs d'activité vous intéressent ?",
    "5. Quelles sont vos contraintes personnelles ?",
    "6. Quel est votre rapport au changement ?",
    "7. Quel est votre style de communication ?",
    "8. Quelles valeurs sont importantes pour vous au travail ?",
    "9. Quel est votre objectif professionnel à 5 ans ?",
    "10. Autres informations importantes ?"
  ];

  // Types de documents
  const documentTypes = [
    {
      id: 'cv',
      title: 'Mon CV',
      description: 'Document essentiel pour l\'analyse',
      icon: <FiFileText />,
      color: '#0a6b79'
    },
    {
      id: 'offre_emploi',
      title: 'Offre d\'emploi',
      description: 'Pour l\'évaluation de compatibilité',
      icon: <FiTarget />,
      color: '#22c55e'
    },
    {
      id: 'questionnaire',
      title: 'Questionnaire personnel',
      description: 'Vos objectifs et aspirations',
      icon: <FiUser />,
      color: '#f59e0b'
    },

  ];

  // Actions rapides
  const quickActions = [
    { id: 'analyser_cv', title: 'Analyser mon CV', icon: <FiFileText />, requiresCV: true },
    { id: 'compatibilite', title: 'Compatibilité offre', icon: <FiTarget />, requiresCV: true, requiresOffer: true },
    { id: 'cv_ats_optimization', title: 'Adaptez votre CV aux ATS', icon: <FiCpu />, requiresCV: true, requiresOffer: true },
    { id: 'lettre_motivation', title: 'Lettre de motivation', icon: <FiMail />, requiresCV: true },
    { id: 'entretien', title: 'Préparer entretien', icon: <FiMic />, requiresCV: true },
  ];

  // Calculer le nombre de documents uploadés (CV, questionnaire, offre d'emploi seulement)
  const relevantDocuments = ['cv', 'questionnaire', 'offre_emploi'];
  const documentsCount = relevantDocuments.filter(docType => documentStatus[docType]?.uploaded).length;

  // Gérer l'upload de texte
  const handleTextUpload = async () => {
    if (!textContent.trim()) {
      toast.error('Veuillez saisir du texte');
      return;
    }

    try {
      const result = await uploadText(textContent.trim(), showTextModal);
      if (result.success) {
        toast.success(`${showTextModal === 'cv' ? 'CV' : 'Document'} enregistré avec succès !`);
        setShowTextModal(null);
        setTextContent('');

        // Déclencher automatiquement l'analyse de compatibilité si une offre d'emploi a été saisie
        // et que le CV est déjà présent
        if (showTextModal === 'offre_emploi' && documentStatus.cv?.uploaded) {
          try {
            setCompatLoading(true);
            setCompatError(null);
            const response = await fetch('/api/actions/compatibility', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
              },
              body: JSON.stringify({ service_id: 'matching_cv_offre' })
            });
            const data = await response.json();
            if (
              response.ok &&
              data.success &&
              (data.matching || data.compatibility || data.analysis || data.result || data.content)
            ) {
              setCompatAnalysis(
                data.matching || data.compatibility || data.analysis || data.result || data.content
              );
            } else {
              setCompatError(data.error || "Erreur lors de l'analyse de compatibilité");
              setCompatAnalysis(null);
            }
          } catch (err) {
            setCompatError("Erreur lors de l'analyse de compatibilité");
            setCompatAnalysis(null);
          } finally {
            setCompatLoading(false);
          }
        }
      }
    } catch (error) {
      toast.error('Erreur lors de l\'enregistrement');
    }
  };

  // Gérer l'upload de fichier
  const handleFileUpload = async (event, docType) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const result = await uploadDocument(file, docType);
      if (result.success) {
        toast.success(`${docType === 'cv' ? 'CV' : 'Document'} uploadé avec succès !`);
        // Déclencher l'analyse de CV si c'est un CV
        if (docType === 'cv') {
          console.log('🚀 Déclenchement analyse automatique CV...');
          console.log('📊 État documentStatus complet:', documentStatus);
          console.log('📊 État documentStatus.cv:', documentStatus.cv);
          console.log('📊 documentStatus.cv?.uploaded:', documentStatus.cv?.uploaded);
          console.log('📊 Type de docType:', docType);
          
          // ✅ CORRIGÉ : Attendre un délai pour éviter la race condition
          console.log('⏳ Attente de 1 seconde pour synchronisation...');
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          setCvAnalysisLoading(true);
          setCvAnalysisError(null);
          try {
            console.log('📡 Appel API /api/actions/analyze-cv...');
            const response = await fetch('/api/actions/analyze-cv', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
              },
              body: JSON.stringify({ 
                service_id: 'analyze_cv',
                force_new: true  // Forcer une nouvelle analyse
              })
            });
            const data = await response.json();
            if (response.ok && data.success && (data.analysis || data.result || data.content)) {
              setCvAnalysis(data.analysis || data.result || data.content);
            } else {
              setCvAnalysisError(data.error || 'Erreur lors de l’analyse du CV');
              setCvAnalysis(null);
            }
          } catch (err) {
            setCvAnalysisError('Erreur lors de l’analyse du CV');
            setCvAnalysis(null);
          } finally {
            setCvAnalysisLoading(false);
          }
        }

        // Déclencher l'analyse de compatibilité si une offre est chargée
        if (docType === 'offre_emploi' && documentStatus.cv?.uploaded) {
          // ✅ CORRIGÉ : Attendre un délai pour éviter la race condition
          console.log('⏳ Attente de 1 seconde pour synchronisation compatibilité...');
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          setCompatLoading(true);
          setCompatError(null);
          try {
            const response = await fetch('/api/actions/compatibility', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
              },
              body: JSON.stringify({ service_id: 'matching_cv_offre' })
            });
            const data = await response.json();
            if (
              response.ok &&
              data.success &&
              (data.matching || data.compatibility || data.analysis || data.result || data.content)
            ) {
              setCompatAnalysis(
                data.matching || data.compatibility || data.analysis || data.result || data.content
              );
            } else {
              setCompatError(data.error || "Erreur lors de l'analyse de compatibilité");
              setCompatAnalysis(null);
            }
          } catch (err) {
            setCompatError("Erreur lors de l'analyse de compatibilité");
            setCompatAnalysis(null);
          } finally {
            setCompatLoading(false);
          }
        }
      }
    } catch (error) {
      toast.error('Erreur lors de l\'upload');
    }
  };

  // Gérer le questionnaire
  const handleQuestionnaireSubmit = async () => {
    try {
      // Vérifier qu'au moins quelques questions sont remplies
      const filledAnswers = answers.filter(answer => answer.trim()).length;
      
      if (filledAnswers < 3) {
        toast.error('Veuillez remplir au moins 3 questions pour enrichir votre profil');
        return;
      }

      // Créer le texte du questionnaire
      const questionnaireText = questions.map((question, index) => {
        if (answers[index].trim()) {
          return `${question}\n${answers[index].trim()}`;
        }
        return null;
      }).filter(Boolean).join('\n\n');

      // Envoyer au backend
      const result = await uploadText(questionnaireText, 'questionnaire');
      
      if (result.success) {
        toast.success('Questionnaire enregistré avec succès !');
        setShowQuestionnaireModal(false);
        setCurrentQuestion(0);
        setAnswers(['', '', '', '', '', '', '', '', '', '']);
      }
    } catch (error) {
      console.error('Erreur questionnaire:', error);
      toast.error('Erreur lors de l\'enregistrement');
    }
  };

  // Navigation questionnaire
  const nextQuestion = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  const prevQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  // Gérer les actions rapides
  const handleQuickAction = async (actionId) => {
    try {
      await executeQuickAction(actionId);
    } catch (error) {
      toast.error('Erreur lors de l\'exécution de l\'action');
    }
  };

  const tabs = [
    { id: 'documents', label: 'Mes documents', mobileLabel: 'Docs', icon: <FiFileText />, route: null },
    { id: 'evaluate', label: 'Évaluer une offre', mobileLabel: 'Offre', icon: <FiTarget />, route: null },
    { id: 'improve', label: 'Améliorer mon CV', mobileLabel: 'CV', icon: <FiTrendingUp />, route: null },
    { id: 'apply', label: 'Candidater', mobileLabel: 'Candidature', icon: <FiMail />, route: null },
    { id: 'interview', label: "Préparer l'entretien", mobileLabel: 'Entretien', icon: <FiMic />, route: null },
    { id: 'change', label: 'Tout changer', mobileLabel: 'Reconversion', icon: <FiRefreshCw />, route: null }
  ];

  // États pour l'analyse de CV
  const [cvAnalysis, setCvAnalysis] = useState(() => {
    // Charger depuis le localStorage si dispo
    try {
      const saved = localStorage.getItem('cvAnalysis');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [cvAnalysisLoading, setCvAnalysisLoading] = useState(false);
  const [cvAnalysisError, setCvAnalysisError] = useState(null);

  // États pour l'analyse de compatibilité
  const [compatAnalysis, setCompatAnalysis] = useState(() => {
    try {
      const saved = localStorage.getItem('compatAnalysis');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [compatLoading, setCompatLoading] = useState(false);
  const [compatError, setCompatError] = useState(null);

  React.useEffect(() => {
    if (compatAnalysis && documentStatus.cv?.uploaded && documentStatus.offre_emploi?.uploaded) {
      localStorage.setItem('compatAnalysis', JSON.stringify(compatAnalysis));
    }
  }, [compatAnalysis, documentStatus.cv?.uploaded, documentStatus.offre_emploi?.uploaded]);

  React.useEffect(() => {
    if (!documentStatus.offre_emploi?.uploaded) {
      setCompatAnalysis(null);
      localStorage.removeItem('compatAnalysis');
    }
  }, [documentStatus.offre_emploi?.uploaded]);

  // Persister l'analyse de CV à chaque changement
  React.useEffect(() => {
    if (cvAnalysis && documentStatus.cv?.uploaded) {
      localStorage.setItem('cvAnalysis', JSON.stringify(cvAnalysis));
    }
  }, [cvAnalysis, documentStatus.cv?.uploaded]);

  // Nettoyage de l'analyse de CV uniquement lors du chargement d'un nouveau document
  // ou lorsque l'utilisateur supprime réellement son CV. L'analyse persiste sinon.

  return (
    <div style={{ 
      background: 'white', 
      minHeight: '100vh',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      {/* Header moderne dans un pavé vert */}
      <div style={{ 
        paddingTop: '2rem',
        paddingBottom: '2rem'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 2rem' }}>
          <div style={{
            background: 'linear-gradient(135deg, #0a6b79 0%, #27a2b4 100%)',
            borderRadius: '20px',
            padding: '2rem',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
            marginBottom: '2rem'
          }}>
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <h1 style={{ 
                fontSize: '3rem',
                fontWeight: '700',
                color: 'white',
                margin: '0 0 1.5rem 0',
                lineHeight: '1.2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '1rem'
              }}>
                <LogoIcon size={48} />
                Bienvenue dans votre espace de carrière
              </h1>
              <p style={{ 
                fontSize: '1.2rem',
                color: 'rgba(255, 255, 255, 0.9)',
                margin: '0',
                fontWeight: '400'
              }}>
                Trouvez l'emploi de vos rêves avec votre coach IA
              </p>
            </div>

            {/* Barre d'onglets en haut */}
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '0.5rem',
              marginTop: '2rem'
            }}>
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                  }}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.75rem 1rem',
                    borderRadius: '12px',
                    border: 'none',
                    background: activeTab === tab.id 
                      ? 'white' 
                      : 'rgba(255, 255, 255, 0.1)',
                    color: activeTab === tab.id ? '#0a6b79' : 'white',
                    fontWeight: '600',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    minWidth: '80px'
                  }}
                  onMouseEnter={(e) => {
                    if (activeTab !== tab.id) {
                      e.target.style.background = 'rgba(255, 255, 255, 0.2)';
                      e.target.style.color = 'white';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (activeTab !== tab.id) {
                      e.target.style.background = 'rgba(255, 255, 255, 0.1)';
                      e.target.style.color = 'white';
                    }
                  }}
                >
                  <span style={{ fontSize: '1.2rem' }}>{tab.icon}</span>
                  <span style={{ 
                    fontSize: '0.7rem',
                    textAlign: 'center',
                    lineHeight: '1.2'
                  }}>
                    {window.innerWidth > 768 ? tab.label : tab.mobileLabel}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Contenu principal */}
      <div style={{ 
        maxWidth: '1200px', 
        margin: '0 auto', 
        padding: '2rem',
        background: 'transparent'
      }}>
        {/* Section Documents harmonisée - onglet documents */}
        {activeTab === 'documents' && (
        <div style={{
          background: 'linear-gradient(135deg, #0a6b79 0%, #27a2b4 100%)',
          borderRadius: '20px',
          padding: '2rem',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
          marginBottom: '2rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
            <h2 style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.75rem', 
              margin: 0,
              color: 'white',
              fontSize: '1.5rem',
              fontWeight: '600'
            }}>
              <LogoIcon size={24} />
              Vos Documents pour personnaliser l'analyse
            </h2>
            <button 
              onClick={() => setShowAdviceModal(true)}
              style={{
                background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
                color: '#92400e',
                border: 'none',
                padding: '0.75rem 1.5rem',
                borderRadius: '8px',
                fontWeight: '600',
                cursor: 'pointer',
                fontSize: '0.9rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                transition: 'all 0.2s ease'
              }}
            >
              <FiHelpCircle />
              Conseils pour optimiser mon profil
            </button>
          </div>

          

          {/* Boutons d'upload opérationnels */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
            {/* CV */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '12px',
              padding: '1.5rem',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              {/* Input caché pour l'upload de CV */}
              <input
                type="file"
                id="cv-upload"
                accept=".pdf,.doc,.docx"
                style={{ display: 'none' }}
                onChange={e => handleFileUpload(e, 'cv')}
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
           <div style={{
             width: '48px',
             height: '48px',
             borderRadius: '12px',
             background: documentStatus.cv?.uploaded ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)' : 'rgba(255, 255, 255, 0.1)',
             display: 'flex',
             alignItems: 'center',
             justifyContent: 'center',
             fontSize: '1.5rem',
             color: 'white'
           }}>
             <FiMessageCircle />
           </div>
                <div>
                  <h3 style={{ color: 'white', margin: '0 0 0.25rem 0', fontSize: '1.1rem', fontWeight: '600' }}>CV</h3>
                  <p style={{ color: 'rgba(255, 255, 255, 0.6)', margin: 0, fontSize: '0.9rem' }}>
                    {documentStatus.cv?.uploaded ? 'Document chargé' : 'Aucun document'}
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button 
                  onClick={() => document.getElementById('cv-upload')?.click()}
                  style={{
                    flex: 1,
                    background: '#c7356c',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '0.75rem',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem'
                  }}
                >
                  <FiUpload />
                  Télécharger
                </button>
                <button 
                  onClick={() => setShowTextModal('cv')}
                  style={{
                    flex: 1,
                    background: '#0a6b79',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '0.75rem',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem'
                  }}
                >
                  <FiEdit3 />
                  Copier/Coller
                </button>
              </div>
            </div>

            {/* Offre d'emploi */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '12px',
              padding: '1.5rem',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              {/* Input caché pour l'upload d'offre d'emploi */}
              <input
                type="file"
                id="offre-upload"
                accept=".pdf,.doc,.docx,.txt"
                style={{ display: 'none' }}
                onChange={e => handleFileUpload(e, 'offre_emploi')}
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
           <div style={{
             width: '48px',
             height: '48px',
             borderRadius: '12px',
             background: documentStatus.offre_emploi?.uploaded ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)' : 'rgba(255, 255, 255, 0.1)',
             display: 'flex',
             alignItems: 'center',
             justifyContent: 'center',
             fontSize: '1.5rem',
             color: 'white'
           }}>
             <FiMessageCircle />
           </div>
                <div>
                  <h3 style={{ color: 'white', margin: '0 0 0.25rem 0', fontSize: '1.1rem', fontWeight: '600' }}>Offre d'emploi</h3>
                  <p style={{ color: 'rgba(255, 255, 255, 0.6)', margin: 0, fontSize: '0.9rem' }}>
                    {documentStatus.offre_emploi?.uploaded ? 'Document chargé' : 'Aucun document'}
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button 
                  onClick={() => document.getElementById('offre-upload')?.click()}
                  style={{
                    flex: 1,
                    background: '#c7356c',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '0.75rem',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem'
                  }}
                >
                  <FiUpload />
                  Télécharger
                </button>
                <button 
                  onClick={() => setShowTextModal('offre_emploi')}
                  style={{
                    flex: 1,
                    background: '#0a6b79',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '0.75rem',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem'
                  }}
                >
                  <FiEdit3 />
                  Copier/Coller
                </button>
              </div>
            </div>

            {/* Questionnaire */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '12px',
              padding: '1.5rem',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
                       <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
           <div style={{
             width: '48px',
             height: '48px',
             borderRadius: '12px',
             background: documentStatus.questionnaire?.uploaded ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)' : 'rgba(255, 255, 255, 0.1)',
             display: 'flex',
             alignItems: 'center',
             justifyContent: 'center',
             fontSize: '1.5rem',
             color: 'white'
           }}>
             <FiMessageCircle />
           </div>
                <div>
                  <h3 style={{ color: 'white', margin: '0 0 0.25rem 0', fontSize: '1.1rem', fontWeight: '600' }}>Questionnaire</h3>
                  <p style={{ color: 'rgba(255, 255, 255, 0.6)', margin: 0, fontSize: '0.9rem' }}>
                    {documentStatus.questionnaire?.uploaded ? 'Réponses enregistrées' : 'Non rempli'}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowQuestionnaireModal(true)}
                style={{
                  width: '100%',
                  background: '#f59e0b',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '0.75rem',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem'
                }}
              >
                <FiEdit3 />
                Remplir le questionnaire
              </button>
            </div>
          </div>


          {/* Analyse de CV avec nouveau dashboard */}
          {cvAnalysis && documentStatus.cv?.uploaded && (
            <CVAnalysisDashboard 
              analysisData={cvAnalysis}
              loading={cvAnalysisLoading}
              error={cvAnalysisError}
              onStartNextStep={() => {
                // Logique pour passer à l'étape suivante
                console.log('Démarrage de l\'étape suivante');
              }}
            />
          )}
          {cvAnalysisLoading && documentStatus.cv?.uploaded && !cvAnalysis && (
            <CVAnalysisDashboard 
              analysisData={null}
              loading={true}
              error={null}
              onStartNextStep={() => {}}
            />
          )}
          {cvAnalysisError && documentStatus.cv?.uploaded && !cvAnalysis && (
            <CVAnalysisDashboard 
              analysisData={null}
              loading={false}
              error={cvAnalysisError}
              onStartNextStep={() => {}}
            />
          )}

          {/* Analyse de compatibilité */}
          {compatAnalysis && documentStatus.cv?.uploaded && documentStatus.offre_emploi?.uploaded && (
            <div style={{ margin: '2rem 0' }}>
              <h3 className="revolutionary-section-title" style={{ fontSize: '1.3rem', marginBottom: 12 }}>
                🎯 Analyse de la compatibilité entre votre CV et l'offre chargée
              </h3>
              {compatLoading && <div>Analyse en cours...</div>}
              {compatError && <div style={{ color: '#dc2626' }}>{compatError}</div>}
              {!compatLoading && !compatError && (
                <MatchingAnalysis preloadedData={compatAnalysis} hideButton={true} />
              )}
            </div>
          )}

          {/* Section partenaires */}
          <div style={{ margin: '2.5rem 0' }}>
            <h2 className="revolutionary-section-title" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <LogoIcon size={36} />
              Testez votre compatibilité avec les métiers de nos partenaires
            </h2>
            <p style={{ color: 'white', marginBottom: '1rem', fontSize: '1rem', lineHeight: '1.5' }}>
            Sélectionnez un des métiers que recrutent nos partenaires, il est peut-être fait pour vous! Iamonjob va tester votre compatibilité et vous préparer à candidater.
            </p>
            <PartnerJobs />
          </div>
        </div>
        )}

        {/* Autres onglets avec le même style */}
        {activeTab === 'evaluate' && (
          <div style={{
            background: 'linear-gradient(135deg, #0a6b79 0%, #27a2b4 100%)',
            borderRadius: '20px',
            padding: '2rem',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
          }}>
            <h2 style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.75rem',
              color: 'white',
              fontSize: '1.5rem',
              fontWeight: '600',
              marginBottom: '2rem'
            }}>
              <LogoIcon size={24} />
              Évaluer une offre
            </h2>
            <ServicesGrid filterTheme="evaluate_offer" />
            {/* Section partenaires */}
            <div style={{ margin: '2.5rem 0' }}>
              <h2 className="revolutionary-section-title" style={{ 
                marginBottom: '1.5rem', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.75rem',
                fontSize: '1.5rem',
                fontWeight: '600'
              }}>
                🤝 Testez votre compatibilité avec les métiers de nos partenaires
              </h2>
              <PartnerJobs />
            </div>
          </div>
        )}

        {activeTab === 'improve' && (
          <div style={{
            background: 'linear-gradient(135deg, #0a6b79 0%, #27a2b4 100%)',
            borderRadius: '20px',
            padding: '2rem',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
          }}>
            <h2 style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.75rem',
              color: 'white',
              fontSize: '1.5rem',
              fontWeight: '600',
              marginBottom: '2rem'
            }}>
              <LogoIcon size={24} />
              Améliorer mon CV
            </h2>
            <ServicesGrid filterTheme="improve_cv" />
          </div>
        )}

        {activeTab === 'apply' && (
          <div style={{
            background: 'linear-gradient(135deg, #0a6b79 0%, #27a2b4 100%)',
            borderRadius: '20px',
            padding: '2rem',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
          }}>
            <h2 style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.75rem',
              color: 'white',
              fontSize: '1.5rem',
              fontWeight: '600',
              marginBottom: '2rem'
            }}>
              <LogoIcon size={24} />
              Candidater
            </h2>
            <ServicesGrid filterTheme="apply_jobs" />
          </div>
        )}

        {activeTab === 'interview' && (
          <div style={{
            background: 'linear-gradient(135deg, #0a6b79 0%, #27a2b4 100%)',
            borderRadius: '20px',
            padding: '2rem',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
          }}>
            <h2 style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.75rem',
              color: 'white',
              fontSize: '1.5rem',
              fontWeight: '600',
              marginBottom: '2rem'
            }}>
              <LogoIcon size={24} />
              Préparer l'entretien
            </h2>
            <ServicesGrid filterTheme="interview_prep" />
          </div>
        )}

        {activeTab === 'change' && (
          <div style={{
            background: 'linear-gradient(135deg, #0a6b79 0%, #27a2b4 100%)',
            borderRadius: '20px',
            padding: '2rem',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
          }}>
            <h2 style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.75rem',
              color: 'white',
              fontSize: '1.5rem',
              fontWeight: '600',
              marginBottom: '2rem'
            }}>
              <LogoIcon size={24} />
              Tout changer
            </h2>
            <ServicesGrid filterTheme="career_project" />
          </div>
        )}
      </div>



      {/* Modal Questionnaire */}
      {showQuestionnaireModal && (
        <div className="dashboard-modal-overlay">
          <div className="dashboard-modal-content">
            {/* Header */}
            <div className="dashboard-modal-header">
              <h3>
                🤔 Questionnaire personnel ({currentQuestion + 1}/{questions.length})
              </h3>
              <button
                onClick={() => setShowQuestionnaireModal(false)}
                className="dashboard-modal-close"
              >
                <FiX />
              </button>
            </div>
            {/* Contenu */}
            <div className="dashboard-modal-body">
              <div className="dashboard-modal-info">
                <FiUser style={{ color: '#0a6b79' }} />
                <p>
                  Répondez aux questions pour personnaliser vos recommandations
                </p>
              </div>
              <div className="dashboard-modal-question">
                <label>
                  {questions[currentQuestion]}
                </label>
                <textarea
                  value={answers[currentQuestion]}
                  onChange={(e) => {
                    const newAnswers = [...answers];
                    newAnswers[currentQuestion] = e.target.value;
                    setAnswers(newAnswers);
                  }}
                  rows={4}
                  className="dashboard-modal-textarea"
                  placeholder="Tapez votre réponse ici..."
                />
              </div>
              {/* Navigation */}
              <div className="dashboard-modal-nav">
                <button
                  onClick={prevQuestion}
                  disabled={currentQuestion === 0}
                  className={`dashboard-modal-btn${currentQuestion === 0 ? ' disabled' : ''}`}
                >
                  <FiArrowLeft /> Précédent
                </button>
                <div className="dashboard-modal-dots">
                  {questions.map((_, index) => (
                    <div
                      key={index}
                      className={`dashboard-modal-dot${index === currentQuestion ? ' active' : answers[index].trim() ? ' filled' : ''}`}
                    />
                  ))}
                </div>
                {currentQuestion === questions.length - 1 ? (
                  <button
                    onClick={handleQuestionnaireSubmit}
                    disabled={loading}
                    className={`dashboard-modal-btn${loading ? ' disabled' : ''}`}
                  >
                    <FiSave /> {loading ? 'Enregistrement...' : 'Terminer'}
                  </button>
                ) : (
                  <button
                    onClick={nextQuestion}
                    className="dashboard-modal-btn"
                  >
                    Suivant <FiArrowRight />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de saisie de texte */}
      {showTextModal && (
        <div className="dashboard-modal-overlay">
          <div className="dashboard-modal-content">
            {/* Header */}
            <div className="dashboard-modal-header">
              <h3>
                📝 Saisir le texte - {documentTypes.find(d => d.id === showTextModal)?.title}
              </h3>
              <button
                onClick={() => {
                  setShowTextModal(null);
                  setTextContent('');
                }}
                className="dashboard-modal-close"
              >
                <FiX />
              </button>
            </div>
            {/* Contenu */}
            <div className="dashboard-modal-body">
              <div className="dashboard-modal-info">
                <FiFileText style={{ color: '#0a6b79' }} />
                <p>
                  {showTextModal === 'cv' 
                    ? 'Copiez-collez le contenu de votre CV ici'
                    : showTextModal === 'offre_emploi'
                    ? 'Copiez-collez le texte de l\'offre d\'emploi ici'
                    : 'Copiez-collez le texte de votre document ici'
                  }
                </p>
              </div>
              <textarea
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                placeholder={`Collez le texte de votre ${
                  showTextModal === 'cv' ? 'CV' : 
                  showTextModal === 'offre_emploi' ? 'offre d\'emploi' : 
                  'document'
                } ici...`}
                className="dashboard-modal-textarea dashboard-modal-textarea-large"
              />
              <div className="dashboard-modal-actions">
                <button
                  onClick={() => {
                    setShowTextModal(null);
                    setTextContent('');
                  }}
                  className="dashboard-modal-btn"
                >
                  Annuler
                </button>
                <button
                  onClick={handleTextUpload}
                  disabled={loading || !textContent.trim()}
                  className={`dashboard-modal-btn${(!textContent.trim() || loading) ? ' disabled' : ''}`}
                >
                  <FiSave /> {loading ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de conseils pour optimiser le profil */}
      <ProfileAdviceModal 
        isOpen={showAdviceModal} 
        onClose={() => setShowAdviceModal(false)} 
      />
    </div>
  );
};

export default Dashboard;
