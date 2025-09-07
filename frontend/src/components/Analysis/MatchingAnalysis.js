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
      
      if (!extractedScores) {
        console.error('❌ Impossible d\'extraire les scores depuis les données préchargées');
        return;
      }
      
      const parsedAnalysis = {
        scores: extractedScores,
        jobTitle: extractJobTitle(documentStatus.offre_emploi?.name),
        fullText: preloadedData,
        hasValidScores: true,
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
          
          // Vérifier que tous les scores sont présents et valides
          const requiredScores = ['compatibilityScore', 'technical', 'soft', 'experience', 'education', 'culture'];
          const hasAllScores = requiredScores.every(key => 
            key in parsed && 
            typeof parsed[key] === 'number' && 
            parsed[key] >= 0 && 
            parsed[key] <= 100
          );
          
          if (hasAllScores) {
            // Arrondir les scores pour l'affichage
            const roundedScores = {};
            requiredScores.forEach(key => {
              roundedScores[key] = Math.round(parsed[key]);
            });
            return roundedScores;
          } else {
            console.warn('⚠️ JSON Supabase trouvé mais scores incomplets ou invalides');
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

  // Composant de score circulaire
  const CircularScore = ({ score, label, color }) => {
    const radius = 35;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (score / 100) * circumference;

    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        margin: '1rem',
        padding: '1rem',
        background: 'white',
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        minWidth: '120px'
      }}>
        <div style={{ position: 'relative', marginBottom: '0.5rem' }}>
          <svg width="80" height="80" style={{ transform: 'rotate(-90deg)' }}>
            <circle
              cx="40"
              cy="40"
              r={radius}
              stroke="#e5e7eb"
              strokeWidth="6"
              fill="transparent"
            />
            <circle
              cx="40"
              cy="40"
              r={radius}
              stroke={color}
              strokeWidth="6"
              fill="transparent"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 1s ease-in-out' }}
            />
          </svg>
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            fontWeight: 'bold',
            fontSize: '1.2rem',
            color: color
          }}>
            {score}
          </div>
        </div>
        <div style={{
          textAlign: 'center',
          fontSize: '0.9rem',
          color: '#374151',
          fontWeight: '500'
        }}>
          {label}
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

      {/* Résultats de l'analyse */}
      {analysisData && (
        <div>
          {/* Score global en vedette */}
          {analysisData.scores.compatibilityScore && (
            <div style={{
              background: 'linear-gradient(135deg, #0f766e 0%, #0891b2 100%)',
              color: 'white',
              padding: '2rem',
              borderRadius: '12px',
              textAlign: 'center',
              marginBottom: '2rem',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
            }}>
              <h2 style={{ marginBottom: '0.5rem', fontSize: '1.5rem', color: 'white' }}>
              {`Score de compatibilité avec le poste de ${displayedTitle}`}
              </h2>
              <div style={{ fontSize: '4rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                {analysisData.scores.compatibilityScore}/100
              </div>
              <p style={{ fontSize: '1.1rem', opacity: 0.9 }}>
                Analyse professionnelle complète
              </p>
            </div>
          )}

          {/* Graphiques en cercles */}
          {analysisData.scores && (
            <div style={{
              background: '#f8fafc',
              padding: '1.5rem',
              borderRadius: '12px',
              marginBottom: '1.5rem'
            }}>
              <h3 style={{ marginBottom: '1.5rem', color: '#374151', textAlign: 'center' }}>
                Scores détaillés par domaine
              </h3>
              
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                gap: '1rem',
                justifyItems: 'center'
              }}>
                {Object.entries(analysisData.scores)
                  .filter(([key]) => key !== 'compatibilityScore')
                  .map(([key, score]) => {
                    const labels = {
                      technical: 'Technique',
                      soft: 'Soft Skills',
                      experience: 'Expérience',
                      education: 'Formation',
                      culture: 'Culture'
                    };
                    
                    return (
                      <CircularScore
                        key={key}
                        score={score}
                        label={labels[key] || key}
                        color={getScoreColor(score)}
                      />
                    );
                  })}
              </div>
            </div>
          )}

          {/* Analyse textuelle complète */}
          <div style={{
            background: 'white',
            padding: '2rem',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
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
            
            <SimpleMarkdownRenderer content={analysisData.fullText} />
            
            {!analysisData.hasValidScores && (
              <div style={{
                background: '#fef3c7',
                padding: '1rem',
                borderRadius: '8px',
                marginTop: '1rem',
                fontSize: '0.9rem',
                color: '#92400e'
              }}>
                💡 Les scores affichés sont des estimations. L'analyse textuelle contient l'évaluation détaillée.
              </div>
            )}
          </div>

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
