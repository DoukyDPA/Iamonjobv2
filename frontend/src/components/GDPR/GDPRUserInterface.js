import React, { useState, useEffect } from 'react';
import './GDPRUserInterface.css';

const GDPRUserInterface = () => {
  const [dataSummary, setDataSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [consent, setConsent] = useState({
    marketing: false,
    analytics: false
  });
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [notifications, setNotifications] = useState([]);

  // États pour les actions
  const [exportLoading, setExportLoading] = useState(false);
  const [consentLoading, setConsentLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    loadDataSummary();
  }, []);

  const addNotification = (type, message) => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, type, message }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  };

  const loadDataSummary = async () => {
    try {
      const response = await fetch('/api/gdpr/data-summary', {
        credentials: 'include'
      });
      const data = await response.json();
      
      if (data.success) {
        setDataSummary(data.data);
        setConsent({
          marketing: data.data.user_info.marketing_consent,
          analytics: data.data.user_info.analytics_consent
        });
      } else {
        addNotification('error', 'Erreur lors du chargement des données');
      }
    } catch (error) {
      console.error('Erreur:', error);
      addNotification('error', 'Impossible de charger vos données');
    } finally {
      setLoading(false);
    }
  };

  const updateConsent = async () => {
    setConsentLoading(true);
    try {
      const response = await fetch('/api/gdpr/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(consent)
      });
      
      const data = await response.json();
      if (data.success) {
        addNotification('success', 'Préférences mises à jour avec succès');
        await loadDataSummary();
      } else {
        addNotification('error', data.error || 'Erreur lors de la mise à jour');
      }
    } catch (error) {
      addNotification('error', 'Erreur de connexion');
    } finally {
      setConsentLoading(false);
    }
  };

  const exportData = async () => {
    setExportLoading(true);
    try {
      const response = await fetch('/api/gdpr/export', {
        credentials: 'include'
      });
      
      const data = await response.json();
      if (data.success) {
        // Télécharger le fichier JSON
        const blob = new Blob([JSON.stringify(data.data, null, 2)], {
          type: 'application/json'
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `mes-donnees-iamonjob-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        addNotification('success', 'Export terminé ! Fichier téléchargé.');
      } else {
        addNotification('error', data.error || 'Erreur lors de l\'export');
      }
    } catch (error) {
      addNotification('error', 'Erreur lors de l\'export');
    } finally {
      setExportLoading(false);
    }
  };

  const requestDeletion = async () => {
    if (deleteConfirmation.toLowerCase() !== 'supprimer définitivement') {
      addNotification('error', 'Veuillez taper exactement "supprimer définitivement"');
      return;
    }

    setDeleteLoading(true);
    try {
      const response = await fetch('/api/gdpr/delete-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ confirmation: deleteConfirmation })
      });
      
      const data = await response.json();
      if (data.success) {
        addNotification('success', `Suppression programmée pour le ${new Date(data.deletion_date).toLocaleDateString('fr-FR')}`);
        setShowDeleteModal(false);
        setDeleteConfirmation('');
        await loadDataSummary();
      } else {
        addNotification('error', data.error || 'Erreur lors de la demande');
      }
    } catch (error) {
      addNotification('error', 'Erreur lors de la demande');
    } finally {
      setDeleteLoading(false);
    }
  };

  const cancelDeletion = async () => {
    try {
      const response = await fetch('/api/gdpr/cancel-deletion', {
        method: 'POST',
        credentials: 'include'
      });
      
      const data = await response.json();
      if (data.success) {
        addNotification('success', 'Suppression annulée avec succès');
        await loadDataSummary();
      } else {
        addNotification('error', data.error || 'Erreur');
      }
    } catch (error) {
      addNotification('error', 'Erreur lors de l\'annulation');
    }
  };

  if (loading) {
    return (
      <div className="gdpr-loading">
        <div className="loading-spinner"></div>
        <p>Chargement de vos données...</p>
      </div>
    );
  }

  const getConsentStatusColor = (status) => {
    switch(status) {
      case 'CONSENT_VALID': return '#10b981';
      case 'CONSENT_EXPIRED': return '#f59e0b';
      case 'NO_CONSENT': return '#ef4444';
      case 'DELETION_REQUESTED': return '#8b5cf6';
      default: return '#6b7280';
    }
  };

  const getConsentStatusText = (status) => {
    switch(status) {
      case 'CONSENT_VALID': return 'Consentement valide';
      case 'CONSENT_EXPIRED': return 'Consentement expiré';
      case 'NO_CONSENT': return 'Pas de consentement';
      case 'DELETION_REQUESTED': return 'Suppression demandée';
      default: return 'Statut inconnu';
    }
  };

  return (
    <div className="gdpr-interface">
      {/* Notifications */}
      <div className="notifications">
        {notifications.map(notif => (
          <div key={notif.id} className={`notification ${notif.type}`}>
            <span className="notif-icon">{notif.type === 'success' ? '✓' : '!'}</span>
            <span>{notif.message}</span>
            <button onClick={() => setNotifications(prev => prev.filter(n => n.id !== notif.id))}>
              ×
            </button>
          </div>
        ))}
      </div>

      <div className="container">
        {/* Header */}
        <div className="gdpr-header">
          <div className="header-content">
            <div className="header-info">
              <h1>
                <span className="header-icon">🛡️</span>
                Mes données personnelles
              </h1>
              <p>Gérez vos données en toute transparence selon le RGPD</p>
            </div>
            
            {dataSummary && (
              <div className="user-status">
                <div className="status-badge" style={{backgroundColor: getConsentStatusColor(dataSummary.user_info.consent_status)}}>
                  {getConsentStatusText(dataSummary.user_info.consent_status)}
                </div>
                <div className="user-info">
                  <strong>{dataSummary.user_info.email}</strong>
                  <span>Membre depuis {new Date(dataSummary.user_info.member_since).toLocaleDateString('fr-FR')}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <div className="tab-navigation">
          <button 
            className={activeTab === 'overview' ? 'active' : ''}
            onClick={() => setActiveTab('overview')}
          >
            <span className="tab-icon">📊</span>
            Vue d'ensemble
          </button>
          <button 
            className={activeTab === 'consent' ? 'active' : ''}
            onClick={() => setActiveTab('consent')}
          >
            <span className="tab-icon">⚙️</span>
            Consentement
          </button>
          <button 
            className={activeTab === 'actions' ? 'active' : ''}
            onClick={() => setActiveTab('actions')}
          >
            <span className="tab-icon">⚖️</span>
            Mes droits
          </button>
          <button 
            className={activeTab === 'info' ? 'active' : ''}
            onClick={() => setActiveTab('info')}
          >
            <span className="tab-icon">ℹ️</span>
            Informations
          </button>
        </div>

        {/* Contenu des onglets */}
        <div className="tab-content">
          
          {/* Vue d'ensemble */}
          {activeTab === 'overview' && dataSummary && (
            <div className="overview-tab">
              <div className="metrics-grid">
                <div className="metric-card">
                  <div className="metric-icon">👤</div>
                  <div className="metric-content">
                    <h3>Compte utilisateur</h3>
                    <div className="metric-value">{dataSummary.user_info.email}</div>
                    <div className="metric-subtitle">
                      Créé le {new Date(dataSummary.user_info.member_since).toLocaleDateString('fr-FR')}
                    </div>
                  </div>
                </div>

                <div className="metric-card">
                  <div className="metric-icon">📈</div>
                  <div className="metric-content">
                    <h3>Activité</h3>
                    <div className="metric-value">{dataSummary.data_summary.total_sessions}</div>
                    <div className="metric-subtitle">Sessions créées</div>
                  </div>
                </div>

                <div className="metric-card">
                  <div className="metric-icon">🕒</div>
                  <div className="metric-content">
                    <h3>Dernière activité</h3>
                    <div className="metric-value">
                      {dataSummary.data_summary.last_activity ? 
                        new Date(dataSummary.data_summary.last_activity).toLocaleDateString('fr-FR') : 
                        'N/A'
                      }
                    </div>
                    <div className="metric-subtitle">Date de connexion</div>
                  </div>
                </div>

                <div className="metric-card">
                  <div className="metric-icon">🤖</div>
                  <div className="metric-content">
                    <h3>Tokens IA</h3>
                    <div className="metric-value">{dataSummary.data_summary.tokens_consumed?.toLocaleString() || 0}</div>
                    <div className="metric-subtitle">Consommés au total</div>
                  </div>
                </div>
              </div>

              <div className="retention-info">
                <h3>Politique de conservation des données</h3>
                <div className="retention-grid">
                  <div className="retention-item">
                    <strong>Sessions utilisateur :</strong>
                    <span>{dataSummary.retention_info.session_data}</span>
                  </div>
                  <div className="retention-item">
                    <strong>Documents uploadés :</strong>
                    <span>{dataSummary.retention_info.documents}</span>
                  </div>
                  <div className="retention-item">
                    <strong>Historique des conversations :</strong>
                    <span>{dataSummary.retention_info.chat_history}</span>
                  </div>
                  <div className="retention-item">
                    <strong>Logs d'utilisation :</strong>
                    <span>{dataSummary.retention_info.usage_logs}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Consentement */}
          {activeTab === 'consent' && (
            <div className="consent-tab">
              <div className="consent-section">
                <h3>Gérer vos préférences de confidentialité</h3>
                <p>Vous contrôlez l'utilisation de vos données personnelles.</p>
                
                <div className="consent-options">
                  <div className="consent-option">
                    <div className="consent-toggle">
                      <input
                        type="checkbox"
                        id="marketing"
                        checked={consent.marketing}
                        onChange={(e) => setConsent({...consent, marketing: e.target.checked})}
                      />
                      <label htmlFor="marketing" className="toggle-switch">
                        <span className="slider"></span>
                      </label>
                    </div>
                    <div className="consent-info">
                      <h4>📧 Communications marketing</h4>
                      <p>Recevoir des newsletters, conseils emploi et informations sur nos nouveautés</p>
                    </div>
                  </div>

                  <div className="consent-option">
                    <div className="consent-toggle">
                      <input
                        type="checkbox"
                        id="analytics"
                        checked={consent.analytics}
                        onChange={(e) => setConsent({...consent, analytics: e.target.checked})}
                      />
                      <label htmlFor="analytics" className="toggle-switch">
                        <span className="slider"></span>
                      </label>
                    </div>
                    <div className="consent-info">
                      <h4>📊 Analyses statistiques</h4>
                      <p>Nous aider à améliorer le service avec des statistiques d'usage anonymisées</p>
                    </div>
                  </div>
                </div>

                <button 
                  className="btn btn-primary"
                  onClick={updateConsent}
                  disabled={consentLoading}
                >
                  {consentLoading ? (
                    <>⏳ Mise à jour...</>
                  ) : (
                    <>💾 Sauvegarder mes préférences</>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Actions RGPD */}
          {activeTab === 'actions' && (
            <div className="actions-tab">
              <div className="actions-grid">
                <div className="action-card">
                  <div className="action-header">
                    <div className="action-icon">📥</div>
                    <h3>Exporter mes données</h3>
                  </div>
                  <p>Téléchargez toutes vos données personnelles au format JSON (droit de portabilité RGPD)</p>
                  <div className="action-details">
                    <small>Inclut : profil, préférences, statistiques d'usage (données anonymisées)</small>
                  </div>
                  <button 
                    className="btn btn-outline"
                    onClick={exportData}
                    disabled={exportLoading}
                  >
                    {exportLoading ? (
                      <>⏳ Export en cours...</>
                    ) : (
                      <>📥 Télécharger mes données</>
                    )}
                  </button>
                </div>

                {dataSummary && !dataSummary.user_info.deletion_requested ? (
                  <div className="action-card danger">
                    <div className="action-header">
                      <div className="action-icon">🗑️</div>
                      <h3>Supprimer mon compte</h3>
                    </div>
                    <p>Suppression définitive de toutes vos données (droit à l'oubli RGPD)</p>
                    <div className="action-details">
                      <small>Action irréversible avec délai de grâce de 30 jours</small>
                    </div>
                    <button 
                      className="btn btn-danger"
                      onClick={() => setShowDeleteModal(true)}
                    >
                      🗑️ Demander la suppression
                    </button>
                  </div>
                ) : (
                  <div className="action-card warning">
                    <div className="action-header">
                      <div className="action-icon">⚠️</div>
                      <h3>Suppression programmée</h3>
                    </div>
                    <p>Votre compte sera supprimé prochainement. Vous pouvez encore annuler cette demande.</p>
                    <button 
                      className="btn btn-warning"
                      onClick={cancelDeletion}
                    >
                      ❌ Annuler la suppression
                    </button>
                  </div>
                )}
              </div>

              <div className="rights-info">
                <h3>Vos droits selon le RGPD</h3>
                <div className="rights-grid">
                  <div className="right-item">
                    <div className="right-icon">👁️</div>
                    <div>
                      <strong>Droit d'accès</strong>
                      <p>Connaître les données vous concernant</p>
                    </div>
                  </div>
                  <div className="right-item">
                    <div className="right-icon">✏️</div>
                    <div>
                      <strong>Droit de rectification</strong>
                      <p>Corriger vos données inexactes</p>
                    </div>
                  </div>
                  <div className="right-item">
                    <div className="right-icon">🗑️</div>
                    <div>
                      <strong>Droit à l'effacement</strong>
                      <p>Supprimer vos données personnelles</p>
                    </div>
                  </div>
                  <div className="right-item">
                    <div className="right-icon">📤</div>
                    <div>
                      <strong>Droit à la portabilité</strong>
                      <p>Récupérer vos données</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Informations */}
          {activeTab === 'info' && (
            <div className="info-tab">
              <div className="info-sections">
                <div className="info-section">
                  <h3>🏢 Responsable du traitement</h3>
                  <div className="info-content">
                    <p><strong>Organisme :</strong> CBE Sud 94</p>
                    <p><strong>Adresse :</strong> 123 Rue de l'Innovation, 94000 Créteil</p>
                    <p><strong>Email :</strong> <a href="mailto:contact@cbesud94.fr">contact@cbesud94.fr</a></p>
                  </div>
                </div>

                <div className="info-section">
                  <h3>🛡️ Délégué à la Protection des Données</h3>
                  <div className="info-content">
                    <p><strong>Email :</strong> <a href="mailto:dpo@cbesud94.fr">dpo@cbesud94.fr</a></p>
                    <p><strong>Délai de réponse :</strong> 1 mois maximum</p>
                  </div>
                </div>

                <div className="info-section">
                  <h3>⚖️ Réclamation</h3>
                  <div className="info-content">
                    <p>En cas de désaccord sur le traitement de vos données personnelles, vous pouvez saisir la CNIL :</p>
                    <p><a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer">www.cnil.fr</a></p>
                  </div>
                </div>

                <div className="info-section">
                  <h3>📋 Base légale des traitements</h3>
                  <div className="info-content">
                    <p><strong>Service IAMONJOB :</strong> Intérêt légitime (accompagnement professionnel)</p>
                    <p><strong>Communications marketing :</strong> Consentement</p>
                    <p><strong>Analyses statistiques :</strong> Consentement</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal de suppression */}
      {showDeleteModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>⚠️ Confirmation de suppression</h3>
              <button 
                className="modal-close"
                onClick={() => setShowDeleteModal(false)}
              >
                ×
              </button>
            </div>
            
            <div className="modal-body">
              <div className="warning-notice">
                <p><strong>ATTENTION : Cette action est irréversible</strong></p>
                <p>Toutes vos données seront supprimées :</p>
                <ul>
                  <li>Votre compte et profil utilisateur</li>
                  <li>Tous vos documents et analyses</li>
                  <li>Votre historique de conversations</li>
                  <li>Vos préférences et paramètres</li>
                </ul>
                <p><strong>Délai de grâce :</strong> 30 jours pour changer d'avis</p>
              </div>
              
              <div className="confirmation-input">
                <label>Pour confirmer, tapez exactement : <strong>"supprimer définitivement"</strong></label>
                <input
                  type="text"
                  value={deleteConfirmation}
                  onChange={(e) => setDeleteConfirmation(e.target.value)}
                  placeholder="supprimer définitivement"
                />
              </div>
            </div>
            
            <div className="modal-actions">
              <button 
                className="btn btn-outline"
                onClick={() => setShowDeleteModal(false)}
                disabled={deleteLoading}
              >
                Annuler
              </button>
              <button 
                className="btn btn-danger"
                onClick={requestDeletion}
                disabled={deleteLoading || deleteConfirmation.toLowerCase() !== 'supprimer définitivement'}
              >
                {deleteLoading ? '⏳ Traitement...' : '🗑️ Confirmer la suppression'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GDPRUserInterface;
