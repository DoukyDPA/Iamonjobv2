// services/documentsApi.js
// Service pour gérer les appels API vers le backend Flask

// Correction BASE_URL pour URLs relatives en production
const BASE_URL = process.env.REACT_APP_API_URL || (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:5000');

class DocumentsApiService {
  constructor() {
    this.token = null;
    this.updateToken();
  }

  updateToken() {
    try {
      this.token = localStorage.getItem('token');
    } catch (e) {
      console.warn('localStorage non disponible');
    }
  }

  async makeRequest(url, options = {}) {
    this.updateToken();
    
    const defaultHeaders = {
      'Authorization': this.token ? `Bearer ${this.token}` : '',
    };

    // Ne pas ajouter Content-Type pour FormData (le navigateur le fait automatiquement)
    if (!(options.body instanceof FormData)) {
      defaultHeaders['Content-Type'] = 'application/json';
    }

    const response = await fetch(`${BASE_URL}${url}`, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || `Erreur HTTP: ${response.status}`);
    }

    return data;
  }

  // Upload d'un document
  async uploadDocument(file, documentType) {
    const formData = new FormData();
    formData.append('document', file);
    formData.append('document_type', documentType);

    return this.makeRequest('/api/documents/upload', {
      method: 'POST',
      body: formData,
    });
  }

  // Récupérer le statut des documents
  async getDocumentsStatus() {
    return this.makeRequest('/api/documents/status');
  }

  // Supprimer un document
  async deleteDocument(documentType) {
    return this.makeRequest('/api/documents/delete', {
      method: 'DELETE',
      body: JSON.stringify({ document_type: documentType }),
    });
  }

  // Upload de texte (copier/coller)
  async uploadText(text, documentType) {
    return this.makeRequest('/api/documents/upload-text', {
      method: 'POST',
      body: JSON.stringify({ 
        text: text,
        document_type: documentType 
      }),
    });
  }
}

export const documentsApi = new DocumentsApiService();
