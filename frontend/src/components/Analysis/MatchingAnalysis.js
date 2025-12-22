import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { FiTarget, FiTrendingUp, FiCheckCircle, FiAlertTriangle, FiBarChart2, FiAward, FiBriefcase, FiCpu, FiUsers, FiStar } from 'react-icons/fi';
import SimpleMarkdownRenderer from '../Common/SimpleMarkdownRenderer';
import LoadingMessage from '../Common/LoadingMessage';
import './MatchingAnalysis.css';

const MatchingAnalysis = ({ preloadedData, hideButton = false }) => {
  const { documentStatus } = useApp();
  const [analysisData, setAnalysisData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [userNotes, setUserNotes] = useState('');

  // --- LOGIQUE MÉTIER (Extraction) ---
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
          const scoreMapping = { 'score_global': 'compatibilityScore', 'score_technique': 'technical', 'score_soft_skills': 'soft', 'score_experience': 'experience', 'score_formation': 'education', 'score_culture': 'culture' };
          const validScores = {};
          let validCount = 0;
          Object.keys(scoreMapping).forEach(jsonKey => {
            const internalKey = scoreMapping[jsonKey];
            const value = data[jsonKey];
            if (value !== null && typeof value === 'number') {
              validScores[internalKey] = Math.round(value);
              validCount++;
            }
          });
          return validCount >= 3 ? validScores : null;
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

  // --- CONFIGURATION VISUELLE ---
  const getScoreColor = (score) => {
    if (score >= 80) return '#10b981'; // Vert Émeraude
    if (score >= 60) return '#f59e0b'; // Ambre
    return '#ef4444'; // Rouge
  };

  const getAppreciation = (score) => {
    if (score >= 90) return { label: 'Excellent', bg: '#ecfdf5', color: '#059669', icon: <FiCheckCircle /> };
    if (score >= 75) return { label: 'Très bon', bg: '#f0fdf4', color: '#16a34a', icon: <FiCheckCircle /> };
    if (score >= 60) return { label: 'Correct', bg: '#fffbeb', color: '#d97706', icon: <FiTarget /> };
    if (score >= 40) return { label: 'Faible', bg: '#fef2f2', color: '#dc2626', icon: <FiAlertTriangle /> };
    return { label: 'Insuffisant', bg: '#fef2f2', color: '#b91c1c', icon: <FiAlertTriangle /> };
  };

  const criteriaConfig = [
    { key: 'technical', label: 'Technique', icon: <FiCpu />, weight: '30%' },
    { key: 'experience', label: 'Expérience', icon: <FiBriefcase />, weight: '25%' },
    { key: 'soft', label: 'Soft Skills', icon: <FiUsers />, weight: '20%' },
    { key: 'education', label: 'Formation', icon: <FiAward />, weight: '15%' },
    { key: 'culture', label: 'Culture', icon: <FiStar />, weight: '10%' }
  ];

  // --- RENDER ---
  if (loading) return <LoadingMessage message="Analyse de compatibilité..." subtitle="Comparaison détaillée des compétences" size="large" />;
  if (error) return <div className="error-message">❌ {error} <button onClick={performAnalysis}>Réessayer</button></div>;

  // Mode "Bouton"
  if (!analysisData && !hideButton) {
    return (
      <div className="matching-analysis-dashboard">
        <div className="text-analysis-card" style={{ textAlign: 'center' }}>
          <FiTarget size={48} color="#4f46e5" style={{ marginBottom: '1rem' }} />
          <h2 style={{ marginTop: 0 }}>Analyse de Compatibilité CV / Offre</h2>
          <p style={{ color: '#64748b', marginBottom: '2rem' }}>
            Obtenez un score précis et des cartes de compétences pour l'offre : <strong>{displayedTitle}</strong>.
          </p>
          <button onClick={performAnalysis} className="start-btn" style={{ maxWidth: '300px', margin: '0 auto' }}>
            <FiBarChart2 /> Lancer l'analyse
          </button>
        </div>
      </div>
    );
  }

  if (!analysisData) return null;

  const globalScore = analysisData.scores?.compatibilityScore || 0;
  const globalAppreciation = getAppreciation(globalScore);
  const globalColor = getScoreColor(globalScore);

  // Calcul pour le SVG Circle (Rayon 70)
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (globalScore / 100) * circumference;

  return (
    <div className="matching-analysis-dashboard">
      
      {/* 1. HEADER AVEC SCORE CIRCULAIRE (Le retour du visuel !) */}
      <div className="matching-header-card">
        <div className="score-visual">
          <svg width="160" height="160" className="score-svg">
            <circle cx="80" cy="80" r={radius} stroke="#e2e8f0" strokeWidth="12" fill="none" />
            <circle 
              cx="80" cy="80" r={radius} 
              stroke={globalColor} 
              strokeWidth="12" 
              fill="none" 
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
            />
          </svg>
          <div className="score-overlay">
            <span className="score-value-big">{globalScore}</span>
            <span className="score-total-big">/100</span>
          </div>
        </div>

        <div className="header-content">
          <h2>Compatibilité : <span className="job-highlight">{displayedTitle}</span></h2>
          <div 
            className="verdict-badge"
            style={{ '--bg-color': globalAppreciation.bg, '--text-color': globalAppreciation.color }}
          >
            {globalAppreciation.icon} Verdict : {globalAppreciation.label}
          </div>
          <p style={{ lineHeight: '1.6', color: '#475569' }}>
            {globalScore >= 75 
              ? "Excellent profil ! Vos compétences techniques et votre expérience s'alignent parfaitement avec les attentes du recruteur." 
              : globalScore >= 50 
              ? "Profil intéressant. Vous avez les bases, mais certains écarts (techniques ou expérience) devront être compensés par votre motivation."
              : "L'alignement est faible. Les prérequis semblent éloignés de votre profil actuel. Misez sur vos compétences transférables."}
          </p>
        </div>
      </div>

      {/* 2. GRILLE DE CARTES KPI (Le retour des cartes !) */}
      {analysisData.scores && (
        <div className="kpi-grid">
          {criteriaConfig.map((critere) => {
            const score = analysisData.scores[critere.key] || 0;
            const color = getScoreColor(score);
            const appreciation = getAppreciation(score);
            
            return (
              <div key={critere.key} className="kpi-card">
                <div className="kpi-icon-wrapper">{critere.icon}</div>
                <div className="kpi-title">{critere.label}</div>
                <div className="kpi-score" style={{ color: color }}>{score}</div>
                <div className="kpi-bar-bg">
                  <div className="kpi-bar-fill" style={{ width: `${score}%`, '--color': color }}></div>
                </div>
                <div className="kpi-appreciation" style={{ '--color': color }}>{appreciation.label}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* 3. TABLEAU DÉTAILLÉ (Le tableau demandé, mais joli) */}
      {analysisData.scores && (
        <div className="details-section">
          <h3 className="section-title"><FiBarChart2 /> Détail de la pondération</h3>
          <table className="modern-table">
            <thead>
              <tr>
                <th>Critère</th>
                <th>Score</th>
                <th>Progression</th>
                <th>Appréciation</th>
                <th>Poids</th>
              </tr>
            </thead>
            <tbody>
              {criteriaConfig.map((critere) => {
                const score = analysisData.scores[critere.key] || 0;
                const color = getScoreColor(score);
                const appreciation = getAppreciation(score);
                
                return (
                  <tr key={critere.key}>
                    <td style={{ fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {critere.icon} {critere.label}
                    </td>
                    <td style={{ fontWeight: '700' }}>{score}/100</td>
                    <td>
                      <div className="kpi-bar-bg" style={{ width: '120px' }}>
                        <div className="kpi-bar-fill" style={{ width: `${score}%`, '--color': color }}></div>
                      </div>
                    </td>
                    <td>
                      <span className="verdict-badge" style={{ 
                        '--bg-color': appreciation.bg, 
                        '--text-color': appreciation.color,
                        padding: '0.25rem 0.75rem',
                        fontSize: '0.85rem',
                        margin: 0
                      }}>
                        {appreciation.label}
                      </span>
                    </td>
                    <td style={{ color: '#94a3b8' }}>{critere.weight}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* 4. ANALYSE TEXTUELLE */}
      {analysisData.fullText && (
        <div className="text-analysis-card">
          <h3 style={{ marginTop: 0, borderBottom: '1px solid #f1f5f9', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
            📝 Analyse Détaillée de l'Expert IA
          </h3>
          <SimpleMarkdownRenderer content={analysisData.fullText.replace(/```json[\s\S]*?```/g, '')} />
        </div>
      )}
    </div>
  );
};

export default MatchingAnalysis;
