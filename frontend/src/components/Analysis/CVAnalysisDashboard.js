import React from 'react';

const CVAnalysisDashboard = ({ analysisData, loading, error, onStartNextStep }) => {
  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <div>Analyse de votre CV en cours...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#dc2626' }}>
        <div>❌ {error}</div>
      </div>
    );
  }

  if (!analysisData) {
    return null;
  }

  // Essayer de parser le JSON
  let parsedData = null;
  try {
    if (typeof analysisData === 'string') {
      parsedData = JSON.parse(analysisData);
    } else if (typeof analysisData === 'object') {
      parsedData = analysisData;
    }
  } catch (e) {
    // Ce n'est pas du JSON, utiliser des données par défaut
    parsedData = {
      synthesis: "Analyse de CV en cours...",
      strengths: ["Point fort 1", "Point fort 2", "Point fort 3"],
      improvements: ["Axe d'amélioration 1", "Axe d'amélioration 2"],
      recommendations: ["Recommandation 1", "Recommandation 2"],
      globalScore: 7,
      estimatedTime: "10 min"
    };
  }

  return (
    <div style={{ 
      maxWidth: '1200px', 
      margin: '0 auto', 
      padding: '2rem',
      background: '#f8fafc',
      minHeight: '100vh',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      {/* Header avec navigation des étapes */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        marginBottom: '2rem',
        padding: '1rem',
        background: 'white',
        borderRadius: '12px',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
      }}>
        {[1, 2, 3, 4, 5, 6].map((step) => (
          <div key={step} style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.5rem',
            borderRadius: '8px',
            transition: 'all 0.2s ease',
            cursor: 'pointer',
            ...(step === 1 ? {
              background: '#0a6b79',
              color: 'white'
            } : {})
          }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: step === 1 ? 'white' : '#e5e7eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: '600',
              fontSize: '0.9rem',
              color: step === 1 ? '#0a6b79' : '#6b7280'
            }}>
              {step}
            </div>
            <span style={{
              fontSize: '0.8rem',
              fontWeight: '500',
              textAlign: 'center',
              whiteSpace: 'nowrap'
            }}>
              {step === 1 && 'Mes documents'}
              {step === 2 && 'Évaluer une offre'}
              {step === 3 && 'Améliorer mon CV'}
              {step === 4 && 'Candidater'}
              {step === 5 && 'Préparer l\'entretien'}
              {step === 6 && 'Tout changer'}
            </span>
          </div>
        ))}
      </div>

      {/* Contenu principal */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '2rem',
        marginBottom: '2rem'
      }}>
        {/* Section documents (gauche) */}
        <div style={{
          background: 'white',
          padding: '1.5rem',
          borderRadius: '12px',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
        }}>
          <h3 style={{ margin: '0 0 1rem 0', color: '#1f2937', fontSize: '1.1rem', fontWeight: '600' }}>
            Vos documents pour personnaliser l'analyse
          </h3>
          <button style={{
            width: '100%',
            padding: '0.75rem',
            background: '#0a6b79',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontWeight: '500',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            marginBottom: '1rem'
          }}>
            📄 Ajouter un document
          </button>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#6b7280', fontWeight: '500' }}>
              Progression
            </label>
            <div style={{
              width: '100%',
              height: '8px',
              background: '#e5e7eb',
              borderRadius: '4px',
              overflow: 'hidden'
            }}>
              <div style={{
                height: '100%',
                background: '#0a6b79',
                width: '40%',
                transition: 'width 0.3s ease'
              }}></div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', background: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
              <div style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '6px', background: '#fef2f2', color: '#dc2626', fontSize: '1.2rem' }}>📄</div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <span style={{ fontWeight: '500', color: '#1f2937', fontSize: '0.9rem' }}>CV_Camille.pdf</span>
                <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>164 Ko</span>
              </div>
              <button style={{ padding: '0.5rem 0.75rem', background: 'white', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer' }}>Ouvrir</button>
            </div>
          </div>
        </div>

        {/* Bilan rapide (droite) */}
        <div style={{
          background: 'white',
          padding: '1.5rem',
          borderRadius: '12px',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center'
        }}>
          <h3 style={{ margin: '0 0 1.5rem 0', color: '#1f2937', fontSize: '1.1rem', fontWeight: '600' }}>
            ✩ Bilan rapide
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '1.5rem' }}>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #0a6b79, #14b8a6)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '0.5rem',
              position: 'relative'
            }}>
              <div style={{
                position: 'absolute',
                inset: '4px',
                borderRadius: '50%',
                background: 'white',
                zIndex: 1
              }}></div>
              <span style={{ fontSize: '1.8rem', fontWeight: '700', color: '#0a6b79', zIndex: 2, position: 'relative' }}>
                {parsedData.globalScore || 7}
              </span>
              <span style={{ fontSize: '0.9rem', color: '#6b7280', zIndex: 2, position: 'relative' }}>/10</span>
            </div>
            <span style={{ fontSize: '0.9rem', color: '#6b7280', fontWeight: '500' }}>Note globale</span>
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <p style={{ margin: 0, color: '#374151', lineHeight: '1.5' }}>
              Votre profil est solide. Quelques ajustements peuvent faire la différence.
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#6b7280', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            🕐 Temps estimé pour l'étape suivante : {parsedData.estimatedTime || "10 min"}
          </div>
          <button style={{
            width: '100%',
            padding: '0.75rem',
            background: '#0a6b79',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontWeight: '500',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem'
          }}>
            ▶️ Commencer maintenant
          </button>
        </div>
      </div>

      {/* Sections d'analyse */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '1.5rem'
      }}>
        {/* Synthèse */}
        <div style={{
          background: 'white',
          borderRadius: '12px',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
          overflow: 'hidden'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '1rem 1.5rem',
            background: '#f9fafb',
            borderBottom: '1px solid #e5e7eb'
          }}>
            <span style={{ color: '#0a6b79', fontSize: '1.2rem' }}>📈</span>
            <h4 style={{ margin: 0, color: '#1f2937', fontSize: '1rem', fontWeight: '600' }}>Synthèse</h4>
          </div>
          <div style={{ padding: '1.5rem' }}>
            <p style={{ margin: 0, color: '#374151', lineHeight: '1.6' }}>
              {parsedData.synthesis || "Synthèse du profil en cours..."}
            </p>
          </div>
        </div>

        {/* Points forts */}
        <div style={{
          background: 'white',
          borderRadius: '12px',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
          overflow: 'hidden'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '1rem 1.5rem',
            background: '#f9fafb',
            borderBottom: '1px solid #e5e7eb'
          }}>
            <span style={{ color: '#0a6b79', fontSize: '1.2rem' }}>✅</span>
            <h4 style={{ margin: 0, color: '#1f2937', fontSize: '1rem', fontWeight: '600' }}>Points forts</h4>
          </div>
          <div style={{ padding: '1.5rem' }}>
            <ul style={{ margin: 0, paddingLeft: 0, listStyle: 'none' }}>
              {(parsedData.strengths || []).map((strength, index) => (
                <li key={index} style={{ padding: '0.5rem 0', color: '#374151', position: 'relative', paddingLeft: '1.5rem' }}>
                  <span style={{ color: '#0a6b79', fontWeight: 'bold', position: 'absolute', left: 0 }}>•</span>
                  {strength}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Axes d'amélioration */}
        <div style={{
          background: 'white',
          borderRadius: '12px',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
          overflow: 'hidden'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '1rem 1.5rem',
            background: '#f9fafb',
            borderBottom: '1px solid #e5e7eb'
          }}>
            <span style={{ color: '#0a6b79', fontSize: '1.2rem' }}>💡</span>
            <h4 style={{ margin: 0, color: '#1f2937', fontSize: '1rem', fontWeight: '600' }}>Axes d'amélioration</h4>
          </div>
          <div style={{ padding: '1.5rem' }}>
            <ul style={{ margin: 0, paddingLeft: 0, listStyle: 'none' }}>
              {(parsedData.improvements || []).map((improvement, index) => (
                <li key={index} style={{ padding: '0.5rem 0', color: '#374151', position: 'relative', paddingLeft: '1.5rem' }}>
                  <span style={{ color: '#0a6b79', fontWeight: 'bold', position: 'absolute', left: 0 }}>•</span>
                  {improvement}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Recommandations */}
        <div style={{
          background: 'white',
          borderRadius: '12px',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
          overflow: 'hidden'
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
            <h4 style={{ margin: 0, color: '#1f2937', fontSize: '1rem', fontWeight: '600' }}>Recommandations concrètes</h4>
          </div>
          <div style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {(parsedData.recommendations || []).map((recommendation, index) => (
                <div key={index} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                  <input type="checkbox" style={{ marginTop: '0.25rem', accentColor: '#0a6b79' }} />
                  <label style={{ color: '#374151', lineHeight: '1.5', cursor: 'pointer', flex: 1 }}>
                    {recommendation}
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Petits indicateurs */}
        <div style={{
          background: 'white',
          borderRadius: '12px',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
          overflow: 'hidden'
        }}>
          <div style={{
            padding: '1rem 1.5rem',
            background: '#f9fafb',
            borderBottom: '1px solid #e5e7eb'
          }}>
            <h4 style={{ margin: 0, color: '#1f2937', fontSize: '1rem', fontWeight: '600' }}>Petits indicateurs</h4>
          </div>
          <div style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 0', borderBottom: '1px solid #f3f4f6' }}>
              <span style={{ color: '#6b7280', fontSize: '0.9rem' }}>Profil complété</span>
              <span style={{ color: '#0a6b79', fontWeight: '600', fontSize: '0.9rem' }}>40%</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 0' }}>
              <span style={{ color: '#6b7280', fontSize: '0.9rem' }}>Recommandations suivies</span>
              <span style={{ color: '#0a6b79', fontWeight: '600', fontSize: '0.9rem' }}>2/5</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CVAnalysisDashboard;
