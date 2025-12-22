import React from 'react';
import LoadingMessage from '../Common/LoadingMessage';
import { FiCheckCircle, FiAlertTriangle, FiTarget, FiZap, FiBarChart2, FiCpu } from 'react-icons/fi';
import './CVAnalysisDashboard.css';

const CVAnalysisDashboard = ({ analysisData, loading, error }) => {
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

  if (!analysisData) return null;

  // Parsing sécurisé
  let parsedData = null;
  try {
    parsedData = typeof analysisData === 'string' ? JSON.parse(analysisData) : analysisData;
  } catch (e) {
    // Fallback data
    parsedData = {
      synthesis: "Analyse effectuée. Consultez les détails ci-dessous.",
      strengths: [],
      improvements: [],
      recommendations: [],
      globalScore: 5
    };
  }

  const { strengths = [], improvements = [], recommendations = [], synthesis, globalScore = 0 } = parsedData;

  // Calculs visuels pour la jauge
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (globalScore / 10) * circumference;
  
  // Couleur dynamique selon le score
  const getScoreColor = (score) => {
    if (score >= 8) return '#16a34a'; // Vert
    if (score >= 5) return '#d97706'; // Orange
    return '#dc2626'; // Rouge
  };
  const scoreColor = getScoreColor(globalScore);

  return (
    <div className="cv-analysis-dashboard">
      
      {/* 1. HEADER HYBRIDE : Score Visuel + Synthèse Texte */}
      <div className="dashboard-header">
        
        {/* Colonne Gauche : Le Score */}
        <div className="header-score-section">
          <div className="score-label">Note Globale</div>
          <div className="score-circle-big">
            <svg width="140" height="140" className="score-svg">
              {/* Cercle fond */}
              <circle cx="70" cy="70" r={radius} stroke="#e2e8f0" strokeWidth="10" fill="none" />
              {/* Cercle progression */}
              <circle 
                cx="70" cy="70" r={radius} 
                stroke={scoreColor} 
                strokeWidth="10" 
                fill="none" 
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
              />
            </svg>
            <div className="score-overlay">
              <span className="score-value" style={{ color: scoreColor }}>{globalScore}</span>
              <span className="score-max">/10</span>
            </div>
          </div>
          
          <div className="ats-badge">
            <FiCpu /> Potentiel ATS
          </div>
        </div>

        {/* Colonne Droite : La Synthèse */}
        <div className="header-synthesis-section">
          <h3><FiBarChart2 /> Synthèse de l'Expert</h3>
          <p className="synthesis-content">
            {synthesis || "Aucune synthèse disponible."}
          </p>
          <div style={{ marginTop: '1.5rem', color: '#64748b', fontSize: '0.9rem' }}>
            <em>Basé sur l'analyse de la structure, des mots-clés et de la clarté.</em>
          </div>
        </div>
      </div>

      {/* 2. TABLEAUX COMPARATIFS (Points Forts / Faibles) */}
      <div className="analysis-grid">
        
        {/* Colonne Points Forts */}
        <div className="analysis-column">
          <div className="column-header header-strengths">
            <FiCheckCircle size={18} /> Points Forts
          </div>
          <ul className="column-list">
            {strengths.length > 0 ? strengths.map((item, i) => (
              <li key={i}>
                <FiCheckCircle className="bullet-icon" color="#16a34a" size={16} />
                <span>{item}</span>
              </li>
            )) : (
              <li>Aucun point fort majeur détecté.</li>
            )}
          </ul>
        </div>

        {/* Colonne Améliorations */}
        <div className="analysis-column">
          <div className="column-header header-improvements">
            <FiAlertTriangle size={18} /> Axes d'Amélioration
          </div>
          <ul className="column-list">
            {improvements.length > 0 ? improvements.map((item, i) => (
              <li key={i}>
                <FiTarget className="bullet-icon" color="#d97706" size={16} />
                <span>{item}</span>
              </li>
            )) : (
              <li>Aucun axe d'amélioration critique.</li>
            )}
          </ul>
        </div>
      </div>

      {/* 3. PLAN D'ACTION (Tableau Détail) */}
      <div className="action-plan-section">
        <h3 className="section-title">
          <FiZap color="#4f46e5" /> Recommandations Prioritaires
        </h3>
        <table className="actions-table">
          <thead>
            <tr>
              <th style={{ width: '60px', textAlign: 'center' }}>Fait</th>
              <th>Action Recommandée</th>
              <th style={{ width: '150px' }}>Priorité</th>
            </tr>
          </thead>
          <tbody>
            {recommendations.length > 0 ? recommendations.map((rec, i) => (
              <tr key={i}>
                <td style={{ textAlign: 'center' }}>
                  <div className="checkbox-wrapper">
                    <input type="checkbox" className="custom-checkbox" />
                  </div>
                </td>
                <td style={{ fontWeight: '500' }}>{rec}</td>
                <td>
                  <span style={{ 
                    background: i < 2 ? '#fee2e2' : '#f3f4f6', 
                    color: i < 2 ? '#991b1b' : '#374151',
                    padding: '0.25rem 0.75rem',
                    borderRadius: '99px',
                    fontSize: '0.75rem',
                    fontWeight: '700',
                    textTransform: 'uppercase'
                  }}>
                    {i < 2 ? 'Haute' : 'Moyenne'}
                  </span>
                </td>
              </tr>
            )) : (
              <tr><td colSpan="3" style={{textAlign: 'center'}}>Aucune recommandation spécifique.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 4. CALL TO ACTION */}
      <div className="dashboard-footer">
        <button 
          onClick={() => window.location.href = '/cv-ats-optimization'}
          className="optimize-btn"
        >
          <FiCpu /> Lancer l'Optimisation ATS Automatique
        </button>
      </div>

    </div>
  );
};

export default CVAnalysisDashboard;
