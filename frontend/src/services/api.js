// Configuration API pour production et développement
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://iamonjob-production.up.railway.app'
  : 'http://localhost:8080';

const api = {
  get: async (url) => {
    const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
    console.log('API GET:', fullUrl);
    
    try {
      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
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
    
    try {
      const response = await fetch(fullUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const responseData = await response.json();
      return { data: responseData };
    } catch (error) {
      console.error('API POST error:', error);
      throw error;
    }
  },
  
  delete: async (url) => {
    const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
    console.log('API DELETE:', fullUrl);
    
    try {
      const response = await fetch(fullUrl, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
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
    
    try {
      const response = await fetch(fullUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
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

  // Méthode pour les requêtes admin avec authentification
  postAdmin: async (url, data) => {
    const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
    console.log('API POST Admin:', fullUrl, data);
    
    try {
      const response = await fetch(fullUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Basic U2lsdmVyaWE6QWRtaW4xMjM0IQ==', // Silveria:Admin1234! en base64
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
