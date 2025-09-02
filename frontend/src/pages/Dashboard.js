// REMPLACER frontend/src/pages/Dashboard.js

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
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
              body: JSON.stringify({ service_id: 'analyze_cv' })
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
    { id: 'documents', label: 'Mes documents', mobileLabel: 'Docs', icon: <FiFileText /> },
    { id: 'evaluate', label: 'Évaluer une offre', mobileLabel: 'Offre', icon: <FiTarget /> },
    { id: 'improve', label: 'Améliorer mon CV', mobileLabel: 'CV', icon: <FiTrendingUp /> },
    { id: 'apply', label: 'Candidater', mobileLabel: 'Candidature', icon: <FiMail /> },
    { id: 'interview', label: "Préparer l'entretien", mobileLabel: 'Entretien', icon: <FiMic /> },
    { id: 'change', label: 'Tout changer', mobileLabel: 'Reconversion', icon: <FiRefreshCw /> }
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
    <div className="revolutionary-dashboard" style={{ background: 'var(--primary-color)', minHeight: '100vh' }}>
      {/* Header */}
      <div className="dashboard-header" style={{ marginTop: '3.5rem' }}>
        <h1 style={{ 
          background: 'linear-gradient(135deg, #ffffff 0%, #86efac 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          textShadow: '0 2px 8px rgba(0,0,0,0.10)'
        }}>
          👋 Bienvenue dans votre espace personnel
        </h1>
      </div>

      {/* Navigation par onglets */}
      <div className="revolutionary-tabs-container">
        <div className="revolutionary-tabs">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`revolutionary-tab-button${activeTab === tab.id ? ' active' : ''}`}
            >
              <span className="revolutionary-tab-icon desktop-only">{tab.icon}</span>
              <span className="revolutionary-tab-label desktop-only">{tab.label}</span>
              <span className="revolutionary-tab-label-mobile">{tab.mobileLabel}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Documents visibles UNIQUEMENT dans l'onglet Documents */}
      {activeTab === 'documents' && (
        <div className="revolutionary-tab-content">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
            <h2 className="revolutionary-section-title" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: 0 }}>
              <LogoIcon size={36} />
              Mes Documents - pour personnaliser l'analyse
            </h2>
            <button 
              onClick={() => setShowAdviceModal(true)}
              className="revolutionary-btn-advice"
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

          {/* Barre de progression optimisée - masquée en mobile */}
          <div className="revolutionary-progress-panel desktop-only">
            <div className="revolutionary-progress-header">
              <h3 className="revolutionary-progress-title">🎯 Progression de votre profil</h3>
              <span className="revolutionary-progress-badge">
                {documentsCount}/3 documents
              </span>
            </div>
            <div className="revolutionary-progress-bar-container">
              <div 
                className="revolutionary-progress-bar"
                style={{ width: `${(documentsCount / 3) * 100}%` }}
              />
            </div>
            <p className="revolutionary-progress-message">
              {documentsCount === 0 && "🚀 Commencez par votre CV pour débloquer toutes les fonctionnalités"}
              {documentsCount === 1 && "👍 Excellent ! Ajoutez une offre d'emploi pour l'analyse de compatibilité"}
              {documentsCount === 2 && "🎉 Presque fini ! Le questionnaire enrichira votre profil"}
              {documentsCount === 3 && "✨ Félicitations ! Votre profil est complet"}
            </p>
          </div>

          {/* Grille magazine : Desktop 3 pavés + conseils, Mobile 2 pavés par ligne */}
          <div className="dashboard-grid">
            <div style={{ gridArea: 'cv' }}>
              <DocumentCard
                type="cv"
                title="Mon CV"
                icon={<FiFileText />}
                color="#0a6b79"
                uploaded={!!documentStatus.cv?.uploaded}
                fileName={documentStatus.cv?.name}
                onFileUpload={(e) => handleFileUpload(e, 'cv')}
                onTextClick={() => setShowTextModal('cv')}
                isTextOnly={false}
                isUploading={loading}
              />
            </div>
            <div style={{ gridArea: 'questionnaire' }}>
              <DocumentCard
                type="questionnaire"
                title="Questionnaire personnel"
                icon={<FiUser />}
                color="#f59e0b"
                uploaded={!!documentStatus.questionnaire?.uploaded}
                fileName={documentStatus.questionnaire?.name}
                onFileUpload={undefined}
                onTextClick={() => setShowQuestionnaireModal(true)}
                isTextOnly={true}
                isUploading={loading}
              />
            </div>
            <div style={{ gridArea: 'offre' }}>
              <DocumentCard
                type="offre_emploi"
                title="Offre d'emploi"
                icon={<FiTarget />}
                color="#22c55e"
                uploaded={!!documentStatus.offre_emploi?.uploaded}
                fileName={documentStatus.offre_emploi?.name}
                onFileUpload={(e) => handleFileUpload(e, 'offre_emploi')}
                onTextClick={() => setShowTextModal('offre_emploi')}
                isTextOnly={false}
                isUploading={loading}
              />
            </div>


          </div>
          {/* Analyse de CV automatique */}
          {cvAnalysis && (
            <div style={{ margin: '2rem 0' }}>
              <h3 className="revolutionary-section-title" style={{ fontSize: '1.3rem', marginBottom: 12, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <LogoIcon size={32} />
                Analyse automatique de votre CV
              </h3>
              <SimpleMarkdownRenderer content={cvAnalysis} serviceType="analyze_cv" />
            </div>
          )}
          {cvAnalysisLoading && documentStatus.cv?.uploaded && <div>Analyse en cours...</div>}
          {cvAnalysisError && documentStatus.cv?.uploaded && <div style={{ color: '#dc2626' }}>{cvAnalysisError}</div>}

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

      {/* Contenu des onglets */}
      <div>


        {activeTab === 'evaluate' && (
          <div className="revolutionary-tab-content">
            <h2 className="revolutionary-section-title" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <LogoIcon size={32} />
              Évaluer une offre
            </h2>
            <ServicesGrid filterTheme="evaluate_offer" />
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

        {activeTab === 'improve' && (
          <div className="revolutionary-tab-content">
            <h2 className="revolutionary-section-title" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <LogoIcon size={32} />
              Améliorer son CV
            </h2>
            <ServicesGrid filterTheme="improve_cv" />
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

        {activeTab === 'apply' && (
          <div className="revolutionary-tab-content">
            <h2 className="revolutionary-section-title" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <LogoIcon size={32} />
              Candidater
            </h2>
            <ServicesGrid filterTheme="apply_jobs" />
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

        {activeTab === 'interview' && (
          <div className="revolutionary-tab-content">
            <h2 className="revolutionary-section-title" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <LogoIcon size={32} />
              Préparer l'entretien
            </h2>
            <ServicesGrid filterTheme="interview_prep" />
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

        {activeTab === 'change' && (
          <div className="revolutionary-tab-content">
            <h2 className="revolutionary-section-title" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <LogoIcon size={32} />
              Tout changer
            </h2>
            <p className="revolutionary-section-description">Explorez de nouvelles opportunités de carrière</p>
            <ServicesGrid filterTheme="career_project" />
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
