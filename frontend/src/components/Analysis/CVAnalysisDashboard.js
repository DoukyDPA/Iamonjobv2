import React, { useState, useEffect } from 'react';
import { FiTrendingUp, FiCheckCircle, FiLightbulb, FiList, FiFileText, FiClock, FiPlay } from 'react-icons/fi';
import './CVAnalysisDashboard.css';

const CVAnalysisDashboard = ({ analysisData, loading, error, onStartNextStep }) => {
  const [parsedAnalysis, setParsedAnalysis] = useState(null);
  const [progress, setProgress] = useState(40);
  const [recommendationsFollowed, setRecommendationsFollowed] = useState(2);

  // Parser l'analyse pour extraire les différentes sections
  useEffect(() => {
    if (analysisData) {
      const parsed = parseAnalysisData(analysisData);
      setParsedAnalysis(parsed);
    }
  }, [analysisData]);

  const parseAnalysisData = (data) => {
    // Si c'est déjà un objet structuré, on l'utilise directement
    if (typeof data === 'object' && data.synthesis) {
      return data;
    }

    // Sinon, on parse le texte markdown
    const text = typeof data === 'string' ? data : JSON.stringify(data);
    
    // Extraction des sections avec regex
    const synthesis = extractSection(text, /synthèse|résumé|profil/i);
    const strengths = extractListItems(text, /points forts|forces|atouts/i);
    const improvements = extractListItems(text, /amélioration|faiblesses|manques/i);
    const recommendations = extractListItems(text, /recommandations|actions|conseils/i);
    const globalScore = extractScore(text);

    return {
      synthesis: synthesis || "Double licence en Droit & Histoire de l'art, Master 2 en droit du patrimoine culturel. Expériences académiques solides et compétences transversales.",
      strengths: strengths.length > 0 ? strengths : [
        "Parcours académique solide",
        "Expériences pluridisciplinaires", 
        "Participation active dans des projets culturels"
      ],
      improvements: improvements.length > 0 ? improvements : [
        "Détail des compétences numériques",
        "Clarification des expériences clés",
        "Mise en avant des résultats"
      ],
      recommendations: recommendations.length > 0 ? recommendations : [
        "Ajouter un stage à la section expériences",
        "Détailler les compétences numériques",
        "Mettre à jour la partie langues",
        "Renommer le CV avec le poste visé"
      ],
      globalScore: globalScore || 7,
      estimatedTime: "10 min"
    };
  };

  const extractSection = (text, pattern) => {
    const match = text.match(new RegExp(`${pattern.source}[\\s\\S]*?(?=\\n\\n|\\n\\*|$)`, 'i'));
    if (match) {
      return match[0].replace(new RegExp(pattern.source, 'i'), '').trim();
    }
    return null;
  };

  const extractListItems = (text, pattern) => {
    const section = extractSection(text, pattern);
    if (section) {
      return section
        .split(/[\n•\-\*]/)
        .map(item => item.trim())
        .filter(item => item.length > 0)
        .slice(0, 5);
    }
    return [];
  };

  const extractScore = (text) => {
    const scoreMatch = text.match(/(\d+)\/10|note.*?(\d+)|score.*?(\d+)/i);
    if (scoreMatch) {
      return parseInt(scoreMatch[1] || scoreMatch[2] || scoreMatch[3]);
    }
    return 7;
  };

  const handleRecommendationToggle = (index) => {
    // Logique pour marquer une recommandation comme suivie
    console.log(`Recommandation ${index} toggled`);
  };

  if (loading) {
    return (
      <div className="cv-analysis-dashboard loading">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Analyse de votre CV en cours...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="cv-analysis-dashboard error">
        <div className="error-message">
          <p>❌ {error}</p>
        </div>
      </div>
    );
  }

  if (!parsedAnalysis) {
    return null;
  }

  return (
    <div className="cv-analysis-dashboard">
      {/* Header avec navigation des étapes */}
      <div className="steps-navigation">
        <div className="step active">
          <span className="step-number">1</span>
          <span className="step-label">Mes documents</span>
        </div>
        <div className="step">
          <span className="step-number">2</span>
          <span className="step-label">Évaluer une offre</span>
        </div>
        <div className="step">
          <span className="step-number">3</span>
          <span className="step-label">Améliorer mon CV</span>
        </div>
        <div className="step">
          <span className="step-number">4</span>
          <span className="step-label">Candidater</span>
        </div>
        <div className="step">
          <span className="step-number">5</span>
          <span className="step-label">Préparer l'entretien</span>
        </div>
        <div className="step">
          <span className="step-number">6</span>
          <span className="step-label">Tout changer</span>
        </div>
      </div>

      {/* Contenu principal */}
      <div className="dashboard-content">
        {/* Section documents (gauche) */}
        <div className="documents-section">
          <h3>Vos documents pour personnaliser l'analyse</h3>
          <button className="add-document-btn">
            <FiFileText />
            Ajouter un document
          </button>
          <div className="progress-section">
            <label>Progression</label>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${progress}%` }}></div>
            </div>
          </div>
          <div className="documents-list">
            <div className="document-item">
              <div className="document-icon pdf">📄</div>
              <div className="document-info">
                <span className="document-name">CV_Camille.pdf</span>
                <span className="document-size">164 Ko</span>
              </div>
              <button className="open-btn">Ouvrir</button>
            </div>
            <div className="document-item">
              <div className="document-icon docx">📝</div>
              <div className="document-info">
                <span className="document-name">Lettre_motivation.docx</span>
                <span className="document-size">22 Ko</span>
              </div>
              <button className="open-btn">Ouvrir</button>
            </div>
            <div className="document-item">
              <div className="document-icon zip">📦</div>
              <div className="document-info">
                <span className="document-name">Diplômes.zip</span>
                <span className="document-size">1,2 Mo</span>
              </div>
              <button className="open-btn">Ouvrir</button>
            </div>
          </div>
        </div>

        {/* Bilan rapide (droite) */}
        <div className="quick-summary">
          <h3>✩ Bilan rapide</h3>
          <div className="global-score">
            <div className="score-circle">
              <span className="score-number">{parsedAnalysis.globalScore}</span>
              <span className="score-total">/10</span>
            </div>
            <span className="score-label">Note globale</span>
          </div>
          <div className="summary-text">
            <p>Votre profil est solide. Quelques ajustements peuvent faire la différence.</p>
          </div>
          <div className="estimated-time">
            <FiClock />
            Temps estimé pour l'étape suivante : {parsedAnalysis.estimatedTime}
          </div>
          <button className="start-btn" onClick={onStartNextStep}>
            <FiPlay />
            Commencer maintenant
          </button>
        </div>
      </div>

      {/* Sections d'analyse */}
      <div className="analysis-sections">
        {/* Synthèse */}
        <div className="analysis-card synthesis">
          <div className="card-header">
            <FiTrendingUp className="card-icon" />
            <h4>Synthèse</h4>
          </div>
          <div className="card-content">
            <p>{parsedAnalysis.synthesis}</p>
          </div>
        </div>

        {/* Points forts */}
        <div className="analysis-card strengths">
          <div className="card-header">
            <FiCheckCircle className="card-icon" />
            <h4>Points forts</h4>
          </div>
          <div className="card-content">
            <ul>
              {parsedAnalysis.strengths.map((strength, index) => (
                <li key={index}>{strength}</li>
              ))}
            </ul>
          </div>
        </div>

        {/* Axes d'amélioration */}
        <div className="analysis-card improvements">
          <div className="card-header">
            <FiLightbulb className="card-icon" />
            <h4>Axes d'amélioration</h4>
          </div>
          <div className="card-content">
            <ul>
              {parsedAnalysis.improvements.map((improvement, index) => (
                <li key={index}>{improvement}</li>
              ))}
            </ul>
          </div>
        </div>

        {/* Recommandations concrètes */}
        <div className="analysis-card recommendations">
          <div className="card-header">
            <FiList className="card-icon" />
            <h4>Recommandations concrètes</h4>
          </div>
          <div className="card-content">
            <div className="recommendations-list">
              {parsedAnalysis.recommendations.map((recommendation, index) => (
                <div key={index} className="recommendation-item">
                  <input 
                    type="checkbox" 
                    id={`rec-${index}`}
                    onChange={() => handleRecommendationToggle(index)}
                  />
                  <label htmlFor={`rec-${index}`}>{recommendation}</label>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Petits indicateurs */}
        <div className="analysis-card indicators">
          <div className="card-header">
            <h4>Petits indicateurs</h4>
          </div>
          <div className="card-content">
            <div className="indicator">
              <span className="indicator-label">Profil complété</span>
              <span className="indicator-value">{progress}%</span>
            </div>
            <div className="indicator">
              <span className="indicator-label">Recommandations suivies</span>
              <span className="indicator-value">{recommendationsFollowed}/5</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CVAnalysisDashboard;
