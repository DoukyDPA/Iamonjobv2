import React, { useState } from 'react';

const GDPRTestComponent = () => {
  const [testResults, setTestResults] = useState({});
  const [loading, setLoading] = useState(false);

  const testAPI = async (endpoint, method = 'GET', body = null) => {
    setLoading(true);
    try {
      const options = {
        method,
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      };

      if (body) {
        options.body = JSON.stringify(body);
      }

      const response = await fetch(`/api/gdpr/${endpoint}`, options);
      const data = await response.json();

      setTestResults(prev => ({
        ...prev,
        [endpoint]: {
          status: response.status,
          success: data.success || false,
          data: data,
          error: data.error || null
        }
      }));

      return { status: response.status, data };
    } catch (error) {
      setTestResults(prev => ({
        ...prev,
        [endpoint]: {
          status: 'error',
          success: false,
          error: error.message
        }
      }));
      return { status: 'error', error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const runAllTests = async () => {
    setTestResults({});
    
    // Test 1: Status de l'API
    await testAPI('status');
    
    // Test 2: Résumé des données (nécessite une session)
    await testAPI('data-summary');
    
    // Test 3: Consentement (nécessite une session)
    await testAPI('consent', 'POST', {
      marketing: true,
      analytics: false,
      version: '1.0'
    });
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h2>🧪 Test de l'API GDPR</h2>
      
      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={runAllTests}
          disabled={loading}
          style={{
            padding: '10px 20px',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1
          }}
        >
          {loading ? '⏳ Test en cours...' : '🚀 Lancer les tests'}
        </button>
      </div>

      <div style={{ display: 'grid', gap: '16px' }}>
        {Object.entries(testResults).map(([endpoint, result]) => (
          <div 
            key={endpoint}
            style={{
              padding: '16px',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              backgroundColor: result.success ? '#f0fdf4' : '#fef2f2'
            }}
          >
            <h3 style={{ margin: '0 0 8px 0', color: result.success ? '#059669' : '#dc2626' }}>
              {result.success ? '✅' : '❌'} {endpoint}
            </h3>
            <p style={{ margin: '4px 0', fontSize: '14px' }}>
              <strong>Status:</strong> {result.status}
            </p>
            {result.error && (
              <p style={{ margin: '4px 0', fontSize: '14px', color: '#dc2626' }}>
                <strong>Erreur:</strong> {result.error}
              </p>
            )}
            <details style={{ marginTop: '8px' }}>
              <summary style={{ cursor: 'pointer', fontSize: '14px' }}>Voir la réponse complète</summary>
              <pre style={{ 
                marginTop: '8px', 
                padding: '8px', 
                backgroundColor: '#f8fafc', 
                borderRadius: '4px',
                fontSize: '12px',
                overflow: 'auto'
              }}>
                {JSON.stringify(result.data, null, 2)}
              </pre>
            </details>
          </div>
        ))}
      </div>

      {Object.keys(testResults).length === 0 && (
        <div style={{ 
          padding: '20px', 
          textAlign: 'center', 
          color: '#64748b',
          backgroundColor: '#f8fafc',
          borderRadius: '8px'
        }}>
          Cliquez sur "Lancer les tests" pour tester l'API GDPR
        </div>
      )}
    </div>
  );
};

export default GDPRTestComponent;
