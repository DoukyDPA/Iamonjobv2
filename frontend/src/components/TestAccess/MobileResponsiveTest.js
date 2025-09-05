import React, { useState } from 'react';
import { FiSmartphone, FiTablet, FiMonitor } from 'react-icons/fi';

const MobileResponsiveTest = () => {
  const [currentViewport, setCurrentViewport] = useState('desktop');

  const viewports = {
    mobile: { width: '375px', height: '667px', icon: FiSmartphone, label: 'Mobile' },
    tablet: { width: '768px', height: '1024px', icon: FiTablet, label: 'Tablette' },
    desktop: { width: '100%', height: '100%', icon: FiMonitor, label: 'Desktop' }
  };

  const testServices = [
    {
      id: 'test1',
      title: 'Analyse de CV - Service très long qui pourrait déborder',
      description: 'Laissez notre IA analyser votre CV et obtenir des recommandations personnalisées.',
      difficulty: 'beginner',
      duration: '3-5 min'
    },
    {
      id: 'test2',
      title: 'Matching CV-Offre',
      description: 'Découvrez votre taux de compatibilité avec une offre d\'emploi.',
      difficulty: 'intermediate',
      duration: '5-10 min'
    }
  ];

  const currentViewportConfig = viewports[currentViewport];
  const ViewportIcon = currentViewportConfig.icon;

  return (
    <div className="mobile-responsive-test" style={{ padding: '2rem' }}>
      {/* Contrôles de test */}
      <div className="test-controls" style={{
        position: 'fixed',
        top: '10px',
        right: '10px',
        zIndex: 1000,
        background: 'white',
        padding: '1rem',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        border: '1px solid #e5e7eb'
      }}>
        <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem' }}>Test Responsive</h3>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {Object.entries(viewports).map(([key, config]) => {
            const Icon = config.icon;
            return (
              <button
                key={key}
                onClick={() => setCurrentViewport(key)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  padding: '0.5rem 0.75rem',
                  border: currentViewport === key ? '2px solid #0a6b79' : '1px solid #e5e7eb',
                  borderRadius: '6px',
                  background: currentViewport === key ? '#f0f9ff' : 'white',
                  color: currentViewport === key ? '#0a6b79' : '#374151',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  fontWeight: currentViewport === key ? '600' : '400'
                }}
              >
                <Icon size={16} />
                {config.label}
              </button>
            );
          })}
        </div>
        <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#6b7280' }}>
          Viewport: {currentViewportConfig.width} × {currentViewportConfig.height}
        </div>
      </div>

      {/* Header de test */}
      <div style={{
        background: 'linear-gradient(135deg, #0a6b79 0%, #27a2b4 100%)',
        color: 'white',
        padding: '2rem',
        textAlign: 'center',
        borderRadius: '12px',
        marginBottom: '2rem'
      }}>
        <h1 style={{ margin: '0 0 0.5rem 0', fontSize: '2rem' }}>
          🧪 Test Responsive Mobile
        </h1>
        <p style={{ margin: '0', fontSize: '1rem', opacity: 0.9 }}>
          Vérification des corrections mobile
        </p>
      </div>

      {/* Conteneur de test avec viewport simulé */}
      <div style={{
        width: currentViewportConfig.width,
        height: currentViewportConfig.height,
        margin: '0 auto',
        border: '2px solid #e5e7eb',
        borderRadius: '8px',
        overflow: 'hidden',
        background: '#f8fafc',
        position: 'relative',
        marginBottom: '2rem'
      }}>
        {/* Onglets de test */}
        <div style={{
          background: 'white',
          padding: '0.5rem',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          gap: '0.25rem',
          overflowX: 'auto'
        }}>
          {['Documents', 'Services', 'Partners'].map((tab, index) => (
            <button
              key={tab}
              style={{
                padding: '0.75rem 1rem',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                background: index === 0 ? '#0a6b79' : 'white',
                color: index === 0 ? 'white' : '#374151',
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontWeight: '500',
                whiteSpace: 'nowrap',
                minWidth: '80px'
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Contenu de test - Services */}
        <div style={{ padding: '1rem' }}>
          <h2 style={{ 
            fontSize: '1.25rem', 
            margin: '0 0 1rem 0',
            color: '#1f2937',
            textAlign: 'center'
          }}>
            ⚡ Services IA
          </h2>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: currentViewport === 'desktop' ? 'repeat(2, 1fr)' : '1fr',
            gap: '1rem'
          }}>
            {testServices.map((service) => (
              <div
                key={service.id}
                className="action-card"
                style={{
                  background: 'white',
                  border: '2px solid #e5e7eb',
                  borderRadius: '12px',
                  padding: '1.5rem',
                  transition: 'all 0.2s ease',
                  cursor: 'pointer'
                }}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  marginBottom: '1rem'
                }}>
                  <div style={{
                    width: '50px',
                    height: '50px',
                    background: 'linear-gradient(135deg, #0a6b79 0%, #27a2b4 100%)',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '1.5rem'
                  }}>
                    ⚡
                  </div>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ 
                      margin: '0 0 0.5rem 0', 
                      fontSize: '1.1rem',
                      fontWeight: '600',
                      lineHeight: '1.3',
                      wordWrap: 'break-word',
                      overflowWrap: 'break-word'
                    }}>
                      {service.title}
                    </h3>
                    <div style={{
                      display: 'flex',
                      gap: '0.5rem',
                      flexWrap: 'wrap'
                    }}>
                      <span style={{
                        padding: '0.25rem 0.5rem',
                        background: '#f3f4f6',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        color: '#374151'
                      }}>
                        {service.difficulty}
                      </span>
                      <span style={{
                        padding: '0.25rem 0.5rem',
                        background: '#f3f4f6',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        color: '#374151'
                      }}>
                        {service.duration}
                      </span>
                    </div>
                  </div>
                </div>
                
                <p style={{
                  margin: '0 0 1rem 0',
                  fontSize: '0.9rem',
                  lineHeight: '1.4',
                  color: '#6b7280'
                }}>
                  {service.description}
                </p>

                <button style={{
                  width: '100%',
                  padding: '0.75rem',
                  background: 'linear-gradient(135deg, #0a6b79 0%, #27a2b4 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '0.9rem',
                  fontWeight: '500',
                  cursor: 'pointer',
                  minHeight: '44px'
                }}>
                  🚀 Accéder au service
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Instructions de test */}
      <div style={{
        padding: '1rem',
        background: '#f8fafc',
        borderRadius: '8px',
        border: '1px solid #e5e7eb'
      }}>
        <h3 style={{ margin: '0 0 1rem 0', color: '#1f2937' }}>
          ✅ Points à vérifier :
        </h3>
        <ul style={{ margin: '0', paddingLeft: '1.5rem', color: '#4b5563' }}>
          <li>Les titres de métiers ne débordent pas et s'adaptent à la largeur</li>
          <li>Les onglets sont visibles et accessibles sur mobile</li>
          <li>Les cartes s'empilent correctement en une colonne sur mobile</li>
          <li>Les boutons ont une taille tactile suffisante (min 44px)</li>
          <li>Les textes sont lisibles sans zoom</li>
          <li>Les éléments interactifs sont facilement cliquables</li>
        </ul>
      </div>
    </div>
  );
};

export default MobileResponsiveTest;
