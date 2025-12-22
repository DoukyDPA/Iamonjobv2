import React from 'react';
import LoadingMessage from '../Common/LoadingMessage';
import './CVAnalysisDashboard.css'; // Assurez-vous que ce fichier contient le CSS donné précédemment

const CVAnalysisDashboard = ({ analysisData, loading, error }) => {
  if (loading) {
    return (
      <LoadingMessage 
        message="Analyse de votre CV en cours..."
        subtitle="L'IA analyse votre profil et génère des recommandations stratégiques"
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

  // Parsing sécurisé des données
  let parsedData = null;
  try {
    parsedData = typeof analysisData === 'string' ? JSON.parse(analysisData) : analysisData;
  } catch (e) {
    parsedData = {
      synthesis: "Analyse effectuée. Consultez les détails ci-dessous.",
      strengths: ["Profil détecté", "Compétences identifiées"],
      improvements: ["Optimisation du format", "Ajout de métriques"],
      recommendations: ["Ajoutez des chiffres clés", "Structurez vos expériences"],
      globalScore: 5
    };
  }

  // Calcul dynamique de la couleur du score
  const score = parsedData.globalScore || 0;
  const scoreDeg = `${score * 36}deg`; // 10 * 36 = 360deg

  return (
    <div className="cv-analysis-dashboard">
      
      {/* SECTION HAUTE : Bilan & Synthèse */}
      <div className="dashboard-content">
        
        {/* Carte Score */}
        <div className="quick-summary">
          <h3>✩ Bilan de performance</h3>
          
          <div className="score-circle" style={{ '--score-deg': scoreDeg }}>
            <div className="score-content">
              <span className="score-number">{score}</span>
              <span className="score-total">/ 10</span>
            </div>
          </div>
          
          <p className="summary-text">
            {score >= 8 ? "Excellent profil ! Quelques ajustements suffiront." : 
             score >= 5 ? "Bonne base, mais nécessite une optimisation pour les ATS." :
             "Le CV nécessite une refonte structurelle importante."}
          </p>

          <button 
            onClick={() => window.location.href = '/cv-ats-optimization'}
            className="start-btn"
          >
            🔧 Optimiser pour les ATS
          </button>
        </div>

        {/* Carte Synthèse */}
        <div className="documents-section"> {/* Réutilisation du style carte blanche */}
          <h3>📋 Synthèse de l'expert IA</h3>
          <div className="markdown-renderer">
            {parsedData.synthesis || "Aucune synthèse disponible."}
          </div>
        </div>
      </div>

      {/* SECTION BASSE : Détails (Grid) */}
      <div className="analysis-sections">
        
        {/* Points forts */}
        <div className="analysis-card success">
          <div className="card-header">
            <span className="card-icon">✅</span>
            <h4>Points forts</h4>
          </div>
          <div className="card-content">
            <ul>
              {(parsedData.strengths || []).map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </div>
        </div>

        {/* Axes d'amélioration */}
        <div className="analysis-card warning">
          <div className="card-header">
            <span className="card-icon">💡</span>
            <h4>Axes d'amélioration</h4>
          </div>
          <div className="card-content">
            <ul>
              {(parsedData.improvements || []).map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </div>
        </div>

        {/* Recommandations */}
        <div className="analysis-card action">
          <div className="card-header">
            <span className="card-icon">🚀</span>
            <h4>Plan d'action</h4>
          </div>
          <div className="card-content">
            <div className="checklist">
              {(parsedData.recommendations || []).map((item, i) => (
                <div key={i} className="checklist-item">
                  <input type="checkbox" id={`rec-${i}`} />
                  <label htmlFor={`rec-${i}`}>{item}</label>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default CVAnalysisDashboard;
