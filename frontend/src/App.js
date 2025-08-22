// Configuration API pour production et développement
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://iamonjob-production.up.railway.app'
  : 'http://localhost:8080';

const api = {
  get: async (url) => {
    const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
    console.log('API GET:', fullUrl);
    
    // Récupérer le token depuis localStorage
    const token = localStorage.getItem('token');
    
    try {
      const response = await fetch(fullUrl, {
        method: 'GET',
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
      console.error('API GET error:', error);
      throw error;
    }
  },
  
  post: async (url, data) => {
    const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
    console.log('API POST:', fullUrl, data);
    
    // Récupérer le token depuis localStorage
    const token = localStorage.getItem('token');
    
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
  }
};

export default api;
