// Configuration API pour production et développement
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://iamonjob-production.up.railway.app'
  : 'http://localhost:8080';

// Fonction pour renouveler automatiquement le token
const refreshToken = async () => {
  try {
    const currentToken = localStorage.getItem('token');
    if (!currentToken) return false;
    
    const response = await fetch(`${API_BASE_URL}/api/auth/refresh-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token: currentToken }),
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data.success && data.token) {
        localStorage.setItem('token', data.token);
        console.log('✅ Token renouvelé automatiquement');
        // Notification discrète pour l'utilisateur
        if (window.toast) {
          window.toast.success('Session renouvelée automatiquement', { 
            duration: 2000,
            position: 'top-right'
          });
        }
        return data.token;
      }
    }
  } catch (error) {
    console.error('Erreur lors du renouvellement du token:', error);
  }
  return false;
};

const api = {
  get: async (url) => {
    const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
    console.log('API GET:', fullUrl);
    
    // Récupérer le token depuis localStorage
    let token = localStorage.getItem('token');
    
    try {
      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
      });
      
      if (!response.ok) {
        // Gérer spécifiquement les erreurs de token expiré
        if (response.status === 401) {
          const responseData = await response.json();
          if (responseData.error?.includes('Token expiré')) {
            console.log('Token expiré détecté dans API GET, tentative de renouvellement...');
            
            // Essayer de renouveler le token
            const newToken = await refreshToken();
            if (newToken) {
              // Retry avec le nouveau token
              const retryResponse = await fetch(fullUrl, {
                method: 'GET',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${newToken}`,
                },
              });
              
              if (retryResponse.ok) {
                const data = await retryResponse.json();
                return { data };
              }
            }
            
            // Si le renouvellement échoue, déconnecter l'utilisateur
            console.log('Impossible de renouveler le token, déconnexion...');
            localStorage.removeItem('token');
            localStorage.removeItem('user_email');
            window.location.href = '/login';
            return;
          }
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return { data };
    } catch (error) {
      console.error('API GET error:', error);
      throw error;
    }
  },
  
  post: async (url, data) => {
    const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
    console.log('API POST:', fullUrl, data);
    
    // Récupérer le token depuis localStorage
    let token = localStorage.getItem('token');
    
    try {
      const response = await fetch(fullUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        body: JSON.stringify(data),
      });
      
      // Récupérer le corps de la réponse même en cas d'erreur
      const responseData = await response.json();
      
      if (!response.ok) {
        // Gérer spécifiquement les erreurs de token expiré
        if (response.status === 401 && responseData.error?.includes('Token expiré')) {
          console.log('Token expiré détecté dans API POST, tentative de renouvellement...');
          
          // Essayer de renouveler le token
          const newToken = await refreshToken();
          if (newToken) {
            // Retry avec le nouveau token
            const retryResponse = await fetch(fullUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${newToken}`,
              },
              body: JSON.stringify(data),
            });
            
            if (retryResponse.ok) {
              const retryData = await retryResponse.json();
              return { data: retryData };
            }
          }
          
          // Si le renouvellement échoue, déconnecter l'utilisateur
          console.log('Impossible de renouveler le token, déconnexion...');
          localStorage.removeItem('token');
          localStorage.removeItem('user_email');
          window.location.href = '/login';
          return;
        }
        
        // Créer une erreur avec le message du serveur
        const errorMessage = responseData.error || `HTTP error! status: ${response.status}`;
        const error = new Error(errorMessage);
        error.status = response.status;
        error.responseData = responseData;
        throw error;
      }
      
      return { data: responseData };
    } catch (error) {
      console.error('API POST error:', error);
      throw error;
    }
  },
  
  delete: async (url) => {
    const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
    console.log('API DELETE:', fullUrl);
    
    // Récupérer le token depuis localStorage
    const token = localStorage.getItem('token');
    
    try {
      const response = await fetch(fullUrl, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return { data };
    } catch (error) {
      console.error('API DELETE error:', error);
      throw error;
    }
  },
  
  put: async (url, data) => {
    const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
    console.log('API PUT:', fullUrl, data);
    
    // Récupérer le token depuis localStorage
    const token = localStorage.getItem('token');
    
    try {
      const response = await fetch(fullUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const responseData = await response.json();
      return { data: responseData };
    } catch (error) {
      console.error('API PUT error:', error);
      throw error;
    }
  },

  // Méthode pour les requêtes admin avec authentification JWT
  postAdmin: async (url, data) => {
    const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
    console.log('API POST Admin:', fullUrl, data);
    
    // Récupérer le token JWT depuis localStorage
    const token = localStorage.getItem('token');
    
    if (!token) {
      throw new Error('Token d\'authentification manquant pour les opérations admin');
    }
    
    try {
      const response = await fetch(fullUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`, // Utilisation du token JWT sécurisé
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const responseData = await response.json();
      return { data: responseData };
    } catch (error) {
      console.error('API POST Admin error:', error);
      throw error;
    }
  },

  // Fonction spéciale pour nettoyer un email bloqué
  cleanupEmail: async (email) => {
    const fullUrl = `${API_BASE_URL}/api/auth/cleanup-email`;
    console.log('🧹 API CLEANUP EMAIL:', fullUrl, { email });
    
    try {
      const response = await fetch(fullUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = errorData.error || `HTTP error! status: ${response.status}`;
        const error = new Error(errorMessage);
        error.status = response.status;
        error.responseData = errorData;
        throw error;
      }
      
      const responseData = await response.json();
      return { data: responseData };
    } catch (error) {
      console.error('API CLEANUP EMAIL error:', error);
      throw error;
    }
  }
};

export default api;
