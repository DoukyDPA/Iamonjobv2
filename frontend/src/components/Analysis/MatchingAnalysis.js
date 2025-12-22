import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { FiTarget, FiTrendingUp, FiAlertTriangle, FiCheck, FiBarChart2 } from 'react-icons/fi';
import SimpleMarkdownRenderer from '../Common/SimpleMarkdownRenderer';
import LoadingMessage from '../Common/LoadingMessage';
import './MatchingAnalysis.css'; // Import du nouveau CSS

const MatchingAnalysis = ({ preloadedData, hideButton = false }) => {
  const { documentStatus } = useApp();
  const [analysisData, setAnalysisData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [userNotes, setUserNotes] = useState('');

  // --- LOGIQUE D'EXTRACTION (Identique, on garde la logique métier) ---
  const extractJobTitle = (name) => {
    if (!name) return null;
    const base = name.replace(/\.[^/.]+$/, '');
    const match = base.match(/^Offre\s+(.*?)(?:\s+-\s+.*)?$/i);
    return (match ? match[1] : base).trim();
  };

  const displayedTitle = analysisData?.jobTitle || extractJobTitle(documentStatus.offre_emploi?.name) || 'ce poste';

  const extractScoresFromResponse = (text) => {
    if (!text || typeof text !== 'string') return null;
    const jsonMatches = text.match(/```json\s*(\{[\s\S]*?\})\s*```/g);
    if (jsonMatches && jsonMatches.length > 0) {
      const lastJsonBlock = jsonMatches[jsonMatches.length - 1];
      const jsonContent = lastJsonBlock.match(/```json\s*(\{[\s\S]*?\})\s*```/);
      if (jsonContent && jsonContent[1]) {
        try {
          const parsed = JSON.parse(jsonContent[1]);
          const data = Array.isArray(parsed) ? parsed[0] : parsed;
          
          const scoreMapping = {
            'score_global': 'compatibilityScore',
            'score_technique': 'technical',
            'score_soft_skills': 'soft',
            'score_experience': 'experience',
            'score_formation': 'education',
            'score_culture': 'culture'
          };
          
          const validScores = {};
          let validCount = 0;
          Object.keys(scoreMapping).forEach(jsonKey => {
            const internalKey = scoreMapping[jsonKey];
            const value = data[jsonKey];
            if (value !== null && value !== undefined && typeof value === 'number') {
              validScores[internalKey] = Math.round(value);
              validCount++;
            }
          });
          return validCount >= 3 ? validScores : null; // Tolérant si 3 scores min
        } catch (e) { return null; }
      }
    }
    return null;
  };

  useEffect(() => {
    if (preloadedData) {
      const extractedScores = extractScoresFromResponse(preloadedData);
      setAnalysisData({
        scores: extractedScores,
        jobTitle: extractJobTitle(documentStatus.offre_emploi?.name),
        fullText: preloadedData,
        hasValidScores: !!extractedScores
      });
    }
  }, [preloadedData]);

  const performAnalysis = async () => {
    if (!documentStatus.cv?.uploaded || !documentStatus.offre_emploi?.uploaded) return;
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/actions/compatibility', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ service_id: 'matching_cv_offre', notes: userNotes || '' })
      });
      if (!response.ok) throw new Error(`Erreur API: ${response.status}`);
      const data = await response.json();
      if (data.success) {
        const analysisText = data.matching || data.response || "";
        const extractedScores = extractScoresFromResponse(analysisText);
        setAnalysisData({
          scores: extractedScores,
          jobTitle: extractJobTitle(documentStatus.offre_emploi?.name),
          fullText: analysisText,
          hasValidScores: !!extractedScores
        });
      } else { throw new Error(data.error || 'Erreur lors de l\'analyse'); }
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  // --- HELPERS D'AFFICHAGE ---
  const getScoreColor = (score) => {
    if (score >= 80) return '#10b981'; // Vert
    if (score >= 60) return '#f59e0b'; // Orange
    return '#ef4444'; // Rouge
  };

  const getAppreciation = (score) => {
    if (score >= 90) return { label: 'Excellent', bg: '#ecfdf5', color: '#059669' };
    if (score >= 75) return { label: 'Très bon', bg: '#f0fdf4', color: '#16a34a' };
    if (score >= 60) return { label: 'Correct', bg: '#fffbeb', color: '#d97706' };
    if (score >= 40) return { label: 'Faible', bg: '#fef2f2', color: '#dc2626' };
    return { label: 'Insuffisant', bg: '#fef2f2', color: '#b91c1c' };
  };

  // Données pour le tableau
  const criteriaConfig = [
    { key: 'technical', label: 'Compétences Techniques', icon: '🛠️', weight: '30%' },
    { key: 'experience', label: 'Expérience', icon: '💼', weight: '25%' },
    { key: 'soft', label: 'Soft Skills', icon: '🤝', weight: '20%' },
    { key: 'education', label: 'Formation', icon: '🎓', weight: '15%' },
    { key: 'culture', label: 'Culture & Valeurs', icon: '⭐', weight: '10%' }
  ];

  // --- RENDER ---

  if (loading) return <LoadingMessage message="Analyse de matching en cours..." subtitle="Comparaison détaillée de votre profil avec l'offre" size="large" />;
  if (error) return <div className="error-message">❌ {error} <button onClick={performAnalysis}>Réessayer</button></div>;

  // Mode "Bouton de lancement" (si pas encore de données)
  if (!analysisData && !hideButton) {
    return (
      <div className="matching-analysis-dashboard">
        <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
          <FiTarget size={40} color="#4f46e5" style={{ marginBottom: '1rem' }} />
          <h2 style={{ marginTop: 0 }}>Analyse de Compatibilité</h2>
          <p style={{ color: '#64748b', marginBottom: '2rem' }}>
            Comparez votre CV avec l'offre <strong>{extractJobTitle(documentStatus.offre_emploi?.name) || "sélectionnée"}</strong>.
          </p>
          <button 
            onClick={performAnalysis}
            style={{ 
              padding: '1rem 2rem', 
              background: '#4f46e5', 
              color: 'white', 
              border: 'none', 
              borderRadius: '8px', 
              fontWeight: 'bold', 
              cursor: 'pointer',
              fontSize: '1rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <FiBarChart2 /> Lancer l'analyse
          </button>
        </div>
      </div>
    );
  }

  if (!analysisData) return null;

  const globalScore = analysisData.scores?.compatibilityScore || 0;
  const globalColor = getScoreColor(globalScore);
  const globalAppreciation = getAppreciation(globalScore);

  return (
    <div className="matching-analysis-dashboard">
      
      {/* 1. HEADER : Score Global */}
      <div className="matching-header">
        <div className="global-score-container">
          <div 
            className="big-score-circle" 
            style={{ 
              '--score-deg': `${globalScore * 3.6}deg`,
              '--score-color': globalColor 
            }}
          >
            <div className="score-inner">
              <span className="score-value">{globalScore}</span>
              <span className="score-max">/100</span>
            </div>
          </div>
        </div>
        <div className="header-info">
          <h2>Compatibilité avec <span className="job-title">{displayedTitle}</span></h2>
          <div 
            className="verdict-badge"
            style={{ '--bg-color': globalAppreciation.bg, '--score-color': globalAppreciation.color }}
          >
            Verdict : {globalAppreciation.label}
          </div>
          <p style={{ marginTop: '1rem', color: '#64748b', lineHeight: '1.5' }}>
            {globalScore >= 75 
              ? "Votre profil correspond fortement aux attentes. C'est une excellente opportunité." 
              : globalScore >= 50 
              ? "Profil intéressant mais quelques écarts sont à noter. Une bonne lettre de motivation sera clé."
              : "Le gap semble important. Assurez-vous de bien mettre en avant vos compétences transférables."}
          </p>
        </div>
      </div>

      {/* 2. TABLEAU DÉTAILLÉ */}
      {analysisData.scores && (
        <div className="scores-table-container">
          <h3>📊 Détail des Scores par Critère</h3>
          <table className="matching-table">
            <thead>
              <tr>
                <th>Critère</th>
                <th style={{ width: '15%' }}>Score</th>
                <th style={{ width: '30%' }}>Progression</th>
                <th>Appréciation</th>
                <th>Poids</th>
              </tr>
            </thead>
            <tbody>
              {criteriaConfig.map((critere) => {
                const score = analysisData.scores[critere.key] || 0;
                const appreciation = getAppreciation(score);
                const color = getScoreColor(score);
                
                return (
                  <tr key={critere.key}>
                    <td>
                      <div className="col-criteria">
                        <span className="criteria-icon">{critere.icon}</span>
                        {critere.label}
                      </div>
                    </td>
                    <td>
                      <span className="score-text">{score}/100</span>
                    </td>
                    <td>
                      <div className="score-bar-container">
                        <div 
                          className="score-bar-fill" 
                          style={{ width: `${score}%`, '--bar-color': color }}
                        ></div>
                      </div>
                    </td>
                    <td>
                      <span 
                        className="appreciation-badge"
                        style={{ '--bg-color': appreciation.bg, '--text-color': appreciation.color }}
                      >
                        {appreciation.label}
                      </span>
                    </td>
                    <td>
                      <span className="weight-tag">{critere.weight}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* 3. ANALYSE TEXTUELLE */}
      {analysisData.fullText && (
        <div className="text-analysis-container">
          <h3>📝 Analyse Détaillée de l'Expert IA</h3>
          <SimpleMarkdownRenderer 
            content={analysisData.fullText.replace(/```json[\s\S]*?```/g, '')} 
          />
        </div>
      )}
    </div>
  );
};

export default MatchingAnalysis;
