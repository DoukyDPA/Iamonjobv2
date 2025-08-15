// frontend/src/pages/TestAnalysis.js - PAGE DE TEST INDEPENDANTE
import React, { useState } from 'react';

const TestAnalysis = () => {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const testAnalysis = () => {
    setLoading(true);
    
    setTimeout(() => {
      setResult({
        score: 85,
        summary: "Test d'analyse réussi !",
        points: ["Point 1", "Point 2", "Point 3"]
      });
      setLoading(false);
    }, 2000);
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <h1>🧪 Test Analyse de Compatibilité</h1>
      
      {!result && !loading && (
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <button
            onClick={testAnalysis}
            style={{
              padding: '1rem 2rem',
              background: '#0a6b79',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '1.1rem'
            }}
          >
            🚀 Tester l'analyse
          </button>
        </div>
      )}

      {loading && (
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <div style={{
            width: '50px',
            height: '50px',
            border: '4px solid #e5e7eb',
            borderTop: '4px solid #0a6b79',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto'
          }} />
          <p>Analyse en cours...</p>
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      )}

      {result && (
        <div style={{ 
          background: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: '12px',
          padding: '2rem'
        }}>
          <h2>✅ Résultat : {result.score}%</h2>
          <p>{result.summary}</p>
          
          <h3>Points d'analyse :</h3>
          <ul>
            {result.points.map((point, index) => (
              <li key={index}>{point}</li>
            ))}
          </ul>
          
          <button
            onClick={() => setResult(null)}
            style={{
              padding: '0.5rem 1rem',
              background: '#6b7280',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              marginTop: '1rem'
            }}
          >
            🔄 Nouveau test
          </button>
        </div>
      )}
    </div>
  );
};

export default TestAnalysis;
