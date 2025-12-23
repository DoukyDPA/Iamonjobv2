import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { FiFileText, FiUploadCloud, FiClipboard, FiTarget, FiCompass, FiCheck } from 'react-icons/fi';
import './Dashboard.css';

const Dashboard = () => {
  const { user } = useAuth();
  const { documentStatus } = useApp();
  const navigate = useNavigate();

  const firstName = user?.email?.split('@')[0] || 'Candidat';

  // Helpers pour l'état des documents
  const isCvOk = documentStatus?.cv?.uploaded;
  const isOfferOk = documentStatus?.offre_emploi?.uploaded;
  const isQuizOk = false; // À connecter plus tard

  // Navigation vers la MindMap
  const goToMindMap = (mode) => {
    navigate('/mindmap', { state: { mode } });
  };

  return (
    <div className="dashboard-container">
      
      {/* HEADER */}
      <div className="dashboard-welcome">
        <h1>Tableau de bord de {firstName}</h1>
        <p className="subtitle">Préparez vos documents, puis choisissez votre stratégie.</p>
      </div>

      {/* SECTION 1 : MES MUNITIONS (Documents) */}
      <h3 className="section-title">1. Mes Munitions</h3>
      <div className="resources-grid">
        
        {/* CARTE CV */}
        <div className={`resource-card ${isCvOk ? 'done' : ''}`} onClick={() => navigate('/documents')}>
          <div className="resource-icon-bg">
            {isCvOk ? <FiCheck /> : <FiUploadCloud />}
          </div>
          <div className="resource-info">
            <h4>Mon CV</h4>
            <p>{isCvOk ? "Chargé et prêt" : "À télécharger pour activer l'IA"}</p>
          </div>
        </div>

        {/* CARTE OFFRE */}
        <div className={`resource-card ${isOfferOk ? 'done' : ''}`} onClick={() => navigate('/documents')}>
          <div className="resource-icon-bg">
            {isOfferOk ? <FiCheck /> : <FiFileText />}
          </div>
          <div className="resource-info">
            <h4>L'Offre visée</h4>
            <p>{isOfferOk ? "Chargée et prête" : "Copiez/collez ou uploadez l'offre"}</p>
          </div>
        </div>

        {/* CARTE QUESTIONNAIRE */}
        <div className={`resource-card ${isQuizOk ? 'done' : ''}`} onClick={() => alert("Questionnaire bientôt disponible")}>
          <div className="resource-icon-bg">
            <FiClipboard />
          </div>
          <div className="resource-info">
            <h4>Mon Profil</h4>
            <p>Questionnaire de personnalité</p>
          </div>
        </div>

      </div>

      {/* SECTION 2 : MES OBJECTIFS (Mind Maps) */}
      <h3 className="section-title" style={{ marginTop: '3rem' }}>2. Mon Objectif</h3>
      <div className="goals-grid">
        
        {/* OBJECTIF 1 : OFFRE */}
        <div className="goal-card primary" onClick={() => goToMindMap('offer')}>
          <div className="goal-content">
            <div className="goal-icon"><FiTarget /></div>
            <div>
              <h3>Répondre à une offre</h3>
              <p>Matching, analyse d'écarts, lettre de motivation...</p>
            </div>
          </div>
          <div className="goal-action">Voir le plan d'action →</div>
        </div>

        {/* OBJECTIF 2 : RECONVERSION */}
        <div className="goal-card secondary" onClick={() => goToMindMap('career')}>
          <div className="goal-content">
            <div className="goal-icon"><FiCompass /></div>
            <div>
              <h3>Trouver ma voie</h3>
              <p>Exploration, bilan, coaching carrière...</p>
            </div>
          </div>
          <div className="goal-action">Explorer les pistes →</div>
        </div>

      </div>

    </div>
  );
};

export default Dashboard;
