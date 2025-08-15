import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  FiUser, FiMail, FiLock, FiSave, 
  FiActivity, FiFileText, FiTarget, FiMic 
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import './Profile.css';

const Profile = () => {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState('info');
  const [formData, setFormData] = useState({
    email: user?.email || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  // Statistiques simulées (à remplacer par des vraies données)
  const stats = {
    cvAnalyses: 12,
    lettersGenerated: 8,
    jobApplications: 15,
    interviewPreps: 5,
    accountCreated: '15 janvier 2025',
    lastActivity: 'Il y a 2 heures'
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    // TODO: Implémenter la mise à jour du profil
    toast.success('Profil mis à jour avec succès');
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    
    if (formData.newPassword !== formData.confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }
    
    // TODO: Implémenter le changement de mot de passe
    toast.success('Mot de passe modifié avec succès');
    
    // Réinitialiser le formulaire
    setFormData(prev => ({
      ...prev,
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    }));
  };

  return (
    <div className="profile-page">
      <div className="container">
        <div className="profile-header">
          <h1>Mon Profil</h1>
          <p>Gérez vos informations personnelles et vos préférences</p>
        </div>

        <div className="profile-content">
          {/* Sidebar avec tabs */}
          <div className="profile-sidebar">
            <button
              className={`profile-tab ${activeTab === 'info' ? 'active' : ''}`}
              onClick={() => setActiveTab('info')}
            >
              <FiUser />
              Informations
            </button>
            <button
              className={`profile-tab ${activeTab === 'security' ? 'active' : ''}`}
              onClick={() => setActiveTab('security')}
            >
              <FiLock />
              Sécurité
            </button>
            <button
              className={`profile-tab ${activeTab === 'stats' ? 'active' : ''}`}
              onClick={() => setActiveTab('stats')}
            >
              <FiActivity />
              Statistiques
            </button>
          </div>

          {/* Contenu principal */}
          <div className="profile-main">
            {/* Tab Informations */}
            {activeTab === 'info' && (
              <div className="profile-section">
                <h2>Informations personnelles</h2>
                <form onSubmit={handleUpdateProfile} className="profile-form">
                  <div className="form-group">
                    <label className="form-label">
                      <FiMail /> Email
                    </label>
                    <input
                      type="email"
                      name="email"
                      className="form-control"
                      value={formData.email}
                      onChange={handleChange}
                      disabled // Email non modifiable pour l'instant
                    />
                    <small className="form-help">
                      L'email ne peut pas être modifié pour le moment
                    </small>
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      <FiUser /> Nom d'utilisateur
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      value={user?.email?.split('@')[0] || ''}
                      disabled
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      Membre depuis
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      value={stats.accountCreated}
                      disabled
                    />
                  </div>

                  <button type="submit" className="btn btn-primary">
                    <FiSave />
                    Enregistrer les modifications
                  </button>
                </form>
              </div>
            )}

            {/* Tab Sécurité */}
            {activeTab === 'security' && (
              <div className="profile-section">
                <h2>Sécurité du compte</h2>
                <form onSubmit={handleChangePassword} className="profile-form">
                  <div className="form-group">
                    <label className="form-label">
                      <FiLock /> Mot de passe actuel
                    </label>
                    <input
                      type="password"
                      name="currentPassword"
                      className="form-control"
                      value={formData.currentPassword}
                      onChange={handleChange}
                      placeholder="••••••••"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      <FiLock /> Nouveau mot de passe
                    </label>
                    <input
                      type="password"
                      name="newPassword"
                      className="form-control"
                      value={formData.newPassword}
                      onChange={handleChange}
                      placeholder="••••••••"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      <FiLock /> Confirmer le nouveau mot de passe
                    </label>
                    <input
                      type="password"
                      name="confirmPassword"
                      className="form-control"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      placeholder="••••••••"
                      required
                    />
                  </div>

                  <button type="submit" className="btn btn-primary">
                    Modifier le mot de passe
                  </button>
                </form>

                <div className="security-info">
                  <h3>Conseils de sécurité</h3>
                  <ul>
                    <li>Utilisez un mot de passe unique et complexe</li>
                    <li>Ne partagez jamais votre mot de passe</li>
                    <li>Activez l'authentification à deux facteurs (bientôt)</li>
                    <li>Déconnectez-vous sur les appareils partagés</li>
                  </ul>
                </div>
              </div>
            )}

            {/* Tab Statistiques */}
            {activeTab === 'stats' && (
              <div className="profile-section">
                <h2>Vos statistiques d'utilisation</h2>
                
                <div className="stats-grid">
                  <div className="stat-box">
                    <div className="stat-icon">
                      <FiFileText />
                    </div>
                    <div className="stat-info">
                      <h3>{stats.cvAnalyses}</h3>
                      <p>CV analysés</p>
                    </div>
                  </div>

                  <div className="stat-box">
                    <div className="stat-icon">
                      <FiMail />
                    </div>
                    <div className="stat-info">
                      <h3>{stats.lettersGenerated}</h3>
                      <p>Lettres générées</p>
                    </div>
                  </div>

                  <div className="stat-box">
                    <div className="stat-icon">
                      <FiTarget />
                    </div>
                    <div className="stat-info">
                      <h3>{stats.jobApplications}</h3>
                      <p>Candidatures</p>
                    </div>
                  </div>

                  <div className="stat-box">
                    <div className="stat-icon">
                      <FiMic />
                    </div>
                    <div className="stat-info">
                      <h3>{stats.interviewPreps}</h3>
                      <p>Préparations</p>
                    </div>
                  </div>
                </div>

                <div className="activity-info">
                  <p><strong>Dernière activité :</strong> {stats.lastActivity}</p>
                  <p><strong>Membre depuis :</strong> {stats.accountCreated}</p>
                </div>

                <div className="profile-actions">
                  <button 
                    className="btn btn-primary"
                    onClick={() => navigate('/dashboard')}
                  >
                    Voir le tableau de bord
                  </button>
                  <button className="btn btn-secondary">
                    Télécharger mes données
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
