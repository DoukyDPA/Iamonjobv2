import React from 'react';
import LoadingMessage from '../Common/LoadingMessage';
import './CVAnalysisDashboard.css';

const CVAnalysisDashboard = ({ analysisData, loading, error }) => {
  if (loading) {
    return (
      <LoadingMessage 
        message="Analyse de votre CV en cours..."
        subtitle="L'IA structure les données pour une présentation détaillée"
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
    parsedData = {
      globalScore: 0,
      synthesis: "Données non disponibles.",
      strengths: [],
      improvements: [],
      recommendations: []
    };
  }

  const { strengths = [], improvements = [], recommendations = [], synthesis, globalScore } = parsedData;

  // Préparation des données pour le tableau comparatif
  // On prend la longueur maximale pour aligner les lignes
  const maxRows = Math.max(strengths.length, improvements.length);
  const comparisonRows = Array.from({ length: maxRows }).map((_, i) => ({
    strength: strengths[i] || "",
    improvement: improvements[i] || ""
  }));

  const scoreDeg = `${(globalScore || 0) * 36}deg`;

  return (
    <div className="cv-analysis-dashboard">
      
      {/* HEADER : Score & Synthèse */}
      <div className="dashboard-header-section">
        <div className="score-card">
          <div className="score-circle-mini" style={{ '--score-deg': scoreDeg }}>
            <span className="score-number-mini">{globalScore || 0}</span>
            <span className="score-total-mini">/10</span>
          </div>
          <div className="score-text">
            <h3>Note Globale</h3>
            <p>Performance du CV</p>
          </div>
        </div>
        
        <div className="synthesis-card">
          <h3>📋 Synthèse de l'expert</h3>
          <p>{synthesis}</p>
        </div>
      </div>

      {/* TABLEAU 1 : Comparatif Points Forts / Faibles */}
      <div className="table-container">
        <h3>📊 Analyse Détaillée du Profil</h3>
        <table className="analysis-table comparison-table">
          <thead>
            <tr>
              <th className="th-success">✅ Points Forts</th>
              <th className="th-warning">💡 Axes d'Amélioration</th>
            </tr>
          </thead>
          <tbody>
            {comparisonRows.map((row, index) => (
              <tr key={index}>
                <td className={row.strength ? "cell-strength" : "cell-empty"}>
                  {row.strength && `• ${row.strength}`}
                </td>
                <td className={row.improvement ? "cell-improvement" : "cell-empty"}>
                  {row.improvement && `• ${row.improvement}`}
                </td>
              </tr>
            ))}
            {comparisonRows.length === 0 && (
              <tr><td colSpan="2" className="text-center">Aucune donnée disponible</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* TABLEAU 2 : Plan d'Action */}
      <div className="table-container">
        <h3>🚀 Plan d'Action Recommandé</h3>
        <table className="analysis-table action-table">
          <thead>
            <tr>
              <th style={{ width: '50px' }}>État</th>
              <th>Recommandations Prioritaires</th>
            </tr>
          </thead>
          <tbody>
            {recommendations.map((rec, index) => (
              <tr key={index}>
                <td className="text-center">
                  <input type="checkbox" className="action-checkbox" />
                </td>
                <td className="cell-action">
                  {rec}
                </td>
              </tr>
            ))}
            {recommendations.length === 0 && (
              <tr><td colSpan="2" className="text-center">Aucune recommandation</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="actions-footer">
        <button 
          onClick={() => window.location.href = '/cv-ats-optimization'}
          className="primary-btn"
        >
          🔧 Lancer l'optimisation ATS
        </button>
      </div>

    </div>
  );
};

export default CVAnalysisDashboard;
