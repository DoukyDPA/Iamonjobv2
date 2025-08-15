import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FiMail, FiLock, FiEye, FiEyeOff } from 'react-icons/fi';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, loading } = useAuth();
  
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);

  // Redirection après connexion
  const from = location.state?.from?.pathname || '/dashboard';

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Effacer l'erreur du champ modifié
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email requis';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email invalide';
    }
    
    if (!formData.password) {
      newErrors.password = 'Mot de passe requis';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Le mot de passe doit contenir au moins 6 caractères';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    const result = await login(formData.email, formData.password);
    
    if (result.success) {
      navigate(from, { replace: true });
    }
  };

  return (
    <div className="auth-page">
      <div className="container">
        <div className="auth-container">
          <div className="auth-form">
            <div className="auth-header">
              <h1>🔐 Connexion</h1>
              <p>Accédez à votre assistant IA personnalisé</p>
            </div>
            
            <form onSubmit={handleSubmit} className="form">
              <div className="form-group">
                <label htmlFor="email">Email</label>
                <div className="input-wrapper">
                  <FiMail className="input-icon" />
                  <input
                    type="email"
                    id="email"
                    name="email"
                    className={`form-input ${errors.email ? 'error' : ''}`}
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="votre@email.com"
                    autoComplete="username"
                    disabled={loading}
                  />
                </div>
                {errors.email && (
                  <span className="form-error">{errors.email}</span>
                )}
              </div>
              
              <div className="form-group">
                <label htmlFor="password">Mot de passe</label>
                <div className="input-wrapper">
                  <FiLock className="input-icon" />
                  <input
                    type={showPassword ? "text" : "password"}
                    id="password"
                    name="password"
                    className={`form-input ${errors.password ? 'error' : ''}`}
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex="-1"
                  >
                    {showPassword ? <FiEyeOff /> : <FiEye />}
                  </button>
                </div>
                {errors.password && (
                  <span className="form-error">{errors.password}</span>
                )}
              </div>
              
              <div className="form-actions">
                <Link to="/forgot-password" className="auth-link">
                  Mot de passe oublié ?
                </Link>
              </div>
              
              <button 
                type="submit" 
                className="btn btn-primary btn-block"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="loading-spinner"></span>
                    Connexion...
                  </>
                ) : (
                  'Se connecter'
                )}
              </button>
            </form>
            
            <div className="auth-footer">
              <p>
                Pas encore de compte ?{' '}
                <Link to="/register" className="auth-link">
                  Créer un compte gratuit
                </Link>
              </p>
            </div>
          </div>
          
          <div className="auth-info">
            <h2>🚀 Bienvenue sur IAMONJOB !</h2>
            <p>Votre assistant IA pour réussir votre recherche d'emploi</p>
            <ul>
              <li>📄 Analyse complète de CV</li>
              <li>🎯 Évaluation de compatibilité</li>
              <li>✉️ Lettres de motivation personnalisées</li>
              <li>🎤 Préparation aux entretiens</li>
              <li>🔄 Conseils reconversion</li>
            </ul>
            <div className="auth-info-footer">
              <p><strong>Accès gratuit</strong> • IA de dernière génération</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
