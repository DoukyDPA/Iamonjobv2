import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import './AdminUsersPage.css';

const AdminUsersPage = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalTokensUsed: 0,
    averageTokensPerUser: 0
  });

  // Vérifier que l'utilisateur est admin
  useEffect(() => {
    if (user && !user.isAdmin) {
      setError("Accès refusé. Droits administrateur requis.");
      setLoading(false);
    }
  }, [user]);

  // Charger les utilisateurs
  useEffect(() => {
    if (user?.isAdmin) {
      loadUsers();
    }
  }, [user]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/admin/users');
      
      if (response.data.success) {
        setUsers(response.data.users);
        calculateStats(response.data.users);
      } else {
        setError(response.data.error || 'Erreur lors du chargement des utilisateurs');
      }
    } catch (err) {
      setError('Erreur de connexion au serveur');
      console.error('Erreur chargement utilisateurs:', err);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (usersList) => {
    const totalUsers = usersList.length;
    const activeUsers = usersList.filter(u => u.tokens?.used_daily > 0 || u.tokens?.used_monthly > 0).length;
    const totalTokensUsed = usersList.reduce((sum, u) => sum + (u.tokens?.used_monthly || 0), 0);
    const averageTokensPerUser = totalUsers > 0 ? Math.round(totalTokensUsed / totalUsers) : 0;

    setStats({
      totalUsers,
      activeUsers,
      totalTokensUsed,
      averageTokensPerUser
    });
  };

  const toggleAdminStatus = async (userId, currentStatus) => {
    try {
      const response = await api.post(`/api/admin/users/${userId}/admin`, {
        isAdmin: !currentStatus
      });

      if (response.data.success) {
        // Mettre à jour la liste locale
        setUsers(prevUsers => 
          prevUsers.map(user => 
            user.id === userId 
              ? { ...user, isAdmin: !currentStatus }
              : user
          )
        );
        
        // Recalculer les stats
        loadUsers();
      } else {
        alert(`Erreur: ${response.data.error}`);
      }
    } catch (err) {
      alert('Erreur lors de la modification du statut admin');
      console.error('Erreur toggle admin:', err);
    }
  };

  const resetUserTokens = async (userId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir réinitialiser les tokens de cet utilisateur ?')) {
      return;
    }

    try {
      const response = await api.post(`/api/admin/users/${userId}/tokens/reset`);

      if (response.data.success) {
        alert('Tokens réinitialisés avec succès');
        loadUsers(); // Recharger pour mettre à jour les données
      } else {
        alert(`Erreur: ${response.data.error}`);
      }
    } catch (err) {
      alert('Erreur lors de la réinitialisation des tokens');
      console.error('Erreur reset tokens:', err);
    }
  };

  const deleteUser = async (userId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ? Cette action est irréversible.')) {
      return;
    }

    try {
      const response = await api.delete(`/api/admin/users/${userId}`);
      
      if (response.data.success) {
        alert('Utilisateur supprimé avec succès');
        // Recharger la liste des utilisateurs
        loadUsers();
      } else {
        alert('Erreur lors de la suppression');
      }
    } catch (err) {
      alert('Erreur de connexion au serveur');
    }
  };

  const updateUserTokenLimits = async (userId, dailyLimit, monthlyLimit) => {
    try {
      const response = await api.post(`/api/admin/users/${userId}/tokens/limits`, {
        daily_limit: dailyLimit,
        monthly_limit: monthlyLimit
      });

      if (response.data.success) {
        alert('Limites de tokens mises à jour avec succès');
        loadUsers(); // Recharger pour mettre à jour les données
      } else {
        alert(`Erreur: ${response.data.error}`);
      }
    } catch (err) {
      alert('Erreur lors de la mise à jour des limites de tokens');
      console.error('Erreur update token limits:', err);
    }
  };

  const openUserModal = (user) => {
    setSelectedUser(user);
    setShowUserModal(true);
  };

  const closeUserModal = () => {
    setShowUserModal(false);
    setSelectedUser(null);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Jamais';
    try {
      return new Date(dateString).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Date invalide';
    }
  };

  const getTokenUsageColor = (used, limit) => {
    if (!limit || limit === 0) return 'text-gray-500';
    const percentage = (used / limit) * 100;
    if (percentage >= 90) return 'text-red-600 font-bold';
    if (percentage >= 75) return 'text-orange-600';
    if (percentage >= 50) return 'text-yellow-600';
    return 'text-green-600';
  };

      if (!user?.isAdmin) {
    return (
      <div className="admin-users-page">
        <div className="access-denied">
          <h1>🚫 Accès Refusé</h1>
          <p>Vous devez être administrateur pour accéder à cette page.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="admin-users-page">
        <div className="loading">
          <h2>Chargement des utilisateurs...</h2>
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-users-page">
        <div className="error">
          <h2>❌ Erreur</h2>
          <p>{error}</p>
          <button onClick={loadUsers} className="retry-btn">
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-users-page">
      <div className="admin-header">
        <h1>👥 Administration des Utilisateurs</h1>
        <p>Gérez les utilisateurs, leurs droits et leur consommation de tokens</p>
      </div>

      {/* Statistiques */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">👤</div>
          <div className="stat-content">
            <h3>Total Utilisateurs</h3>
            <p className="stat-number">{stats.totalUsers}</p>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">🟢</div>
          <div className="stat-content">
            <h3>Utilisateurs Actifs</h3>
            <p className="stat-number">{stats.activeUsers}</p>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">🎫</div>
          <div className="stat-content">
            <h3>Tokens Utilisés</h3>
            <p className="stat-number">{stats.totalTokensUsed.toLocaleString()}</p>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <h3>Moyenne/Utilisateur</h3>
            <p className="stat-number">{stats.averageTokensPerUser.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="actions-bar">
        <button onClick={loadUsers} className="refresh-btn">
          🔄 Actualiser
        </button>
        <div className="search-box">
          <input 
            type="text" 
            placeholder="Rechercher un utilisateur..."
            onChange={(e) => {
              // TODO: Implémenter la recherche
            }}
          />
        </div>
      </div>

      {/* Liste des utilisateurs */}
      <div className="users-table-container">
        <table className="users-table">
          <thead>
            <tr>
              <th>Utilisateur</th>
              <th>Statut</th>
              <th>Tokens Quotidiens</th>
              <th>Tokens Mensuels</th>
              <th>Dernière Activité</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id} className="user-row">
                <td className="user-info">
                  <div className="user-email">{user.email}</div>
                  <div className="user-id">ID: {user.id}</div>
                </td>
                
                <td className="user-status">
                          <span className={`status-badge ${user.isAdmin ? 'admin' : 'user'}`}>
          {user.isAdmin ? '👑 Admin' : '👤 Utilisateur'}
        </span>
                </td>
                
                <td className="token-usage">
                  <div className="token-bar">
                    <span className={getTokenUsageColor(user.tokens?.used_daily || 0, user.tokens?.daily_tokens || 0)}>
                      {user.tokens?.used_daily || 0} / {user.tokens?.daily_tokens || '∞'}
                    </span>
                  </div>
                </td>
                
                <td className="token-usage">
                  <div className="token-bar">
                    <span className={getTokenUsageColor(user.tokens?.used_monthly || 0, user.tokens?.monthly_tokens || 0)}>
                      {user.tokens?.used_monthly || 0} / {user.tokens?.monthly_tokens || '∞'}
                    </span>
                  </div>
                </td>
                
                <td className="last-activity">
                  {formatDate(user.tokens?.last_reset)}
                </td>
                
                <td className="user-actions">
                  <button 
                    onClick={() => openUserModal(user)}
                    className="action-btn view-btn"
                    title="Voir les détails"
                  >
                    👁️
                  </button>
                  
                  <button 
                                    onClick={() => toggleAdminStatus(user.id, user.isAdmin)}
                className={`action-btn ${user.isAdmin ? 'remove-admin-btn' : 'make-admin-btn'}`}
                title={user.isAdmin ? 'Retirer les droits admin' : 'Donner les droits admin'}
              >
                {user.isAdmin ? '👤' : '👑'}
                  </button>
                  
                  <button 
                    onClick={() => resetUserTokens(user.id)}
                    className="action-btn reset-btn"
                    title="Réinitialiser les tokens"
                  >
                    🔄
                  </button>
                  <button 
                    onClick={() => deleteUser(user.id)}
                    className="action-btn delete-btn"
                    title="Supprimer l'utilisateur"
                  >
                    🗑️
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal de détails utilisateur */}
      {showUserModal && selectedUser && (
        <div className="modal-overlay" onClick={closeUserModal}>
          <div className="user-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>👤 Détails de l'utilisateur</h2>
              <button onClick={closeUserModal} className="close-btn">×</button>
            </div>
            
            <div className="modal-content">
              <div className="user-details">
                <div className="detail-row">
                  <label>Email:</label>
                  <span>{selectedUser.email}</span>
                </div>
                
                <div className="detail-row">
                  <label>ID:</label>
                  <span>{selectedUser.id}</span>
                </div>
                
                <div className="detail-row">
                  <label>Statut:</label>
                          <span className={`status-badge ${selectedUser.isAdmin ? 'admin' : 'user'}`}>
          {selectedUser.isAdmin ? '👑 Administrateur' : '👤 Utilisateur'}
        </span>
                </div>
              </div>
              
              <div className="token-details">
                <h3>🎫 Utilisation des Tokens</h3>
                
                <div className="token-section">
                  <h4>Quotidien</h4>
                  <div className="token-progress">
                    <div className="progress-bar">
                      <div 
                        className="progress-fill daily"
                        style={{
                          width: `${Math.min((selectedUser.tokens?.used_daily || 0) / (selectedUser.tokens?.daily_tokens || 1) * 100, 100)}%`
                        }}
                      ></div>
                    </div>
                    <span className="token-count">
                      {selectedUser.tokens?.used_daily || 0} / {selectedUser.tokens?.daily_tokens || '∞'}
                    </span>
                  </div>
                </div>
                
                <div className="token-section">
                  <h4>Mensuel</h4>
                  <div className="token-progress">
                    <div className="progress-bar">
                      <div 
                        className="progress-fill monthly"
                        style={{
                          width: `${Math.min((selectedUser.tokens?.used_monthly || 0) / (selectedUser.tokens?.monthly_tokens || 1) * 100, 100)}%`
                        }}
                      ></div>
                    </div>
                    <span className="token-count">
                      {selectedUser.tokens?.used_monthly || 0} / {selectedUser.tokens?.monthly_tokens || '∞'}
                    </span>
                  </div>
                </div>
                
                <div className="detail-row">
                  <label>Dernière réinitialisation:</label>
                  <span>{formatDate(selectedUser.tokens?.last_reset)}</span>
                </div>
              </div>
              
              <div className="modal-actions">
                <button 
                  onClick={() => toggleAdminStatus(selectedUser.id, selectedUser.isAdmin)}
                  className={`action-btn large ${selectedUser.isAdmin ? 'remove-admin-btn' : 'make-admin-btn'}`}
                >
                  {selectedUser.isAdmin ? '👤 Retirer les droits admin' : '👑 Donner les droits admin'}
                </button>
                
                <button 
                  onClick={() => {
                    const dailyLimit = prompt('Limite quotidienne de tokens:', selectedUser.tokens?.daily_tokens || 1000);
                    const monthlyLimit = prompt('Limite mensuelle de tokens:', selectedUser.tokens?.monthly_tokens || 10000);
                    
                    if (dailyLimit && monthlyLimit) {
                      updateUserTokenLimits(selectedUser.id, parseInt(dailyLimit), parseInt(monthlyLimit));
                    }
                  }}
                  className="action-btn large"
                  style={{ background: '#3b82f6', color: 'white' }}
                >
                  ⚙️ Modifier les limites de tokens
                </button>
                
                <button 
                  onClick={() => resetUserTokens(selectedUser.id)}
                  className="action-btn large reset-btn"
                >
                  🔄 Réinitialiser les tokens
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsersPage;
