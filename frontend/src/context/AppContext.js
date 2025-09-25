// REMPLACER dans frontend/src/context/AppContext.js
// Correction pour utiliser documentsApi au lieu d'appels directs

import React, { createContext, useState, useContext, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { documentsApi } from '../services/documentApi';
import toast from 'react-hot-toast';

const AppContext = createContext({});

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

export const AppProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  
  // États globaux
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [chatLoaded, setChatLoaded] = useState(false);
  const [documentsLoaded, setDocumentsLoaded] = useState(false);
  const [documentStatus, setDocumentStatus] = useState({
    cv: { uploaded: false, processed: false, name: null, size: null, content: '', upload_timestamp: null },
    offre_emploi: { uploaded: false, processed: false, name: null, size: null, content: '', upload_timestamp: null },
    metier_souhaite: { uploaded: false, processed: false, name: null, size: null, content: '', upload_timestamp: null },
    questionnaire: { uploaded: false, processed: false, name: null, size: null, content: '', upload_timestamp: null }
  });

  // Charger l'historique du chat
  const loadChatHistory = async () => {
    if (!isAuthenticated || chatLoaded) return;

    try {
      const response = await fetch('/api/chat/history', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        
        if (data.success && data.history && Array.isArray(data.history)) {
          setMessages(data.history);
          setChatLoaded(true);
        } else {
          addWelcomeMessage();
        }
      } else {
        addWelcomeMessage();
      }
    } catch (error) {
      console.error('❌ Erreur chargement historique:', error);
      addWelcomeMessage();
    }
  };

  // Ajouter le message d'accueil
  const addWelcomeMessage = () => {
    if (messages.length === 0) {
      setMessages([
        {
          role: 'assistant',
          content: '👋 **Bonjour ! Je suis votre assistant IA pour l\'emploi.**\n\n🎯 **Je peux vous aider avec :**\n- 📄 Analyse et optimisation de CV\n- 🎯 Évaluation de compatibilité avec les offres\n- ✉️ Rédaction de lettres de motivation\n- 🎤 Préparation aux entretiens\n- 🔄 Conseils pour la reconversion\n\n💡 **Pour commencer :** Uploadez votre CV ou utilisez une action rapide !',
          timestamp: new Date().toISOString()
        }
      ]);
      setChatLoaded(true);
    }
  };

  // Actualiser l'historique
  const refreshChatHistory = async () => {
    setChatLoaded(false);
    await loadChatHistory();
  };

  // Charger le statut des documents
  const loadDocumentsStatus = async () => {
    try {
      const response = await documentsApi.getDocumentsStatus();
      if (response.success) {
        setDocumentStatus(response.documents);
      }
    } catch (error) {
      console.error('Erreur chargement statut documents:', error);
    } finally {
      setDocumentsLoaded(true);
    }
  };

  // ✅ CORRIGÉ : Upload de document via documentsApi
  const uploadDocument = async (file, documentType) => {
    console.log('🚀 uploadDocument déclenchée !');
    console.log('📁 Fichier:', file);
    console.log('📋 Type:', documentType);
    
    if (!file || !documentType) {
      console.error('❌ Paramètres manquants');
      toast.error('Fichier et type de document requis');
      return { success: false, error: 'Paramètres manquants' };
    }

    // Validation de taille
    const maxSize = 16 * 1024 * 1024; // 16MB
    if (file.size > maxSize) {
      toast.error('Le fichier est trop volumineux (maximum 16MB)');
      return { success: false, error: 'Fichier trop volumineux' };
    }

    // Validation de type
    const allowedTypes = ['application/pdf', 'application/msword', 
                         'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                         'text/plain'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Type de fichier non supporté. Utilisez PDF, DOC, DOCX ou TXT.');
      return { success: false, error: 'Type de fichier non supporté' };
    }

    // Mise à jour optimiste
    setDocumentStatus(prev => ({
      ...prev,
      [documentType]: {
        ...prev[documentType],
        uploaded: false,
        processed: false,
        name: file.name,
        size: file.size,
        content: '',
        upload_timestamp: null
      }
    }));

    try {
      setLoading(true);
      
      // ✅ UTILISER documentsApi au lieu de fetch direct
      console.log('🔍 Appel documentsApi.uploadDocument...');
      console.log('🎫 Token disponible:', !!localStorage.getItem('token'));
      console.log('📡 URL API:', documentsApi.constructor.name);
      
      const response = await documentsApi.uploadDocument(file, documentType);
      
      console.log('📡 Réponse API:', response);

      if (response.success) {
        // Mise à jour réussie
        console.log('🔄 Mise à jour documentStatus pour', documentType);
        setDocumentStatus(prev => {
          console.log('📊 État précédent:', prev);
          const newState = {
            ...prev,
            [documentType]: {
              uploaded: true,
              processed: true,
              name: file.name,
              size: file.size,
              upload_date: new Date().toISOString(),
              upload_timestamp: new Date().toISOString(),
              content: ''
            }
          };
          console.log('📊 Nouvel état:', newState);
          return newState;
        });

        // 🗑️ NETTOYER LE LOCALSTORAGE POUR NOUVEAUX DOCUMENTS
        if (['cv', 'offre_emploi', 'questionnaire'].includes(documentType)) {
          try {
            const { notifyServerAndClearLocalStorage } = await import('../utils/localStorageUtils');
            await notifyServerAndClearLocalStorage(documentType);
            console.log(`✅ Cache nettoyé pour nouveau ${documentType}`);
          } catch (error) {
            console.warn('⚠️ Erreur nettoyage cache:', error);
          }
        }

        // Actualiser l'historique - DÉSACTIVÉ TEMPORAIREMENT
        // setTimeout(() => {
        //   refreshChatHistory();
        // }, 1000);

        toast.success(`${file.name} uploadé avec succès !`);
        
        return { 
          success: true, 
          message: response.message,
          document_type: documentType 
        };
      } else {
        throw new Error(response.error || 'Erreur lors de l\'upload');
      }
    } catch (error) {
      console.error('❌ Erreur upload:', error);
      
      // Réinitialiser l'état en cas d'erreur
      setDocumentStatus(prev => ({
        ...prev,
        [documentType]: {
          uploaded: false,
          processed: false,
          name: null,
          size: null,
          content: '',
          upload_timestamp: null
        }
      }));

      const errorMessage = error.message || 'Erreur lors de l\'upload du fichier';
      toast.error(errorMessage);
      
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // ✅ AJOUTÉ : Upload de texte via documentsApi
  const uploadText = async (text, documentType) => {
    console.log('🚀 uploadText déclenchée !');
    console.log('📝 Texte:', text?.substring(0, 100) + '...');
    console.log('📋 Type:', documentType);
    
    if (!text?.trim() || !documentType) {
      console.error('❌ Paramètres manquants');
      toast.error('Texte et type de document requis');
      return { success: false, error: 'Paramètres manquants' };
    }

    try {
      setLoading(true);
      
      // ✅ UTILISER documentsApi
      const response = await documentsApi.uploadText(text.trim(), documentType);

      if (response.success) {
        // Mise à jour réussie
        setDocumentStatus(prev => ({
          ...prev,
          [documentType]: {
            uploaded: true,
            processed: true,
            name: 'Texte saisi',
            size: text.length,
            upload_date: new Date().toISOString(),
            upload_timestamp: new Date().toISOString(),
            content: text.trim()
          }
        }));

        // 🗑️ NETTOYER LE LOCALSTORAGE POUR NOUVEAUX DOCUMENTS
        if (['cv', 'offre_emploi', 'questionnaire'].includes(documentType)) {
          try {
            const { notifyServerAndClearLocalStorage } = await import('../utils/localStorageUtils');
            await notifyServerAndClearLocalStorage(documentType);
            console.log(`✅ Cache nettoyé pour nouveau ${documentType}`);
          } catch (error) {
            console.warn('⚠️ Erreur nettoyage cache:', error);
          }
        }

        // Actualiser l'historique - DÉSACTIVÉ TEMPORAIREMENT
        // setTimeout(() => {
        //   refreshChatHistory();
        // }, 1000);

        toast.success('Texte enregistré avec succès !');
        
        return { 
          success: true, 
          message: response.message,
          document_type: documentType 
        };
      } else {
        throw new Error(response.error || 'Erreur lors de l\'enregistrement');
      }
    } catch (error) {
      console.error('❌ Erreur upload texte:', error);
      
      const errorMessage = error.message || 'Erreur lors de l\'enregistrement du texte';
      toast.error(errorMessage);
      
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Fonction d'envoi de message
  const sendMessage = async (content) => {
    if (!content.trim() || loading) return;

    const userMessage = {
      role: 'user',
      content: content.trim(),
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        },
        body: JSON.stringify({ 
          message: content,
          chat_history: messages 
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        const aiMessage = {
          role: 'assistant',
          content: data.response,
          timestamp: new Date().toISOString()
        };

        setMessages(prev => [...prev, aiMessage]);
        
        if (data.chat_updated) {
          // setTimeout(() => {
          //   refreshChatHistory();
          // }, 500);
        }
        
      } else {
        throw new Error(data.error || 'Erreur lors de l\'envoi du message');
      }
    } catch (error) {
      console.error('Erreur envoi message:', error);
      toast.error('Erreur lors de l\'envoi du message');
      
      const errorMessage = {
        role: 'assistant',
        content: 'Désolé, une erreur est survenue. Veuillez réessayer.',
        timestamp: new Date().toISOString(),
        error: true
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  // Fonction d'action rapide
  const executeQuickAction = async (actionId) => {
    if (loading) return;

    setLoading(true);

    try {
      const response = await fetch(`/api/actions/${actionId.replace('_', '-')}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        },
        body: JSON.stringify({})
      });

      const data = await response.json();

      if (response.ok && data.success) {
        await refreshChatHistory();
        toast.success(`Action "${actionId}" exécutée avec succès !`);
      } else {
        throw new Error(data.error || 'Erreur lors de l\'exécution de l\'action');
      }
    } catch (error) {
      console.error('Erreur action rapide:', error);
      toast.error('Erreur lors de l\'exécution de l\'action');
    } finally {
      setLoading(false);
    }
  };

  // Charger les données au démarrage
  useEffect(() => {
    if (isAuthenticated && !chatLoaded) {
      loadDocumentsStatus();
      loadChatHistory();
    }
    
    if (!isAuthenticated) {
      setDocumentsLoaded(false);
    }
  }, [isAuthenticated, chatLoaded]);

  const value = {
    messages,
    loading,
    documentStatus,
    documentsLoaded,
    chatLoaded,
    uploadDocument,
    uploadText, // ✅ AJOUTÉ
    sendMessage,
    executeQuickAction,
    refreshChatHistory,
    loadDocumentsStatus
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};
