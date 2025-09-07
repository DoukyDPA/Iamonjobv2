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
          
          // Vérifier que tous les scores sont présents et valides
          const requiredScores = ['compatibilityScore', 'technical', 'soft', 'experience', 'education', 'culture'];
          
          // Log des scores trouvés pour debug
          console.log('🔍 Scores trouvés dans le JSON:', Object.keys(data));
          console.log('🔍 Valeurs complètes de data:', data);
          requiredScores.forEach(key => {
            console.log(`  ${key}:`, data[key], typeof data[key]);
          });
          
          const validScores = {};
          let validCount = 0;
          
          requiredScores.forEach(key => {
            if (key in data && 
                typeof data[key] === 'number' && 
                data[key] >= 0 && 
                data[key] <= 100) {
              validScores[key] = Math.round(data[key]);
              validCount++;
            } else {
              console.warn(`⚠️ Score ${key} manquant ou invalide:`, data[key]);
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

    const getScoreEmoji = (score) => {
      if (score >= 90) return '🔥';
      if (score >= 80) return '⭐';
      if (score >= 70) return '👍';
      if (score >= 60) return '👌';
      if (score >= 50) return '⚠️';
      return '❌';
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
            marginBottom: '0.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.25rem'
          }}>
            <span>{getScoreEmoji(score)}</span>
            <span>{getScoreLabel(score)}</span>
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
              {weight}% du score global
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
            Matching CV / Offre Professionnel
          </h2>
          
          <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
            Obtenez une analyse professionnelle de votre compatibilité avec cette offre, 
            avec des scores détaillés et des graphiques visuels.
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

      {/* Debug info */}
      {console.log('🔍 analysisData dans le render:', analysisData)}
      {console.log('🔍 analysisData.scores:', analysisData?.scores)}
      {console.log('🔍 analysisData.fullText:', analysisData?.fullText)}

      {/* Résultats de l'analyse - EFFET WOW */}
      {analysisData && (
        <div style={{ animation: 'fadeInUp 0.8s ease-out' }}>

          {/* Score global en vedette - DESIGN PREMIUM */}
          {analysisData.scores && analysisData.scores.compatibilityScore && (
            <div style={{
              background: analysisData.scores.compatibilityScore >= 70 
                ? 'linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%)'
                : analysisData.scores.compatibilityScore >= 50
                ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 50%, #b45309 100%)'
                : 'linear-gradient(135deg, #ef4444 0%, #dc2626 50%, #b91c1c 100%)',
              color: 'white',
              padding: '3rem 2rem',
              borderRadius: '20px',
              textAlign: 'center',
              marginBottom: '3rem',
              boxShadow: '0 20px 40px rgba(0,0,0,0.15), 0 0 0 1px rgba(255,255,255,0.1)',
              position: 'relative',
              overflow: 'hidden'
            }}>
              {/* Effet de brillance */}
              <div style={{
                position: 'absolute',
                top: '-50%',
                left: '-50%',
                width: '200%',
                height: '200%',
                background: 'linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.1) 50%, transparent 70%)',
                animation: 'shimmer 3s infinite'
              }} />
              
              <div style={{ position: 'relative', zIndex: 2 }}>
                <div style={{ 
                  fontSize: '0.9rem', 
                  fontWeight: '600', 
                  textTransform: 'uppercase', 
                  letterSpacing: '0.1em',
                  marginBottom: '1rem',
                  opacity: 0.9
                }}>
                  🎯 Score de compatibilité
                </div>
                <h2 style={{ 
                  marginBottom: '1rem', 
                  fontSize: '1.8rem', 
                  color: 'white',
                  fontWeight: '700',
                  textShadow: '0 2px 4px rgba(0,0,0,0.3)'
                }}>
                  {displayedTitle}
                </h2>
                
                {/* Score avec animation */}
                <div style={{ 
                  fontSize: '6rem', 
                  fontWeight: '900', 
                  marginBottom: '1rem',
                  textShadow: '0 4px 8px rgba(0,0,0,0.3)',
                  background: 'linear-gradient(45deg, #ffffff, #f0f9ff)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  animation: 'pulse 2s infinite'
                }}>
                  {analysisData.scores.compatibilityScore}
                </div>
                
                <div style={{ 
                  fontSize: '1.2rem', 
                  fontWeight: '600',
                  marginBottom: '1.5rem',
                  textShadow: '0 2px 4px rgba(0,0,0,0.3)'
                }}>
                  {analysisData.scores.compatibilityScore >= 85 ? '🌟 Excellent match' : 
                   analysisData.scores.compatibilityScore >= 70 ? '✅ Bon match' :
                   analysisData.scores.compatibilityScore >= 50 ? '⚠️ Match moyen' : '❌ Match faible'}
                </div>
                
                {/* Barre de progression */}
                <div style={{
                  width: '100%',
                  height: '8px',
                  background: 'rgba(255,255,255,0.2)',
                  borderRadius: '4px',
                  overflow: 'hidden',
                  marginBottom: '1rem'
                }}>
                  <div style={{
                    width: `${analysisData.scores.compatibilityScore}%`,
                    height: '100%',
                    background: 'linear-gradient(90deg, #ffffff, #f0f9ff)',
                    borderRadius: '4px',
                    transition: 'width 1.5s ease-out',
                    boxShadow: '0 0 10px rgba(255,255,255,0.5)'
                  }} />
                </div>
                
                <p style={{ 
                  fontSize: '1rem', 
                  opacity: 0.9,
                  fontStyle: 'italic'
                }}>
                  {analysisData.scores.compatibilityScore >= 85 ? 'Vous êtes parfaitement aligné avec ce poste !' : 
                   analysisData.scores.compatibilityScore >= 70 ? 'Bonne adéquation, quelques ajustements possibles' :
                   analysisData.scores.compatibilityScore >= 50 ? 'Adéquation moyenne, des efforts sont nécessaires' : 'Adéquation faible, considérez d\'autres opportunités'}
                </p>
              </div>
            </div>
          )}

          {/* Graphiques en cercles - DESIGN PREMIUM */}
          {analysisData.scores && (
            <div style={{
              background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
              padding: '2.5rem',
              borderRadius: '24px',
              marginBottom: '3rem',
              boxShadow: '0 20px 40px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.05)',
              position: 'relative',
              overflow: 'hidden'
            }}>
              {/* Effet de fond subtil */}
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'radial-gradient(circle at 30% 20%, rgba(59, 130, 246, 0.05) 0%, transparent 50%)',
                pointerEvents: 'none'
              }} />
              
              <div style={{ position: 'relative', zIndex: 2 }}>
                <h3 style={{ 
                  marginBottom: '2rem', 
                  color: '#1f2937', 
                  textAlign: 'center',
                  fontSize: '1.8rem',
                  fontWeight: '700',
                  background: 'linear-gradient(135deg, #1f2937, #374151)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent'
                }}>
                  📊 Analyse détaillée par domaine
                </h3>
                
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                  gap: '2rem',
                  justifyItems: 'center'
                }}>
                  {Object.entries(analysisData.scores)
                    .filter(([key]) => key !== 'compatibilityScore')
                    .map(([key, score], index) => {
                      const labels = {
                        technical: 'Technique',
                        soft: 'Soft Skills',
                        experience: 'Expérience',
                        education: 'Formation',
                        culture: 'Culture'
                      };
                      
                      const weights = {
                        technical: 30,
                        soft: 20,
                        experience: 25,
                        education: 15,
                        culture: 10
                      };
                      
                      const icons = {
                        technical: '⚙️',
                        soft: '🤝',
                        experience: '💼',
                        education: '🎓',
                        culture: '🌟'
                      };
                      
                      return (
                        <div key={key} style={{ 
                          animation: `fadeInUp 0.6s ease-out ${index * 0.1}s both` 
                        }}>
                          <CircularScore
                            score={score}
                            label={labels[key] || key}
                            color={getScoreColor(score)}
                            weight={weights[key]}
                            icon={icons[key]}
                          />
                        </div>
                      );
                    })}
                </div>
              </div>
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
                ⚠️ Problème d'extraction des scores
              </h3>
              <p style={{ color: '#991b1b', marginBottom: '1rem' }}>
                Les scores de compatibilité n'ont pas pu être extraits de la réponse de l'IA.
              </p>
              <p style={{ color: '#991b1b', fontSize: '0.9rem' }}>
                Vérifiez la console pour plus de détails sur le format du JSON reçu.
              </p>
            </div>
          )}

          {/* Analyse détaillée en markdown - EN DEUXIÈME */}
          {analysisData.fullText && (
            <div style={{
              background: 'white',
              borderRadius: '12px',
              padding: '2rem',
              marginBottom: '2rem',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              border: '1px solid #e5e7eb'
            }}>
              <h3 style={{
                marginBottom: '1.5rem',
                color: '#374151',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <FiCheckCircle />
                Analyse détaillée
              </h3>
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
          )}



          {/* Bouton nouvelle analyse */}
          <div style={{ marginTop: '2rem', textAlign: 'center' }}>
            <button
              onClick={() => {
                setAnalysisData(null);
                setUserNotes('');
              }}
              style={{
                padding: '0.75rem 2rem',
                background: '#6b7280',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '1rem',
                cursor: 'pointer'
              }}
            >
              Nouvelle analyse
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MatchingAnalysis; 
