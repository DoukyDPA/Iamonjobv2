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
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});

  const from = location.state?.from?.pathname || '/dashboard';

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Effacer l'erreur quand l'utilisateur tape
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.email) {
      newErrors.email = 'Email requis';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email invalide';
    }
    
    if (!formData.password) {
      newErrors.password = 'Mot de passe requis';
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
    } else {
      setErrors({ general: result.error });
    }
  };

  return (
    <div className="auth-page">
      <div className="container">
        <div className="auth-container">
          <div className="auth-card">
            <div className="auth-header">
              <h1>Connexion</h1>
              <p>Connectez-vous à votre compte IAMONJOB</p>
            </div>
            
            <form onSubmit={handleSubmit} className="auth-form">
              {errors.general && (
                <div className="alert alert-error">
                  {errors.general}
                </div>
              )}
              
              <div className="form-group">
                <label className="form-label">
                  <FiMail /> Email
                </label>
                <input
                  type="email"
                  name="email"
                  className={`form-control ${errors.email ? 'error' : ''}`}
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="votre@email.com"
                  autoComplete="email"
                  disabled={loading}
                />
                {errors.email && (
                  <span className="form-error">{errors.email}</span>
                )}
              </div>
              
              <div className="form-group">
                <label className="form-label">
                  <FiLock /> Mot de passe
                </label>
                <div className="password-input-wrapper">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    className={`form-control ${errors.password ? 'error' : ''}`}
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
              
              <div className="form-group">
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
                  Créer un compte
                </Link>
              </p>
            </div>
          </div>
          
          <div className="auth-info">
            <h2>🚀 Bienvenue sur IAMONJOB</h2>
            <p>Votre assistant IA pour réussir votre recherche d'emploi</p>
            <ul>
              <li>✅ Analyse et optimisation de CV</li>
              <li>✅ Évaluation de compatibilité avec les offres</li>
              <li>✅ Rédaction de lettres de motivation</li>
              <li>✅ Préparation aux entretiens</li>
              <li>✅ Conseils personnalisés par l'IA</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
