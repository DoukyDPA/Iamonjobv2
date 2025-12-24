import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  FiTarget, FiTrendingUp, FiCheckCircle, FiAlertTriangle, FiBarChart2, 
  FiAward, FiBriefcase, FiCpu, FiUsers, FiStar, FiChevronUp, FiChevronDown,
  FiFileText, FiMic, FiMessageSquare
} from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import SimpleMarkdownRenderer from '../Common/SimpleMarkdownRenderer';
import LoadingMessage from '../Common/LoadingMessage';
import './MatchingAnalysis.css';

const MatchingAnalysis = ({ preloadedData, hideButton = false }) => {
  const { documentStatus } = useApp();
  const navigate = useNavigate();
  const [analysisData, setAnalysisData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // État pour plier/déplier l'analyse
  const [isExpanded, setIsExpanded] = useState(true);

  // --- LOGIQUE D'EXTRACTION (Améliorée) ---
  const extractJobTitle = (name) => {
    if (!name) return null;
    const base = name.replace(/\.[^/.]+$/, '');
    const match = base.match(/^Offre\s+(.*?)(?:\s+-\s+.*)?$/i);
    return (match ? match[1] : base).trim();
  };

  const displayedTitle = analysisData?.jobTitle || extractJobTitle(documentStatus.offre_emploi?.name) || 'ce poste';

  const extractScoresFromResponse = (text) => {
    if (!text || typeof text !== 'string') return null;
    // Tentative 1 : Chercher un bloc JSON
    let jsonMatch = text.match(/```json\s*(\{[\s\S]*?\})\s*```/);
    let jsonString = jsonMatch ? jsonMatch[1] : null;

    // Tentative 2 : Chercher juste un objet JSON à la fin si pas de balises code
    if (!jsonString) {
      const braceMatch = text.match(/(\{[\s\S]*"score_global"[\s\S]*\})/);
      if (braceMatch) jsonString = braceMatch[1];
    }

    if (jsonString) {
      try {
        const parsed = JSON.parse(jsonString);
        const data = Array.isArray(parsed) ? parsed[0] : parsed;
        // Mapping des clés possibles
        const validScores = {};
        if (data.score_global) validScores.compatibilityScore = data.score_global;
        if (data.score_technique) validScores.technical = data.score_technique;
        if (data.score_soft_skills) validScores.soft = data.score_soft_skills;
        if (data.score_experience) validScores.experience = data.score_experience;
        if (data.score_formation) validScores.education = data.score_formation;
        if (data.score_culture) validScores.culture = data.score_culture;
        
        return Object.keys(validScores).length > 0 ? validScores : null;
      } catch (e) { return null; }
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
      });
      setIsExpanded(true); // Déplier automatiquement quand une nouvelle donnée arrive
    }
  }, [preloadedData, documentStatus.offre_emploi?.name]);

  const performAnalysis = async () => {
    if (!documentStatus.cv?.uploaded || !documentStatus.offre_emploi?.uploaded) return;
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/actions/compatibility', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        },
        body: JSON.stringify({ service_id: 'matching_cv_offre' })
      });
      const data = await response.json();
      if (data.success) {
        const analysisText = data.matching || data.response || data.analysis || "";
        const extractedScores = extractScoresFromResponse(analysisText);
        setAnalysisData({
          scores: extractedScores,
          jobTitle: extractJobTitle(documentStatus.offre_emploi?.name),
          fullText: analysisText,
        });
        setIsExpanded(true);
      } else { throw new Error(data.error || 'Erreur lors de l\'analyse'); }
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  // --- RENDU ---
  
  if (loading) return <LoadingMessage message="Analyse de compatibilité en cours..." subtitle="Comparaison de votre CV avec l'offre..." size="medium" />;
  if (error) return <div className="error-message" style={{ color: 'red', padding: '1rem' }}>❌ {error} <button onClick={performAnalysis} style={{marginLeft: '10px', textDecoration: 'underline', cursor: 'pointer', background: 'none', border: 'none'}}>Réessayer</button></div>;

  // Bouton pour lancer l'analyse (si pas de données)
  if (!analysisData && !hideButton) {
    return (
      <div className="matching-analysis-dashboard" style={{ marginTop: '20px' }}>
        <div className="text-analysis-card" style={{ textAlign: 'center', padding: '40px' }}>
          <FiTarget size={48} color="#0a6b79" style={{ marginBottom: '1rem' }} />
          <h2 style={{ marginTop: 0, color: '#1f2937' }}>Prêt à comparer ?</h2>
          <p style={{ color: '#64748b', marginBottom: '2rem' }}>
            Lancez l'analyse pour voir votre score de compatibilité avec <strong>{displayedTitle}</strong>.
          </p>
          <button 
            onClick={performAnalysis} 
            style={{
              background: '#0a6b79', color: 'white', border: 'none', padding: '12px 24px', 
              borderRadius: '8px', fontSize: '1rem', fontWeight: '600', cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: '8px'
            }}
          >
            <FiBarChart2 /> Lancer l'analyse de compatibilité
          </button>
        </div>
      </div>
    );
  }

  if (!analysisData) return null;

  // Données calculées
  const globalScore = analysisData.scores?.compatibilityScore || 0;
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (globalScore / 100) * circumference;
  
  let scoreColor = '#ef4444';
  if (globalScore >= 50) scoreColor = '#f59e0b';
  if (globalScore >= 75) scoreColor = '#10b981';

  return (
    <div className="matching-analysis-dashboard" style={{ marginTop: '30px', animation: 'fadeIn 0.5s' }}>
      
      {/* HEADER DE L'ANALYSE (Toujours visible) */}
      <div style={{ 
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
        background: 'white', padding: '20px', borderRadius: '16px 16px 0 0',
        borderBottom: isExpanded ? '1px solid #e5e7eb' : 'none',
        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{ position: 'relative', width: '60px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="60" height="60" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx="30" cy="30" r="26" stroke="#e5e7eb" strokeWidth="5" fill="none" />
              <circle cx="30" cy="30" r="26" stroke={scoreColor} strokeWidth="5" fill="none" strokeDasharray={2 * Math.PI * 26} strokeDashoffset={2 * Math.PI * 26 - (globalScore / 100) * 2 * Math.PI * 26} strokeLinecap="round" />
            </svg>
            <span style={{ position: 'absolute', fontWeight: 'bold', fontSize: '14px', color: '#1f2937' }}>{globalScore}%</span>
          </div>
          <div>
            <h3 style={{ margin: 0, color: '#1f2937' }}>Compatibilité : {displayedTitle}</h3>
            <p style={{ margin: 0, color: scoreColor, fontWeight: '500', fontSize: '0.9rem' }}>
              {globalScore >= 75 ? 'Excellent profil' : globalScore >= 50 ? 'Profil intéressant' : 'Profil à adapter'}
            </p>
          </div>
        </div>
        
        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', gap: '5px', fontWeight: '500' }}
        >
          {isExpanded ? 'Masquer détails' : 'Voir détails'}
          {isExpanded ? <FiChevronUp /> : <FiChevronDown />}
        </button>
      </div>

      {/* CONTENU DÉPLIABLE */}
      {isExpanded && (
        <div style={{ background: 'white', padding: '30px', borderRadius: '0 0 16px 16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
          
          {/* 1. Tableau des scores */}
          {analysisData.scores && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px', marginBottom: '30px' }}>
              {[
                { label: 'Technique', score: analysisData.scores.technical, icon: <FiCpu /> },
                { label: 'Expérience', score: analysisData.scores.experience, icon: <FiBriefcase /> },
                { label: 'Soft Skills', score: analysisData.scores.soft, icon: <FiUsers /> },
                { label: 'Culture', score: analysisData.scores.culture, icon: <FiStar /> },
              ].map((item, i) => (
                <div key={i} style={{ background: '#f8fafc', padding: '15px', borderRadius: '12px', textAlign: 'center' }}>
                  <div style={{ color: '#64748b', marginBottom: '5px' }}>{item.icon} {item.label}</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: item.score >= 70 ? '#10b981' : item.score >= 50 ? '#f59e0b' : '#ef4444' }}>
                    {item.score || 0}/100
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 2. Texte de l'analyse */}
          <div className="markdown-content" style={{ fontSize: '0.95rem', lineHeight: '1.6', color: '#334155', marginBottom: '40px' }}>
            <SimpleMarkdownRenderer content={analysisData.fullText.replace(/```json[\s\S]*?```/g, '')} />
          </div>

          {/* 3. SECTION : QUELLE EST L'ÉTAPE SUIVANTE ? */}
          <div style={{ borderTop: '2px dashed #e2e8f0', paddingTop: '30px' }}>
            <h3 style={{ fontSize: '1.2rem', color: '#1f2937', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <FiTrendingUp color="#0a6b79" /> Quelle est l'étape suivante ?
            </h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
              
              {/* Option A: Lettre de motivation */}
              <div 
                className="next-step-card hover-scale"
                onClick={() => navigate('/cover-letter')}
                style={{ 
                  border: '1px solid #e5e7eb', borderRadius: '12px', padding: '20px', cursor: 'pointer', transition: 'all 0.2s',
                  background: '#fff'
                }}
              >
                <div style={{ width: '40px', height: '40px', background: '#ecfeff', borderRadius: '8px', color: '#0a6b79', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '15px' }}>
                  <FiFileText size={20} />
                </div>
                <h4 style={{ margin: '0 0 5px 0', color: '#1f2937' }}>Rédiger la lettre</h4>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>Générez une lettre adaptée à cette offre.</p>
              </div>

              {/* Option B: Pitch */}
              <div 
                className="next-step-card hover-scale"
                onClick={() => navigate('/pitch')} // Route à créer ou utiliser une existante
                style={{ 
                  border: '1px solid #e5e7eb', borderRadius: '12px', padding: '20px', cursor: 'pointer', transition: 'all 0.2s',
                  background: '#fff'
                }}
              >
                <div style={{ width: '40px', height: '40px', background: '#fffbeb', borderRadius: '8px', color: '#b45309', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '15px' }}>
                  <FiMic size={20} />
                </div>
                <h4 style={{ margin: '0 0 5px 0', color: '#1f2937' }}>Préparer votre pitch</h4>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>Présentez-vous efficacement en 2 minutes.</p>
              </div>

              {/* Option C: Entretien */}
              <div 
                className="next-step-card hover-scale"
                onClick={() => navigate('/interview-prep')}
                style={{ 
                  border: '1px solid #e5e7eb', borderRadius: '12px', padding: '20px', cursor: 'pointer', transition: 'all 0.2s',
                  background: '#fff'
                }}
              >
                <div style={{ width: '40px', height: '40px', background: '#fdf2f8', borderRadius: '8px', color: '#be185d', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '15px' }}>
                  <FiMessageSquare size={20} />
                </div>
                <h4 style={{ margin: '0 0 5px 0', color: '#1f2937' }}>Préparer l'entretien</h4>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>Simulez les questions probables du recruteur.</p>
              </div>

            </div>
          </div>

        </div>
      )}
    </div>
  );
};

export default MatchingAnalysis;
