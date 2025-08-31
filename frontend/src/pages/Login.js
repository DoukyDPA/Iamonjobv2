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
    <div className="revolutionary-auth-page">
      <div className="revolutionary-auth-container">
        <div className="revolutionary-auth-card">
          <div className="revolutionary-auth-header">
            <div className="revolutionary-auth-logo">
              <img 
                src={`${process.env.PUBLIC_URL}/logo_iamonjob.png`}
                alt="IAMONJOB" 
                className="revolutionary-auth-logo-image"
              />
            </div>
            <h1>Connexion</h1>
            <p>Accédez à votre assistant IA personnalisé</p>
          </div>
            
          <form onSubmit={handleSubmit} className="revolutionary-auth-form">
            <div className="revolutionary-form-group">
              <label htmlFor="email" className="revolutionary-form-label">
                <FiMail className="revolutionary-form-icon" />
                Email
              </label>
              <input
                type="email"
                id="email"
                name="email"
                className={`revolutionary-form-input ${errors.email ? 'error' : ''}`}
                value={formData.email}
                onChange={handleChange}
                placeholder="votre@email.com"
                autoComplete="username"
                disabled={loading}
              />
              {errors.email && (
                <span className="revolutionary-form-error">{errors.email}</span>
              )}
            </div>
            
            <div className="revolutionary-form-group">
              <label htmlFor="password" className="revolutionary-form-label">
                <FiLock className="revolutionary-form-icon" />
                Mot de passe
              </label>
              <div className="revolutionary-password-wrapper">
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  name="password"
                  className={`revolutionary-form-input ${errors.password ? 'error' : ''}`}
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  disabled={loading}
                />
                <button
                  type="button"
                  className="revolutionary-password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex="-1"
                >
                  {showPassword ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>
              {errors.password && (
                <span className="revolutionary-form-error">{errors.password}</span>
              )}
            </div>
            
            <div className="revolutionary-form-actions">
              <Link to="/forgot-password" className="revolutionary-auth-link">
                Mot de passe oublié ?
              </Link>
            </div>
            
            <button 
              type="submit" 
              className="revolutionary-auth-btn"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="revolutionary-loading-spinner"></span>
                  Connexion...
                </>
              ) : (
                'Se connecter'
              )}
            </button>
          </form>
          
          <div className="revolutionary-auth-footer">
            <p>
              Pas encore de compte ?{' '}
              <Link to="/register" className="revolutionary-auth-link">
                Créer un compte gratuit
              </Link>
            </p>
          </div>
        </div>
        
        <div className="revolutionary-auth-info">
          <h2>Bienvenue sur IAMONJOB !</h2>
          <p>Votre assistant IA pour réussir votre recherche d'emploi</p>
          <ul>
            <li>Analyse complète de CV</li>
            <li>Évaluation de compatibilité</li>
            <li>Lettres de motivation personnalisées</li>
            <li>Préparation aux entretiens</li>
            <li>Conseils reconversion</li>
          </ul>
          <div className="revolutionary-auth-info-footer">
            <p><strong>Accès gratuit</strong> • IA de dernière génération</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
