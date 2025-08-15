import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';

/**
 * Composant de synchronisation des données entre localStorage et Supabase
 * Force l'utilisation de Supabase comme source de vérité
 */
const DataSync = () => {
  const { user } = useAuth();
  const [syncStatus, setSyncStatus] = useState({
    supabaseAvailable: false,
    lastSync: null,
    error: null,
    isSyncing: false
  });

      // Configuration pour forcer Supabase
    const [forceSupabase, setForceSupabase] = useState(false);

  /**
        * Vérifie l'état de synchronisation avec Supabase
   */
  const checkSyncStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/data/sync/check');
      const data = await response.json();
      
      if (data.success) {
        setSyncStatus(prev => ({
          ...prev,
          supabaseAvailable: data.supabase.available,
          lastSync: new Date(),
          error: null
        }));
        
              // Si Supabase est disponible, forcer son utilisation
      if (data.supabase.available && !forceSupabase) {
        await forceSupabaseUsage();
      }
      } else {
        setSyncStatus(prev => ({
          ...prev,
          error: data.error || 'Erreur de vérification'
        }));
      }
    } catch (error) {
      console.error('Erreur vérification sync:', error);
      setSyncStatus(prev => ({
        ...prev,
        error: error.message
      }));
    }
  }, [forceSupabase]);

  /**
        * Force l'utilisation de Supabase
   */
      const forceSupabaseUsage = async () => {
    try {
              const response = await fetch('/api/data/sync/force-supabase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      if (data.success) {
        setForceSupabase(true);
        // Désactiver localStorage dans l'application
        window.disableLocalStorage = true;
        console.log('✅ Supabase forcé, localStorage désactivé');
      }
    } catch (error) {
              console.error('Erreur force Supabase:', error);
    }
  };

  /**
        * Pousse les données du localStorage vers Supabase
   */
      const pushToSupabase = useCallback(async () => {
    if (syncStatus.isSyncing) return;
    
    setSyncStatus(prev => ({ ...prev, isSyncing: true }));
    
    try {
      // Récupérer les données du localStorage
      const localStorageData = localStorage.getItem('iamonjob_data');
      
      if (localStorageData) {
        const parsedData = JSON.parse(localStorageData);
        
        const response = await fetch('/api/data/sync/push', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            localStorage_data: parsedData
          })
        });
        
        const data = await response.json();
        
        if (data.success) {
          console.log('✅ Données synchronisées vers Supabase');
          // Optionnel: supprimer du localStorage après sync
          // localStorage.removeItem('iamonjob_data');
        } else {
          console.error('❌ Échec synchronisation:', data.error);
        }
      }
    } catch (error) {
              console.error('Erreur push vers Supabase:', error);
    } finally {
      setSyncStatus(prev => ({ ...prev, isSyncing: false }));
    }
  }, [syncStatus.isSyncing]);

  /**
        * Récupère les données depuis Supabase
   */
      const pullFromSupabase = useCallback(async () => {
    try {
      const response = await fetch('/api/data/sync/pull');
      const data = await response.json();
      
      if (data.success && data.data) {
        // Remplacer les données localStorage par celles de Supabase
        localStorage.setItem('iamonjob_data', JSON.stringify(data.data));
        console.log('✅ Données récupérées depuis Supabase');
        
        // Déclencher un événement pour notifier l'app
        window.dispatchEvent(new CustomEvent('supabaseDataUpdated', {
          detail: data.data
        }));
      }
    } catch (error) {
              console.error('Erreur pull depuis Supabase:', error);
    }
  }, []);

  /**
   * Synchronisation automatique au chargement
   */
  useEffect(() => {
    const initializeSync = async () => {
      // 1. Vérifier l'état de Supabase
      await checkSyncStatus();
      
      // 2. Si Supabase est disponible, pousser les données localStorage
      if (syncStatus.supabaseAvailable) {
        await pushToSupabase();
        
        // 3. Récupérer les données depuis Supabase
        await pullFromSupabase();
      }
    };

    initializeSync();
  }, []);

  /**
   * Synchronisation périodique
   */
  useEffect(() => {
    if (!syncStatus.supabaseAvailable) return;

    const syncInterval = setInterval(async () => {
              await pullFromSupabase();
    }, 30000); // Sync toutes les 30 secondes

    return () => clearInterval(syncInterval);
  }, [syncStatus.supabaseAvailable, pullFromSupabase]);

  /**
   * Synchronisation lors de la connexion/déconnexion
   */
  useEffect(() => {
    if (user && syncStatus.supabaseAvailable) {
      // L'utilisateur s'est connecté, synchroniser
      pushToSupabase();
      pullFromSupabase();
    }
  }, [user, syncStatus.supabaseAvailable, pushToSupabase, pullFromSupabase]);

  // Composant invisible (pas de rendu UI)
  return null;
};

export default DataSync; 
