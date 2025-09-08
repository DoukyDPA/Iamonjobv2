// FICHIER À CRÉER : frontend/src/components/Analysis/MatchingAnalysis.js
// Utilise l'API existante /api/actions/compatibility avec service_id=matching_cv_offre

import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { FiTarget, FiTrendingUp, FiAlertTriangle, FiCheckCircle, FiBarChart3 } from 'react-icons/fi';
import SimpleMarkdownRenderer from '../Common/SimpleMarkdownRenderer';

const MatchingAnalysis = ({ preloadedData, hideButton = false }) => {
  const { documentStatus } = useApp();
  const [analysisData, setAnalysisData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [userNotes, setUserNotes] = useState('');

  // Animations CSS pour l'effet WOW
  const animationsCSS = `
    @keyframes fadeInUp {
      from {
        opacity: 0;
        transform: translateY(30px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    
    @keyframes shimmer {
      0% {
        transform: translateX(-100%) translateY(-100%) rotate(45deg);
      }
      100% {
        transform: translateX(100%) translateY(100%) rotate(45deg);
      }
    }
    
    @keyframes pulse {
      0%, 100% {
        transform: scale(1);
      }
      50% {
        transform: scale(1.05);
      }
    }
  `;

  const extractJobTitle = (name) => {
    if (!name) return null;
    const base = name.replace(/\.[^/.]+$/, '');
    const match = base.match(/^Offre\s+(.*?)(?:\s+-\s+.*)?$/i);
    return (match ? match[1] : base).trim();
  };

  const displayedTitle =
    analysisData?.jobTitle ||
    extractJobTitle(documentStatus.offre_emploi?.name) ||
    'ce poste';

  // Si on a des données préchargées, les traiter
  React.useEffect(() => {
    if (preloadedData) {
      console.log('🎯 Données préchargées reçues:', preloadedData.substring(0, 100));
      const extractedScores = extractScoresFromResponse(preloadedData);
      
      console.log('🔍 Scores extraits:', extractedScores);
      
      const parsedAnalysis = {
        scores: extractedScores,
        jobTitle: extractJobTitle(documentStatus.offre_emploi?.name),
        fullText: preloadedData,
        hasValidScores: !!extractedScores,
        summary: preloadedData.substring(0, 300) + "..."
      };

      console.log('🎯 Matching analysis traité depuis Supabase:', parsedAnalysis);
      setAnalysisData(parsedAnalysis);
    }
  }, [preloadedData]);

  // REMPLACER la fonction extractScoresFromResponse dans frontend/src/components/Analysis/MatchingAnalysis.js
  // Cette fonction extrait les scores depuis la réponse de l'IA

  // Ligne ~55 : Remplacer la fonction extractScoresFromResponse par celle-ci :

  const extractScoresFromResponse = (text) => {
    if (!text || typeof text !== 'string') {
      return null;
    }

    console.log('📊 Extraction des scores depuis la réponse Supabase...');
    
    // Chercher le JSON dans la réponse du prompt Supabase
    const jsonMatches = text.match(/```json\s*(\{[\s\S]*?\})\s*```/g);
    
    if (jsonMatches && jsonMatches.length > 0) {
      // Prendre le dernier bloc JSON (celui avec les scores)
      const lastJsonBlock = jsonMatches[jsonMatches.length - 1];
      const jsonContent = lastJsonBlock.match(/```json\s*(\{[\s\S]*?\})\s*```/);
      
      if (jsonContent && jsonContent[1]) {
        try {
          const parsed = JSON.parse(jsonContent[1]);
          console.log('✅ Scores extraits du JSON Supabase:', parsed);
          console.log('🔍 Type de parsed:', typeof parsed, Array.isArray(parsed));
          console.log('🔍 Structure complète du JSON:', JSON.stringify(parsed, null, 2));
          
          // Si c'est un tableau, prendre le premier élément
          const data = Array.isArray(parsed) ? parsed[0] : parsed;
          console.log('🔍 Données finales après traitement:', data);
          console.log('🔍 Type de data:', typeof data, Array.isArray(data));
          
          // Mapping des clés du JSON vers nos clés internes
          const scoreMapping = {
            'score_global': 'compatibilityScore',
            'score_technique': 'technical',
            'score_soft_skills': 'soft',
            'score_experience': 'experience',
            'score_formation': 'education',
            'score_culture': 'culture'
          };
          
          const requiredScores = ['compatibilityScore', 'technical', 'soft', 'experience', 'education', 'culture'];
          
          // Log des scores trouvés pour debug
          console.log('🔍 Scores trouvés dans le JSON:', Object.keys(data));
          console.log('🔍 Valeurs complètes de data:', data);
          
          const validScores = {};
          let validCount = 0;
          
          // Parcourir les clés du JSON et les mapper vers nos clés internes
          Object.keys(scoreMapping).forEach(jsonKey => {
            const internalKey = scoreMapping[jsonKey];
            const value = data[jsonKey];
            
            console.log(`🔍 Mapping ${jsonKey} -> ${internalKey}:`, value, typeof value);
            
            // Gérer le cas spécial de "N/A" pour le score technique
            if (jsonKey === 'score_technique' && value === 'N/A') {
              console.log('⚠️ Score technique N/A, ignoré');
              return;
            }
            
            if (value !== null && value !== undefined && 
                typeof value === 'number' && 
                value >= 0 && 
                value <= 100) {
              validScores[internalKey] = Math.round(value);
              validCount++;
              console.log(`✅ Score ${internalKey} mappé:`, validScores[internalKey]);
            } else {
              console.warn(`⚠️ Score ${jsonKey} (${internalKey}) manquant ou invalide:`, value);
            }
          });
          
          // Accepter si on a au moins 4 scores valides
          if (validCount >= 4) {
            console.log('✅ Scores valides extraits:', validScores);
            return validScores;
          } else {
            console.warn('⚠️ Pas assez de scores valides trouvés:', validCount, 'sur', requiredScores.length);
            return null;
          }
        } catch (e) {
          console.warn('⚠️ Erreur parsing JSON Supabase:', e);
          return null;
        }
      }
    }
    
    console.warn('⚠️ Aucun JSON valide trouvé dans la réponse Supabase');
    return null;
  };

  // Vérification des documents requis
  const canAnalyze = () => {
    return documentStatus.cv?.uploaded && documentStatus.offre_emploi?.uploaded;
  };

  // Lancement de l'analyse via l'API existante
  const performAnalysis = async () => {
    if (!canAnalyze()) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/actions/compatibility', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          service_id: 'matching_cv_offre',  // ✅ Utilise le nouveau service
          notes: userNotes || ''
        })
      });

      if (!response.ok) {
        throw new Error(`Erreur API: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        const analysisText = data.matching || data.response || "";
        const extractedScores = extractScoresFromResponse(analysisText);
        
        if (!extractedScores) {
          throw new Error('Impossible d\'extraire les scores depuis la réponse Supabase');
        }
        
        const parsedAnalysis = {
          scores: extractedScores,
          jobTitle: extractJobTitle(documentStatus.offre_emploi?.name),
          fullText: analysisText,
          hasValidScores: true,
          summary: analysisText.substring(0, 300) + "..."
        };

        console.log('🎯 Matching analysis reçu depuis Supabase:', parsedAnalysis);
        setAnalysisData(parsedAnalysis);
      } else {
        throw new Error(data.error || 'Erreur lors de l\'analyse');
      }

    } catch (err) {
      console.error('❌ Erreur matching:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Composant de score circulaire PREMIUM
  const CircularScore = ({ score, label, color, weight, icon }) => {
    const radius = 45;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (score / 100) * circumference;

    const getScoreLabel = (score) => {
      if (score >= 90) return 'Excellent';
      if (score >= 80) return 'Très bon';
      if (score >= 70) return 'Bon';
      if (score >= 60) return 'Moyen';
      if (score >= 50) return 'Faible';
      return 'Très faible';
    };


    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        margin: '0.5rem',
        padding: '2rem 1.5rem',
        background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
        borderRadius: '24px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.1), 0 0 0 1px rgba(0,0,0,0.05)',
        minWidth: '160px',
        position: 'relative',
        overflow: 'hidden',
        transition: 'all 0.3s ease',
        cursor: 'pointer'
      }}
      onMouseEnter={(e) => {
        e.target.style.transform = 'translateY(-8px)';
        e.target.style.boxShadow = '0 20px 40px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.1)';
      }}
      onMouseLeave={(e) => {
        e.target.style.transform = 'translateY(0)';
        e.target.style.boxShadow = '0 10px 30px rgba(0,0,0,0.1), 0 0 0 1px rgba(0,0,0,0.05)';
      }}>
        
        {/* Effet de brillance */}
        <div style={{
          position: 'absolute',
          top: '-50%',
          left: '-50%',
          width: '200%',
          height: '200%',
          background: 'linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.3) 50%, transparent 70%)',
          animation: 'shimmer 4s infinite',
          pointerEvents: 'none'
        }} />
        
        <div style={{ position: 'relative', zIndex: 2 }}>
          {/* Icône du domaine */}
          <div style={{
            fontSize: '2rem',
            marginBottom: '1rem',
            textAlign: 'center'
          }}>
            {icon}
          </div>
          
          {/* Graphique circulaire */}
          <div style={{ position: 'relative', marginBottom: '1rem' }}>
            <svg width="100" height="100" style={{ transform: 'rotate(-90deg)' }}>
              {/* Cercle de fond */}
              <circle
                cx="50"
                cy="50"
                r={radius}
                stroke="#e5e7eb"
                strokeWidth="6"
                fill="transparent"
              />
              {/* Cercle de progression */}
              <circle
                cx="50"
                cy="50"
                r={radius}
                stroke={color}
                strokeWidth="6"
                fill="transparent"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                style={{ 
                  transition: 'stroke-dashoffset 1.2s ease-out',
                  filter: 'drop-shadow(0 0 8px rgba(0,0,0,0.2))'
                }}
              />
              {/* Cercle intérieur pour l'effet de profondeur */}
              <circle
                cx="50"
                cy="50"
                r={radius - 8}
                stroke="rgba(255,255,255,0.8)"
                strokeWidth="1"
                fill="transparent"
              />
            </svg>
            
            {/* Score au centre */}
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              fontSize: '1.6rem',
              fontWeight: '900',
              color: color,
              textShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}>
              {score}
            </div>
          </div>
          
          {/* Label du domaine */}
          <div style={{
            fontSize: '1.1rem',
            fontWeight: '700',
            color: '#1f2937',
            textAlign: 'center',
            marginBottom: '0.5rem',
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}>
            {label}
          </div>
          
          {/* Évaluation qualitative */}
          <div style={{
            fontSize: '0.9rem',
            color: color,
            fontWeight: '600',
            textAlign: 'center',
            marginBottom: '0.5rem'
          }}>
            {getScoreLabel(score)}
          </div>
          
          {/* Pondération */}
          {weight && (
            <div style={{
              fontSize: '0.75rem',
              color: '#6b7280',
              textAlign: 'center',
              background: 'rgba(0,0,0,0.05)',
              padding: '0.25rem 0.5rem',
              borderRadius: '12px',
              fontWeight: '500'
            }}>
              Poids: {weight}%
            </div>
          )}
        </div>
      </div>
    );
  };

  // Couleur selon le score
  const getScoreColor = (score) => {
    if (score >= 80) return '#10b981';
    if (score >= 60) return '#f59e0b';
    return '#ef4444';
  };

  // Affichage si documents manquants
  if (!canAnalyze()) {
    return (
      <div style={{
        padding: '3rem',
        textAlign: 'center',
        background: '#fef3c7',
        borderRadius: '12px',
        border: '1px solid #fbbf24',
        margin: '1rem 0'
      }}>
        <FiAlertTriangle style={{ fontSize: '3rem', color: '#f59e0b', marginBottom: '1rem' }} />
        <h3 style={{ color: '#92400e', marginBottom: '1rem' }}>
          Documents requis pour le matching CV/Offre
        </h3>
        <div style={{ color: '#92400e', marginBottom: '1rem' }}>
          {!documentStatus.cv?.uploaded && <p>❌ CV manquant</p>}
          {!documentStatus.offre_emploi?.uploaded && <p>❌ Offre d'emploi manquante</p>}
        </div>
        <p style={{ color: '#92400e' }}>
          💡 Téléchargez vos documents dans l'onglet "Mes documents"
        </p>
      </div>
    );
  }

  // Affichage du loading
  if (loading) {
    return (
      <div style={{
        padding: '3rem',
        textAlign: 'center',
        background: '#f0f9fa',
        borderRadius: '12px',
        border: '1px solid #0a6b79',
        margin: '1rem 0'
      }}>
        <div style={{
          width: '4rem',
          height: '4rem',
          border: '4px solid #e5e7eb',
          borderTop: '4px solid #0a6b79',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '0 auto 1rem auto'
        }} />
        <h3 style={{ color: '#0a6b79', marginBottom: '0.5rem' }}>
          Analyse de matching en cours...
        </h3>
        <p style={{ color: '#0a6b79', margin: 0 }}>
          L'IA évalue votre compatibilité professionnelle
        </p>
        
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // Affichage d'erreur
  if (error) {
    return (
      <div style={{
        padding: '2rem',
        background: '#fef2f2',
        borderRadius: '12px',
        border: '1px solid #fecaca',
        margin: '1rem 0'
      }}>
        <h3 style={{ color: '#dc2626', marginBottom: '1rem' }}>
          Erreur lors de l'analyse
        </h3>
        <p style={{ color: '#dc2626', marginBottom: '1rem' }}>{error}</p>
        <button
          onClick={performAnalysis}
          style={{
            padding: '0.5rem 1rem',
            background: '#dc2626',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          Réessayer
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '1rem' }}>
      {/* Injecter les animations CSS */}
      <style dangerouslySetInnerHTML={{ __html: animationsCSS }} />
      {/* Interface de lancement */}
      {!analysisData && !hideButton && (
        <div style={{
          background: 'white',
          padding: '2rem',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          marginBottom: '1.5rem'
        }}>
          <h2 style={{
            marginBottom: '1rem',
            color: '#374151',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <FiTarget />
            Compatibilité CV / Offre 
          </h2>
          
          <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
            Obtenez une analyse professionnelle de votre compatibilité avec cette offre, 
            avec des scores détaillés et des graphiques.
          </p>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontWeight: '500',
              color: '#374151'
            }}>
              Notes personnalisées (optionnel)
            </label>
            <textarea
              value={userNotes}
              onChange={(e) => setUserNotes(e.target.value)}
              placeholder="Informations spécifiques à mettre en avant, contexte particulier..."
              style={{
                width: '100%',
                minHeight: '80px',
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '0.9rem',
                resize: 'vertical'
              }}
            />
          </div>

          <button
            onClick={performAnalysis}
            style={{
              padding: '0.75rem 2rem',
              background: '#0a6b79',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '1rem',
              fontWeight: '500',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              transition: 'background-color 0.2s'
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#0891b2'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#0a6b79'}
          >
            <FiTrendingUp />
            Lancer l'analyse de matching
          </button>
        </div>
      )}


      {/* Résultats de l'analyse - Structure similaire à l'analyse de CV */}
      {analysisData && (
        <div style={{ 
          maxWidth: '1200px', 
          margin: '0 auto',
          animation: 'fadeInUp 0.8s ease-out'
        }}>
          
          {/* Score global - Case principale */}
          {analysisData.scores && analysisData.scores.compatibilityScore && (
            <div style={{
              background: 'white',
              borderRadius: '12px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              marginBottom: '2rem',
              overflow: 'hidden'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '1rem 1.5rem',
                background: analysisData.scores.compatibilityScore >= 70 ? '#f0fdf4' : 
                           analysisData.scores.compatibilityScore >= 50 ? '#fffbeb' : '#fef2f2',
                borderBottom: '1px solid #e5e7eb'
              }}>
                <span style={{ 
                  color: analysisData.scores.compatibilityScore >= 70 ? '#10b981' : 
                         analysisData.scores.compatibilityScore >= 50 ? '#f59e0b' : '#ef4444', 
                  fontSize: '1.2rem' 
                }}>🎯</span>
                <h4 style={{ margin: 0, color: '#1f2937', fontSize: '1.1rem', fontWeight: '600' }}>
                  Score de compatibilité global
                </h4>
              </div>
              <div style={{ padding: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', marginBottom: '1.5rem' }}>
                  <div style={{ position: 'relative', width: '100px', height: '100px' }}>
                    <svg width="100" height="100" style={{ transform: 'rotate(-90deg)' }}>
                      {/* Cercle de fond */}
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        stroke="#e5e7eb"
                        strokeWidth="6"
                        fill="transparent"
                      />
                      {/* Cercle de progression */}
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        stroke={analysisData.scores.compatibilityScore >= 70 ? '#10b981' : 
                               analysisData.scores.compatibilityScore >= 50 ? '#f59e0b' : '#ef4444'}
                        strokeWidth="6"
                        fill="transparent"
                        strokeDasharray={2 * Math.PI * 40}
                        strokeDashoffset={2 * Math.PI * 40 - (analysisData.scores.compatibilityScore / 100) * 2 * Math.PI * 40}
                        strokeLinecap="round"
                        style={{ 
                          transition: 'stroke-dashoffset 1.5s ease-out',
                          filter: 'drop-shadow(0 0 8px rgba(0,0,0,0.1))'
                        }}
                      />
                    </svg>
                    {/* Score au centre */}
                    <div style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      textAlign: 'center'
                    }}>
                      <div style={{ 
                        fontSize: '2rem', 
                        fontWeight: '700', 
                        color: analysisData.scores.compatibilityScore >= 70 ? '#10b981' : 
                               analysisData.scores.compatibilityScore >= 50 ? '#f59e0b' : '#ef4444',
                        lineHeight: 1
                      }}>
                        {analysisData.scores.compatibilityScore}
                      </div>
                      <div style={{ 
                        fontSize: '0.9rem', 
                        color: '#6b7280',
                        marginTop: '0.25rem'
                      }}>
                        /100
                      </div>
                    </div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ margin: '0 0 0.5rem 0', color: '#1f2937', fontSize: '1.5rem' }}>
                      {displayedTitle}
                    </h3>
                    <p style={{ 
                      margin: '0 0 1rem 0', 
                      color: '#6b7280',
                      fontSize: '1rem'
                    }}>
                      {analysisData.scores.compatibilityScore >= 85 ? 'Excellent match - Vous êtes parfaitement aligné avec ce poste !' : 
                       analysisData.scores.compatibilityScore >= 70 ? 'Bon match - Bonne adéquation, quelques ajustements possibles' :
                       analysisData.scores.compatibilityScore >= 50 ? 'Match moyen - Adéquation moyenne, des efforts sont nécessaires' : 
                       'Match faible - Adéquation faible, la reconversion risque d\'être difficile considérez d\'autres opportunités'}
                    </p>
                    <div style={{
                      width: '100%',
                      height: '8px',
                      background: '#e5e7eb',
                      borderRadius: '4px',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        width: `${analysisData.scores.compatibilityScore}%`,
                        height: '100%',
                        background: analysisData.scores.compatibilityScore >= 70 ? 
                          'linear-gradient(90deg, #10b981, #059669)' :
                          analysisData.scores.compatibilityScore >= 50 ?
                          'linear-gradient(90deg, #f59e0b, #d97706)' :
                          'linear-gradient(90deg, #ef4444, #dc2626)',
                        borderRadius: '4px',
                        transition: 'width 1.5s ease-out'
                      }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Scores détaillés par domaine - Cases individuelles */}
          {analysisData.scores && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '1.5rem',
              marginBottom: '2rem'
            }}>
              {Object.entries(analysisData.scores)
                .filter(([key]) => key !== 'compatibilityScore')
                .map(([key, score], index) => {
                  const labels = {
                    technical: 'Compétences techniques',
                    soft: 'Soft Skills',
                    experience: 'Expérience',
                    education: 'Formation',
                    culture: 'Culture d\'entreprise'
                  };
                  
                  const weights = {
                    technical: 30,
                    soft: 20,
                    experience: 25,
                    education: 15,
                    culture: 10
                  };
                  
                  const icons = {
                    technical: '⚙',
                    soft: '🤝',
                    experience: '💼',
                    education: '🎓',
                    culture: '⭐'
                  };
                  
                  return (
                    <div key={key} style={{
                      background: 'white',
                      borderRadius: '12px',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                      overflow: 'hidden',
                      animation: `fadeInUp 0.6s ease-out ${index * 0.1}s both`
                    }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        padding: '1rem 1.5rem',
                        background: '#f9fafb',
                        borderBottom: '1px solid #e5e7eb'
                      }}>
                        <span style={{ color: '#0a6b79', fontSize: '1.2rem' }}>{icons[key]}</span>
                        <h4 style={{ margin: 0, color: '#1f2937', fontSize: '1rem', fontWeight: '600' }}>
                          {labels[key] || key}
                        </h4>
                      </div>
                      <div style={{ padding: '1.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                          <div style={{ position: 'relative', width: '60px', height: '60px' }}>
                            <svg width="60" height="60" style={{ transform: 'rotate(-90deg)' }}>
                              {/* Cercle de fond */}
                              <circle
                                cx="30"
                                cy="30"
                                r="24"
                                stroke="#e5e7eb"
                                strokeWidth="4"
                                fill="transparent"
                              />
                              {/* Cercle de progression */}
                              <circle
                                cx="30"
                                cy="30"
                                r="24"
                                stroke={getScoreColor(score)}
                                strokeWidth="4"
                                fill="transparent"
                                strokeDasharray={2 * Math.PI * 24}
                                strokeDashoffset={2 * Math.PI * 24 - (score / 100) * 2 * Math.PI * 24}
                                strokeLinecap="round"
                                style={{ 
                                  transition: 'stroke-dashoffset 1.2s ease-out',
                                  filter: 'drop-shadow(0 0 4px rgba(0,0,0,0.1))'
                                }}
                              />
                            </svg>
                            {/* Score au centre */}
                            <div style={{
                              position: 'absolute',
                              top: '50%',
                              left: '50%',
                              transform: 'translate(-50%, -50%)',
                              fontSize: '0.9rem',
                              fontWeight: '700',
                              color: getScoreColor(score),
                              textAlign: 'center'
                            }}>
                              {score}
                            </div>
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '0.9rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                              Score: {score}/100
                            </div>
                            <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                              Poids: {weights[key]}% du score global
                            </div>
                          </div>
                        </div>
                        <div style={{
                          fontSize: '0.9rem',
                          color: getScoreColor(score),
                          fontWeight: '600',
                          textAlign: 'center',
                          padding: '0.5rem',
                          background: getScoreColor(score) === '#10b981' ? '#f0fdf4' : 
                                     getScoreColor(score) === '#f59e0b' ? '#fffbeb' : '#fef2f2',
                          borderRadius: '6px'
                        }}>
                          {score >= 90 ? 'Excellent' : 
                           score >= 80 ? 'Très bon' : 
                           score >= 70 ? 'Bon' : 
                           score >= 60 ? 'Moyen' : 
                           score >= 50 ? 'Faible' : 'Très faible'}
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}

          {/* Message d'erreur si pas de scores */}
          {!analysisData.scores && (
            <div style={{
              background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
              padding: '2rem',
              borderRadius: '16px',
              boxShadow: '0 4px 12px rgba(239, 68, 68, 0.1)',
              border: '1px solid #fecaca',
              marginBottom: '2rem',
              textAlign: 'center'
            }}>
              <FiAlertTriangle style={{ fontSize: '2rem', color: '#dc2626', marginBottom: '1rem' }} />
              <h3 style={{ color: '#dc2626', marginBottom: '1rem', fontSize: '1.2rem' }}>
                Problème d'extraction des scores
              </h3>
              <p style={{ color: '#991b1b', marginBottom: '1rem' }}>
                Les scores de compatibilité n'ont pas pu être extraits de la réponse de l'IA.
              </p>
              <p style={{ color: '#991b1b', fontSize: '0.9rem' }}>
                Vérifiez la console pour plus de détails sur le format du JSON reçu.
              </p>
            </div>
          )}

          {/* Analyse détaillée en markdown */}
          {analysisData.fullText && (
            <div style={{
              background: 'white',
              borderRadius: '12px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              overflow: 'hidden',
              marginBottom: '2rem'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '1rem 1.5rem',
                background: '#f9fafb',
                borderBottom: '1px solid #e5e7eb'
              }}>
                <span style={{ color: '#0a6b79', fontSize: '1.2rem' }}>📋</span>
                <h4 style={{ margin: 0, color: '#1f2937', fontSize: '1rem', fontWeight: '600' }}>
                  Analyse détaillée et recommandations
                </h4>
              </div>
              <div style={{ padding: '1.5rem' }}>
                <div style={{
                  fontSize: '1rem',
                  lineHeight: '1.6',
                  color: '#374151'
                }}>
                  <SimpleMarkdownRenderer
                    content={analysisData.fullText.replace(/```json[\s\S]*?```/g, '')}
                  />
                </div>
              </div>
            </div>
          )}



        </div>
      )}
    </div>
  );
};

export default MatchingAnalysis; 
