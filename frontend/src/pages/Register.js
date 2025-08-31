import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FiMail, FiLock, FiEye, FiEyeOff, FiCheck } from 'react-icons/fi';

const Register = () => {
  const navigate = useNavigate();
  const { register, loading } = useAuth();
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    dataConsent: false
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
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
    } else if (formData.password.length < 6) {
      newErrors.password = 'Le mot de passe doit contenir au moins 6 caractères';
    }
    
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Confirmation requise';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Les mots de passe ne correspondent pas';
    }
    
    if (!formData.dataConsent) {
      newErrors.dataConsent = 'Vous devez accepter les conditions';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    const result = await register(
      formData.email, 
      formData.password, 
      formData.confirmPassword
    );
    
    if (result.success) {
      navigate('/dashboard');
    } else {
      setErrors({ general: result.error });
    }
  };

  // Calcul de la force du mot de passe
  const getPasswordStrength = () => {
    const password = formData.password;
    if (!password) return { score: 0, label: '', color: '' };
    
    let score = 0;
    if (password.length >= 6) score++;
    if (password.length >= 8) score++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[^a-zA-Z\d]/.test(password)) score++;
    
    const strengthMap = {
      0: { label: 'Très faible', color: '#dc3545' },
      1: { label: 'Faible', color: '#fd7e14' },
      2: { label: 'Moyen', color: '#ffc107' },
      3: { label: 'Bon', color: '#20c997' },
      4: { label: 'Fort', color: '#28a745' },
      5: { label: 'Très fort', color: '#28a745' }
    };
    
    return strengthMap[score] || strengthMap[0];
  };

  const passwordStrength = getPasswordStrength();

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
            <h1>Créer un compte</h1>
            <p>Rejoignez IAMONJOB pour booster votre recherche d'emploi</p>
          </div>
            
          <form onSubmit={handleSubmit} className="revolutionary-auth-form">
            {errors.general && (
              <div className="revolutionary-alert-error">
                {errors.general}
              </div>
            )}
            
            <div className="revolutionary-form-group">
              <label className="revolutionary-form-label">
                <FiMail className="revolutionary-form-icon" /> Email
              </label>
              <input
                type="email"
                name="email"
                className={`revolutionary-form-input ${errors.email ? 'error' : ''}`}
                value={formData.email}
                onChange={handleChange}
                placeholder="votre@email.com"
                autoComplete="email"
                disabled={loading}
              />
              {errors.email && (
                <span className="revolutionary-form-error">{errors.email}</span>
              )}
            </div>
            
            <div className="revolutionary-form-group">
              <label className="revolutionary-form-label">
                <FiLock className="revolutionary-form-icon" /> Mot de passe
              </label>
              <div className="revolutionary-password-wrapper">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  className={`revolutionary-form-input ${errors.password ? 'error' : ''}`}
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  autoComplete="new-password"
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
              {formData.password && (
                <div className="revolutionary-password-strength">
                  <div className="revolutionary-password-strength-bar">
                    <div 
                      className="revolutionary-password-strength-fill"
                      style={{
                        width: `${(passwordStrength.score / 5) * 100}%`,
                        backgroundColor: passwordStrength.color
                      }}
                    />
                  </div>
                  <span 
                    className="revolutionary-password-strength-label"
                    style={{ color: passwordStrength.color }}
                  >
                    {passwordStrength.label}
                  </span>
                </div>
              )}
              {errors.password && (
                <span className="revolutionary-form-error">{errors.password}</span>
              )}
            </div>
            
            <div className="revolutionary-form-group">
              <label className="revolutionary-form-label">
                <FiLock className="revolutionary-form-icon" /> Confirmer le mot de passe
              </label>
              <div className="revolutionary-password-wrapper">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  className={`revolutionary-form-input ${errors.confirmPassword ? 'error' : ''}`}
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  disabled={loading}
                />
                <button
                  type="button"
                  className="revolutionary-password-toggle"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  tabIndex="-1"
                >
                  {showConfirmPassword ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>
              {errors.confirmPassword && (
                <span className="revolutionary-form-error">{errors.confirmPassword}</span>
              )}
            </div>
            
            <div className="revolutionary-form-group">
              <label className="revolutionary-checkbox-label">
                <input
                  type="checkbox"
                  name="dataConsent"
                  checked={formData.dataConsent}
                  onChange={handleChange}
                  disabled={loading}
                />
                <span className="revolutionary-checkbox-custom">
                  {formData.dataConsent && <FiCheck />}
                </span>
                <span>
                  J'accepte le traitement de mes données personnelles conformément à la{' '}
                  <Link to="/privacy" target="_blank" className="revolutionary-auth-link">
                    politique de confidentialité
                  </Link>
                </span>
              </label>
              {errors.dataConsent && (
                <span className="revolutionary-form-error">{errors.dataConsent}</span>
              )}
            </div>
            
            <button 
              type="submit" 
              className="revolutionary-auth-btn"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="revolutionary-loading-spinner"></span>
                  Création du compte...
                </>
              ) : (
                'Créer mon compte'
              )}
            </button>
          </form>
          
          <div className="revolutionary-auth-footer">
            <p>
              Déjà un compte ?{' '}
              <Link to="/login" className="revolutionary-auth-link">
                Se connecter
              </Link>
            </p>
          </div>
        </div>
        
        <div className="revolutionary-auth-info">
          <h2>Pourquoi créer un compte ?</h2>
          <p>Accédez à toutes les fonctionnalités de l'assistant IA</p>
          <ul>
            <li>Sauvegarde de vos documents</li>
            <li>Historique de vos conversations</li>
            <li>Analyses personnalisées</li>
            <li>Suivi de vos candidatures</li>
            <li>Accès illimité à l'IA</li>
          </ul>
          <div className="revolutionary-auth-info-footer">
            <p><strong>100% gratuit</strong> • Sans engagement</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
