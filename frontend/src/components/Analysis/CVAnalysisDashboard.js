import React from 'react';
import LoadingMessage from '../Common/LoadingMessage';

const CVAnalysisDashboard = ({ analysisData, loading, error, onStartNextStep }) => {
  if (loading) {
    return (
      <LoadingMessage 
        message="Analyse de votre CV en cours..."
        subtitle="L'IA analyse votre CV et génère des recommandations personnalisées"
        size="large"
      />
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
      // estimatedTime removed - not needed
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


      {/* Bilan rapide et Synthèse côte à côte */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '2rem',
        marginBottom: '2rem'
      }}>
        {/* Bilan rapide */}
        <div style={{
          background: 'white',
          padding: '2rem',
          borderRadius: '16px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center'
        }}>
          <h3 style={{ margin: '0 0 1.5rem 0', color: '#1f2937', fontSize: '1.3rem', fontWeight: '600' }}>
            ✩ Bilan rapide
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '1.5rem' }}>
            <div style={{
              width: '100px',
              height: '100px',
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
                inset: '6px',
                borderRadius: '50%',
                background: 'white',
                zIndex: 1
              }}></div>
              <span style={{ fontSize: '2.2rem', fontWeight: '700', color: '#0a6b79', zIndex: 2, position: 'relative' }}>
                {parsedData.globalScore || 7}
              </span>
              <span style={{ fontSize: '1rem', color: '#6b7280', zIndex: 2, position: 'relative' }}>/10</span>
            </div>
            <span style={{ fontSize: '1rem', color: '#6b7280', fontWeight: '500' }}>Note globale</span>
          </div>
          <div style={{ marginBottom: '1.5rem' }}>
            <p style={{ margin: 0, color: '#374151', lineHeight: '1.6', fontSize: '1rem' }}>
              Votre profil est solide. Quelques ajustements peuvent faire la différence.
            </p>
          </div>
          {/* Temps estimé supprimé - pas nécessaire */}
          <button 
            onClick={() => window.location.href = '/cv-ats-optimization'}
            style={{
              width: '100%',
              padding: '1rem',
              background: 'linear-gradient(135deg, #0a6b79, #14b8a6)',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              fontSize: '1rem',
              transition: 'all 0.2s ease'
            }}
          >
            🔧 Tester ce CV pour les ATS
          </button>
        </div>

        {/* Synthèse */}
        <div style={{
          background: 'white',
          padding: '2rem',
          borderRadius: '16px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
        }}>
          <h3 style={{ margin: '0 0 1.5rem 0', color: '#1f2937', fontSize: '1.3rem', fontWeight: '600' }}>
            📋 Synthèse
          </h3>
          <div style={{ 
            color: '#374151', 
            lineHeight: '1.6', 
            fontSize: '1rem',
            maxHeight: '300px',
            overflowY: 'auto'
          }}>
            {parsedData.synthesis || "Aucune synthèse disponible pour le moment."}
          </div>
        </div>
      </div>

      {/* Sections d'analyse */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '1.5rem'
      }}>


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


      </div>
    </div>
  );
};

export default CVAnalysisDashboard;
