// FICHIER : frontend/src/services/coverLetterApi.js
// REMPLACER LE CONTENU EXISTANT PAR CETTE VERSION COMPLÈTE

const BASE_URL = process.env.REACT_APP_API_URL || (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:5000');

class CoverLetterApiService {
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
      'Content-Type': 'application/json'
    };

    try {
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
    } catch (error) {
      console.error('Erreur API coverLetterApi:', error);
      throw error;
    }
  }

  /**
   * Génère une lettre de motivation complète
   * @param {string} notes - Notes personnelles optionnelles
   * @returns {Promise<Object>} Réponse avec la lettre générée
   */
  async generateCoverLetter(notes = '') {
    try {
      return await this.makeRequest('/api/cover-letter/generate', {
        method: 'POST',
        body: JSON.stringify({ notes }),
      });
    } catch (error) {
      // En cas d'erreur backend, retourner une réponse cohérente
      return {
        success: false,
        error: error.message || 'Erreur lors de la génération de la lettre'
      };
    }
  }

  /**
   * Obtient des conseils personnalisés pour rédiger une lettre de motivation
   * @returns {Promise<Object>} Réponse avec les conseils
   */
  async getCoverLetterAdvice() {
    try {
      return await this.makeRequest('/api/cover-letter/advice', {
        method: 'POST',
      });
    } catch (error) {
      // En cas d'erreur backend, retourner une réponse cohérente
      return {
        success: false,
        error: error.message || 'Erreur lors de la génération des conseils'
      };
    }
  }

  /**
   * Récupère le statut des documents pour la lettre de motivation
   * @returns {Promise<Object>} Statut des documents
   */
  async getStatus() {
    try {
      return await this.makeRequest('/api/cover-letter/status', {
        method: 'GET',
      });
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Erreur lors de la récupération du statut'
      };
    }
  }
}

export const coverLetterApi = new CoverLetterApiService();
