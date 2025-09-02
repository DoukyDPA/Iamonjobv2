import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FiMail, FiArrowLeft } from 'react-icons/fi';
import toast from 'react-hot-toast';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email.trim()) {
      setError('Veuillez saisir votre adresse email');
      return;
    }
    
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Veuillez saisir une adresse email valide');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setEmailSent(true);
        toast.success('Email de réinitialisation envoyé !');
      } else {
        setError(data.message || 'Erreur lors de l\'envoi de l\'email');
        toast.error(data.message || 'Erreur lors de l\'envoi de l\'email');
      }
    } catch (err) {
      setError('Erreur de connexion. Veuillez réessayer.');
      toast.error('Erreur de connexion. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  if (emailSent) {
    return (
      <div className="revolutionary-auth-page">
        <div className="revolutionary-auth-container">
          <div className="revolutionary-auth-card">
            <div className="revolutionary-auth-header">
              <div className="revolutionary-auth-logo">
                <img 
                  src={`${process.env.PUBLIC_URL}/LOGO-COUL-IAMONJOB.png`}
                  alt="IAMONJOB" 
                  className="revolutionary-auth-logo-image"
                />
              </div>
              <h1>Email envoyé !</h1>
              <p>Vérifiez votre boîte de réception</p>
            </div>
            
            <div className="revolutionary-auth-success">
              <div className="revolutionary-success-icon">
                <FiMail />
              </div>
              <p>
                Nous avons envoyé un lien de réinitialisation à <strong>{email}</strong>
              </p>
              <p className="revolutionary-auth-help">
                Vérifiez votre dossier spam si vous ne recevez pas l'email dans les prochaines minutes.
              </p>
            </div>
            
            <div className="revolutionary-form-actions">
              <Link to="/login" className="revolutionary-auth-link">
                <FiArrowLeft /> Retour à la connexion
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="revolutionary-auth-page">
      <div className="revolutionary-auth-container">
        <div className="revolutionary-auth-card">
          <div className="revolutionary-auth-header">
            <div className="revolutionary-auth-logo">
              <img 
                src={`${process.env.PUBLIC_URL}/LOGO-COUL-IAMONJOB.png`}
                alt="IAMONJOB" 
                className="revolutionary-auth-logo-image"
              />
            </div>
            <h1>Mot de passe oublié</h1>
            <p>Saisissez votre email pour recevoir un lien de réinitialisation</p>
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
                className={`revolutionary-form-input ${error ? 'error' : ''}`}
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError('');
                }}
                placeholder="votre@email.com"
                autoComplete="email"
                disabled={loading}
                autoFocus
              />
              {error && (
                <span className="revolutionary-form-error">{error}</span>
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
                  Envoi en cours...
                </>
              ) : (
                'Envoyer le lien de réinitialisation'
              )}
            </button>
          </form>
          
          <div className="revolutionary-form-actions">
            <Link to="/login" className="revolutionary-auth-link">
              <FiArrowLeft /> Retour à la connexion
            </Link>
          </div>
        </div>
        
        <div className="revolutionary-auth-info">
          <h2>Besoin d'aide ?</h2>
          <p>Si vous ne recevez pas l'email de réinitialisation :</p>
          <ul>
            <li>Vérifiez votre dossier spam</li>
            <li>Assurez-vous d'avoir saisi la bonne adresse email</li>
            <li>Contactez le support si le problème persiste</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
