import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import ActionCard from '../components/Services/ActionCard';
import ServicesGrid from '../components/Services/ServicesGrid'; // On garde l'ancien grid en bas au cas où
import { FiFileText, FiTarget, FiCompass, FiZap, FiUploadCloud } from 'react-icons/fi';
import './Dashboard.css'; // Assurez-vous d'importer le CSS (ou actions.css)

const Dashboard = () => {
  const { user } = useAuth();
  const { documentStatus } = useApp();
  const navigate = useNavigate();

  const firstName = user?.email?.split('@')[0] || 'Candidat';

  // SCÉNARIO 1 : J'ai pas de CV
  const needsCV = !documentStatus.cv?.uploaded;

  return (
    <div className="dashboard-container">
      
      {/* HEADER ACCUEILLANT */}
      <div className="dashboard-welcome">
        <h1>Bonjour, {firstName} 👋</h1>
        <p className="subtitle">Quel est votre objectif aujourd'hui ?</p>
      </div>

      {/* ZONE D'ACTIONS PRINCIPALES (Simplifiée) */}
      <div className="actions-grid">
        
        {/* 1. BOOSTER MON CV */}
        <ActionCard 
          title="Améliorer mon CV"
          subtitle="Analyse IA, correction des erreurs et optimisation pour les ATS."
          icon={<FiFileText />}
          color="#4f46e5" // Indigo
          onClick={() => navigate('/cv-analysis')}
          badge={needsCV ? "Prioritaire" : null}
        />

        {/* 2. RÉPONDRE À UNE OFFRE */}
        <ActionCard 
          title="Répondre à une offre"
          subtitle="Analysez votre compatibilité et générez une lettre de motivation sur-mesure."
          icon={<FiTarget />}
          color="#059669" // Emerald
          onClick={() => navigate('/matching')}
        />

        {/* 3. RECONVERSION / IDÉES */}
        <ActionCard 
          title="Trouver ma voie"
          subtitle="Discutez avec le coach pour explorer des pistes de reconversion."
          icon={<FiCompass />}
          color="#d97706" // Amber
          onClick={() => navigate('/chat')} // Redirige vers le Chat Coach
        />

      </div>

      {/* MODE "SANS SE PRENDRE LA TÊTE" (Accès direct Chat) */}
      <div className="quick-access-bar" onClick={() => navigate('/chat')}>
        <div className="quick-access-icon">
          <FiZap />
        </div>
        <div className="quick-access-content">
          <h4>Mode "Sans prise de tête"</h4>
          <p>Laissez l'assistant IA vous guider pas à pas dans vos démarches.</p>
        </div>
        <button className="quick-btn">Démarrer</button>
      </div>

      {/* SECTION SECONDAIRE : "Je veux travailler dans le détail" */}
      <div className="advanced-tools-section">
        <h3 className="section-divider">
          <span>Tous les outils experts</span>
        </h3>
        {/* On réutilise votre grille existante, mais en plus petit ou en dessous */}
        <ServicesGrid compact={true} /> 
      </div>

    </div>
  );
};

export default Dashboard;
