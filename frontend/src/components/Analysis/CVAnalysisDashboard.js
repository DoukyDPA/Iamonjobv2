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
      borderRadius: '12px'
    }}>
      <h3 style={{ marginBottom: '2rem', color: '#1f2937' }}>
        📊 Analyse de votre CV
      </h3>
      
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
        gap: '1.5rem' 
      }}>
        {/* Synthèse */}
        <div style={{ 
          background: 'white', 
          padding: '1.5rem', 
          borderRadius: '12px',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
        }}>
          <h4 style={{ margin: '0 0 1rem 0', color: '#0a6b79' }}>📈 Synthèse</h4>
          <p style={{ margin: 0, lineHeight: '1.6' }}>
            {parsedData.synthesis || "Synthèse du profil en cours..."}
          </p>
        </div>

        {/* Points forts */}
        <div style={{ 
          background: 'white', 
          padding: '1.5rem', 
          borderRadius: '12px',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
        }}>
          <h4 style={{ margin: '0 0 1rem 0', color: '#0a6b79' }}>✅ Points forts</h4>
          <ul style={{ margin: 0, paddingLeft: '1.5rem' }}>
            {(parsedData.strengths || []).map((strength, index) => (
              <li key={index} style={{ marginBottom: '0.5rem' }}>{strength}</li>
            ))}
          </ul>
        </div>

        {/* Axes d'amélioration */}
        <div style={{ 
          background: 'white', 
          padding: '1.5rem', 
          borderRadius: '12px',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
        }}>
          <h4 style={{ margin: '0 0 1rem 0', color: '#0a6b79' }}>💡 Axes d'amélioration</h4>
          <ul style={{ margin: 0, paddingLeft: '1.5rem' }}>
            {(parsedData.improvements || []).map((improvement, index) => (
              <li key={index} style={{ marginBottom: '0.5rem' }}>{improvement}</li>
            ))}
          </ul>
        </div>

        {/* Recommandations */}
        <div style={{ 
          background: 'white', 
          padding: '1.5rem', 
          borderRadius: '12px',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
        }}>
          <h4 style={{ margin: '0 0 1rem 0', color: '#0a6b79' }}>📋 Recommandations</h4>
          <ul style={{ margin: 0, paddingLeft: '1.5rem' }}>
            {(parsedData.recommendations || []).map((recommendation, index) => (
              <li key={index} style={{ marginBottom: '0.5rem' }}>{recommendation}</li>
            ))}
          </ul>
        </div>

        {/* Score global */}
        <div style={{ 
          background: 'white', 
          padding: '1.5rem', 
          borderRadius: '12px',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
          textAlign: 'center'
        }}>
          <h4 style={{ margin: '0 0 1rem 0', color: '#0a6b79' }}>⭐ Score global</h4>
          <div style={{ 
            fontSize: '2rem', 
            fontWeight: 'bold', 
            color: '#0a6b79',
            marginBottom: '0.5rem'
          }}>
            {parsedData.globalScore || 7}/10
          </div>
          <div style={{ color: '#6b7280', fontSize: '0.9rem' }}>
            Temps estimé : {parsedData.estimatedTime || "10 min"}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CVAnalysisDashboard;
