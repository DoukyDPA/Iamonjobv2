// FICHIER : frontend/src/hooks/usePersistentData.js
// HOOK PERSONNALISÉ - Gestion robuste de la persistance des données

import { useState, useEffect, useCallback } from 'react';

/**
 * Hook personnalisé pour gérer la persistance des données
 * Combine localStorage et API pour une synchronisation robuste
 */
export const usePersistentData = (key, initialValue = null) => {
  const [data, setData] = useState(initialValue);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Clé de version pour invalider le cache si nécessaire
  const VERSION_KEY = `${key}_version`;
  const DATA_KEY = `${key}_data`;
  const TIMESTAMP_KEY = `${key}_timestamp`;
  const CURRENT_VERSION = '1.0.0';

  // Fonction pour sauvegarder dans localStorage
  const saveToLocalStorage = useCallback((value) => {
    try {
      const dataToSave = {
        value,
        timestamp: Date.now(),
        version: CURRENT_VERSION
      };
      localStorage.setItem(DATA_KEY, JSON.stringify(dataToSave));
      localStorage.setItem(VERSION_KEY, CURRENT_VERSION);
      localStorage.setItem(TIMESTAMP_KEY, Date.now().toString());
    } catch (error) {
      console.warn('Erreur sauvegarde localStorage:', error);
    }
  }, [DATA_KEY, VERSION_KEY, TIMESTAMP_KEY]);

  // Fonction pour récupérer depuis localStorage
  const loadFromLocalStorage = useCallback(() => {
    try {
      const storedData = localStorage.getItem(DATA_KEY);
      const storedVersion = localStorage.getItem(VERSION_KEY);
      
      if (storedData && storedVersion === CURRENT_VERSION) {
        const parsedData = JSON.parse(storedData);
        // Vérifier que les données ne sont pas trop anciennes (24h)
        const maxAge = 24 * 60 * 60 * 1000; // 24 heures
        if (Date.now() - parsedData.timestamp < maxAge) {
          return parsedData.value;
        }
      }
      return null;
    } catch (error) {
      console.warn('Erreur chargement localStorage:', error);
      return null;
    }
  }, [DATA_KEY, VERSION_KEY]);

  // Fonction pour sauvegarder sur le serveur
  const saveToServer = useCallback(async (value) => {
    try {
      const response = await fetch('/api/data/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        },
        body: JSON.stringify({
          key: key,
          data: value,
          timestamp: Date.now()
        })
      });

      if (!response.ok) {
        throw new Error('Erreur sauvegarde serveur');
      }

      return true;
    } catch (error) {
      console.warn('Erreur sauvegarde serveur:', error);
      return false;
    }
  }, [key]);

  // Fonction pour charger depuis le serveur
  const loadFromServer = useCallback(async () => {
    try {
      const response = await fetch(`/api/data/load?key=${key}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        }
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          return result.data;
        }
      }
      return null;
    } catch (error) {
      console.warn('Erreur chargement serveur:', error);
      return null;
    }
  }, [key]);

  // Fonction pour mettre à jour les données
  const updateData = useCallback(async (newValue) => {
    setData(newValue);
    
    // Sauvegarde locale immédiate
    saveToLocalStorage(newValue);
    
    // Sauvegarde serveur en arrière-plan
    saveToServer(newValue);
  }, [saveToLocalStorage, saveToServer]);

  // Fonction pour forcer le rechargement depuis le serveur
  const refreshFromServer = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const serverData = await loadFromServer();
      if (serverData) {
        setData(serverData);
        saveToLocalStorage(serverData);
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  }, [loadFromServer, saveToLocalStorage]);

  // Fonction pour nettoyer les données
  const clearData = useCallback(() => {
    setData(initialValue);
    try {
      localStorage.removeItem(DATA_KEY);
      localStorage.removeItem(VERSION_KEY);
      localStorage.removeItem(TIMESTAMP_KEY);
    } catch (error) {
      console.warn('Erreur nettoyage localStorage:', error);
    }
  }, [DATA_KEY, VERSION_KEY, TIMESTAMP_KEY, initialValue]);

  // Effet pour charger les données au montage
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // 1. Essayer de charger depuis localStorage
        const localData = loadFromLocalStorage();
        if (localData) {
          setData(localData);
        }

        // 2. Essayer de charger depuis le serveur
        const serverData = await loadFromServer();
        if (serverData) {
          setData(serverData);
          saveToLocalStorage(serverData);
        } else if (!localData) {
          // Aucune donnée disponible, utiliser la valeur initiale
          setData(initialValue);
        }
      } catch (error) {
        setError(error.message);
        // En cas d'erreur, utiliser les données locales ou la valeur initiale
        const localData = loadFromLocalStorage();
        setData(localData || initialValue);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [loadFromLocalStorage, loadFromServer, saveToLocalStorage, initialValue]);

  return {
    data,
    isLoading,
    error,
    updateData,
    refreshFromServer,
    clearData
  };
};

// FICHIER : frontend/src/utils/dataSync.js
// UTILITAIRE - Synchronisation robuste des données

/**
 * Gestionnaire de synchronisation des données
 * Assure la cohérence entre localStorage, état React et serveur
 */
export class DataSyncManager {
  constructor() {
    this.syncQueue = [];
    this.isOnline = navigator.onLine;
    this.listeners = new Set();
    
    // Écouter les changements de connexion
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.processSyncQueue();
    });
    
    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
  }

  /**
   * Ajouter un listener pour les changements de données
   */
  addListener(callback) {
    this.listeners.add(callback);
  }

  /**
   * Supprimer un listener
   */
  removeListener(callback) {
    this.listeners.delete(callback);
  }

  /**
   * Notifier tous les listeners
   */
  notifyListeners(key, data) {
    this.listeners.forEach(callback => {
      try {
        callback(key, data);
      } catch (error) {
        console.warn('Erreur notification listener:', error);
      }
    });
  }

  /**
   * Synchroniser des données
   */
  async syncData(key, data) {
    // Sauvegarder localement immédiatement
    this.saveToLocalStorage(key, data);
    
    if (this.isOnline) {
      // Essayer la synchronisation serveur
      try {
        await this.saveToServer(key, data);
        this.notifyListeners(key, data);
      } catch (error) {
        // Ajouter à la queue pour plus tard
        this.addToSyncQueue(key, data);
      }
    } else {
      // Ajouter à la queue pour synchronisation ultérieure
      this.addToSyncQueue(key, data);
    }
  }

  /**
   * Ajouter à la queue de synchronisation
   */
  addToSyncQueue(key, data) {
    // Éviter les doublons
    const existingIndex = this.syncQueue.findIndex(item => item.key === key);
    if (existingIndex !== -1) {
      this.syncQueue[existingIndex] = { key, data, timestamp: Date.now() };
    } else {
      this.syncQueue.push({ key, data, timestamp: Date.now() });
    }
  }

  /**
   * Traiter la queue de synchronisation
   */
  async processSyncQueue() {
    if (!this.isOnline || this.syncQueue.length === 0) return;

    const itemsToSync = [...this.syncQueue];
    this.syncQueue = [];

    for (const item of itemsToSync) {
      try {
        await this.saveToServer(item.key, item.data);
        this.notifyListeners(item.key, item.data);
      } catch (error) {
        // Remettre dans la queue si échec
        this.addToSyncQueue(item.key, item.data);
      }
    }
  }

  /**
   * Sauvegarder dans localStorage
   */
  saveToLocalStorage(key, data) {
    try {
      const dataToSave = {
        value: data,
        timestamp: Date.now(),
        version: '1.0.0'
      };
      localStorage.setItem(`iamonjob_${key}`, JSON.stringify(dataToSave));
    } catch (error) {
      console.warn('Erreur sauvegarde localStorage:', error);
    }
  }

  /**
   * Charger depuis localStorage
   */
  loadFromLocalStorage(key) {
    try {
      const stored = localStorage.getItem(`iamonjob_${key}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Vérifier que les données ne sont pas trop anciennes
        const maxAge = 24 * 60 * 60 * 1000; // 24 heures
        if (Date.now() - parsed.timestamp < maxAge) {
          return parsed.value;
        }
      }
      return null;
    } catch (error) {
      console.warn('Erreur chargement localStorage:', error);
      return null;
    }
  }

  /**
   * Sauvegarder sur le serveur
   */
  async saveToServer(key, data) {
    const response = await fetch('/api/data/save', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
      },
      body: JSON.stringify({
        key: key,
        data: data,
        timestamp: Date.now()
      })
    });

    if (!response.ok) {
      throw new Error('Erreur sauvegarde serveur');
    }

    return await response.json();
  }

  /**
   * Charger depuis le serveur
   */
  async loadFromServer(key) {
    const response = await fetch(`/api/data/load?key=${key}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
      }
    });

    if (response.ok) {
      const result = await response.json();
      if (result.success && result.data) {
        return result.data;
      }
    }
    return null;
  }
}

// Instance globale du gestionnaire de synchronisation
export const dataSyncManager = new DataSyncManager();

export default dataSyncManager;
