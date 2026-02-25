import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom'; // Ajout de useNavigate
import LoadingMessage from '../Common/LoadingMessage';
import { FiCheckCircle, FiAlertTriangle, FiTarget, FiZap, FiBarChart2, FiCpu, FiMessageSquare } from 'react-icons/fi';
import './CVAnalysisDashboard.css';

const CVAnalysisDashboard = ({ analysisData, loading, error }) => {
  const navigate = useNavigate();
  
  // État pour gérer les cases à cocher des recommandations (Gamification)
  const [completedActions, setCompletedActions] = useState(new Set());

  // Utilisation de useMemo pour éviter de re-parser à chaque rendu
  const parsedData = useMemo(() => {
    if (!analysisData) return null;
    try {
      return typeof analysisData === 'string' ? JSON.parse(analysisData) : analysisData;
    } catch (e) {
      console.error("Erreur de parsing des données d'analyse", e);
      return {
        synthesis: "Analyse effectuée, mais nous n'avons pas pu générer la synthèse personnalisée. Consultez les détails ci-dessous.",
        strengths: [],
        improvements: [],
        recommendations: [],
        globalScore: 5
      };
    }
  }, [analysisData]);

  if (loading) {
    return (
      <LoadingMessage 
        message="Analyse approfondie en cours..."
        subtitle="L'IA examine la structure, le contenu et l'impact de votre CV"
        size="large"
      />
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <div className="error-message">❌ {error}</div>
      </div>
    );
  }

  if (!parsedData) return null;

  const { strengths = [], improvements = [], recommendations = [], synthesis, globalScore = 0 } = parsedData;

  // Calculs visuels
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (globalScore / 10) * circumference;
  
  const getScoreColor = (score) => {
    if (score >= 8) return '#16a34a';
    if (score >= 5) return '#d97706';
    return '#dc2626';
  };
  const scoreColor = getScoreColor(globalScore);

  // Fonction pour gérer le clic sur une case à cocher
  const toggleAction = (index) => {
    const newCompleted = new Set(completedActions);
    if (newCompleted.has(index)) {
      newCompleted.delete(index);
    } else {
      newCompleted.add(index);
    }
    setCompletedActions(newCompleted);
  };

  // Calcul de la progression
  const progressPercentage = recommendations.length > 0 
    ? Math.round((completedActions.size / recommendations.length) * 100) 
    : 0;

  return (
    <div className="cv-analysis-dashboard">
      
      <div className="dashboard-header">
        {/* Colonne Gauche : Le Score */}
        <div className="header-score-section">
          <div className="score-label">Note Globale</div>
          {/* ... (Ton SVG actuel reste le même ici) ... */}
          <div className="score-circle-big">
            <svg width="140" height="140" className="score-svg">
              <circle cx="70" cy="70" r={radius} stroke="#e2e8f0" strokeWidth="10" fill="none" />
              <circle 
                cx="70" cy="70" r={radius} stroke={scoreColor} strokeWidth="10" fill="none" 
                strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round"
              />
            </svg>
            <div className="score-overlay">
              <span className="score-value" style={{ color: scoreColor }}>{globalScore}</span>
              <span className="score-max">/10</span>
            </div>
          </div>
          <div className="ats-badge"><FiCpu /> Potentiel ATS</div>
        </div>

        {/* Colonne Droite : La Synthèse mise en valeur */}
        <div className="header-synthesis-section">
          <h3><FiMessageSquare color="#4f46e5" /> L'avis du Coach IA</h3>
          {/* On crée un encart visuel pour la synthèse pour éviter le flottement */}
          <div className="synthesis-card">
            <p className="synthesis-content">
              {synthesis || "Aucune synthèse disponible."}
            </p>
          </div>
        </div>
      </div>

      {/* ... (La grid Points Forts / Améliorations reste identique) ... */}
      
      <div className="action-plan-section">
        <div className="action-plan-header">
          <h3 className="section-title">
            <FiZap color="#4f46e5" /> Plan d'Action Personnalisé
          </h3>
          {/* Petite barre de progression pour motiver */}
          <div className="progress-indicator">
            Progression : {progressPercentage}%
          </div>
        </div>

        <table className="actions-table">
          {/* ... thead identique ... */}
          <tbody>
            {recommendations.length > 0 ? recommendations.map((rec, i) => {
              const isCompleted = completedActions.has(i);
              return (
                <tr key={i} className={isCompleted ? 'row-completed' : ''}>
                  <td style={{ textAlign: 'center' }}>
                    <div className="checkbox-wrapper">
                      <input 
                        type="checkbox" 
                        className="custom-checkbox" 
                        checked={isCompleted}
                        onChange={() => toggleAction(i)}
                      />
                    </div>
                  </td>
                  <td style={{ 
                    fontWeight: isCompleted ? '400' : '500',
                    textDecoration: isCompleted ? 'line-through' : 'none',
                    color: isCompleted ? '#94a3b8' : '#334155',
                    transition: 'all 0.2s'
                  }}>
                    {rec}
                  </td>
                  <td>
                    {/* Badge de priorité */}
                  </td>
                </tr>
              );
            }) : (
              <tr><td colSpan="3" style={{textAlign: 'center'}}>Aucune recommandation.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="dashboard-footer">
        {/* Remplacement de window.location par navigate */}
        <button 
          onClick={() => navigate('/cv-ats-optimization')}
          className="optimize-btn"
        >
          <FiCpu /> Lancer l'Optimisation ATS Automatique
        </button>
      </div>

    </div>
  );
};

export default CVAnalysisDashboard;
