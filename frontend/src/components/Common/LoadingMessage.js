import React from 'react';

const LoadingMessage = ({ 
  message = "Analyse en cours...", 
  subtitle = null,
  size = "medium" // "small", "medium", "large"
}) => {
  const sizeConfig = {
    small: {
      containerPadding: '1.5rem',
      spinnerSize: '3rem',
      titleFontSize: '1rem',
      subtitleFontSize: '0.85rem',
      spinnerBorder: '3px'
    },
    medium: {
      containerPadding: '2rem',
      spinnerSize: '4rem',
      titleFontSize: '1.1rem',
      subtitleFontSize: '0.9rem',
      spinnerBorder: '4px'
    },
    large: {
      containerPadding: '3rem',
      spinnerSize: '5rem',
      titleFontSize: '1.3rem',
      subtitleFontSize: '1rem',
      spinnerBorder: '5px'
    }
  };

  const config = sizeConfig[size];

  return (
    <div style={{ 
      padding: config.containerPadding, 
      textAlign: 'center',
      background: '#f0f9fa',
      borderRadius: '12px',
      border: '1px solid #0a6b79',
      margin: '1rem 0'
    }}>
      <div style={{
        width: config.spinnerSize,
        height: config.spinnerSize,
        border: `${config.spinnerBorder} solid #e5e7eb`,
        borderTop: `${config.spinnerBorder} solid #0a6b79`,
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
        margin: '0 auto 1rem auto'
      }} />
      <h3 style={{ 
        color: '#0a6b79', 
        marginBottom: subtitle ? '0.5rem' : '0', 
        fontSize: config.titleFontSize, 
        fontWeight: '600' 
      }}>
        {message}
      </h3>
      {subtitle && (
        <p style={{ 
          color: '#0a6b79', 
          margin: 0, 
          fontSize: config.subtitleFontSize,
          fontWeight: '400'
        }}>
          {subtitle}
        </p>
      )}
      
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default LoadingMessage;
