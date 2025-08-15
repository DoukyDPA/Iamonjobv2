// FICHIER : frontend/src/components/TestAccess/TestAccessModal.js
// NOUVEAU FICHIER À CRÉER

import React, { useState } from 'react';
import { FiLock, FiEye, FiEyeOff, FiCheck } from 'react-icons/fi';
import './TestAccessModal.css';

const TestAccessModal = ({ onAccessGranted }) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isError, setIsError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const CORRECT_PASSWORD = 'SILVERIATEST';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setIsError(false);

    // Simulation d'une petite latence pour l'UX
    await new Promise(resolve => setTimeout(resolve, 800));

    if (password === CORRECT_PASSWORD) {
      // Stocker l'accès dans localStorage
      localStorage.setItem('iamonjob_test_access', 'granted');
      localStorage.setItem('iamonjob_test_access_date', new Date().toISOString());
      
      // Notifier le parent
      onAccessGranted();
    } else {
      setIsError(true);
      setPassword('');
    }
    
    setIsLoading(false);
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="test-access-overlay">
      <div className="test-access-modal">
        
        {/* Header */}
        <div className="test-access-header">
          <div className="test-access-logo">
            <img 
              src={`${process.env.PUBLIC_URL}/logo_iamonjob.png`}
              alt="IAMONJOB" 
              className="test-logo"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          </div>
          <h1>🚧 Site en Test</h1>
          <p>Ce site est en phase de finalisation.<br />Pour le tester avec nous, saisissez le mot de passe :</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="test-access-form">
          <div className="input-group">
            <div className="input-wrapper">
              <FiLock className="input-icon" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mot de passe de test"
                className={`password-input ${isError ? 'error' : ''}`}
                disabled={isLoading}
                autoFocus
              />
              <button
                type="button"
                onClick={togglePasswordVisibility}
                className="toggle-password"
                disabled={isLoading}
              >
                {showPassword ? <FiEyeOff /> : <FiEye />}
              </button>
            </div>
            
            {isError && (
              <div className="error-message">
                ❌ Mot de passe incorrect. Veuillez réessayer.
              </div>
            )}
          </div>

          <button 
            type="submit" 
            className="submit-button"
            disabled={!password || isLoading}
          >
            {isLoading ? (
              <>
                <div className="spinner"></div>
                Vérification...
              </>
            ) : (
              <>
                <FiCheck />
                Accéder au site
              </>
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="test-access-footer">
          <p>
            <strong>Testeurs :</strong> Merci de nous aider à améliorer IAMONJOB ! 🙏
          </p>
          <p>
            <small>
              En cas de problème, contactez l'équipe de développement.
            </small>
          </p>
        </div>
      </div>
    </div>
  );
};

export default TestAccessModal;
