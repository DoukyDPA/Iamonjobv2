// hooks/useDocuments.js
// Hook personnalisé pour gérer l'état et les actions des documents

import { useState, useEffect, useCallback } from 'react';
import { documentsApi } from '../services/documentsApi';
import toast from 'react-hot-toast';

export const useDocuments = () => {
  const [documentStatus, setDocumentStatus] = useState({
    cv: { uploaded: false, processed: false, name: null, size: null },
    offre_emploi: { uploaded: false, processed: false, name: null, size: null },
    metier_souhaite: { uploaded: false, processed: false, name: null, size: null },
    questionnaire: { uploaded: false, processed: false, name: null, size: null }
  });
  const [loading, setLoading] = useState(false);

  // Charger le statut des documents au montage
  const loadDocumentsStatus = useCallback(async () => {
    try {
      setLoading(true);
      const response = await documentsApi.getDocumentsStatus();
      
      if (response.success) {
        setDocumentStatus(response.documents || {});
      }
    } catch (error) {
      console.error('Erreur lors du chargement des documents:', error);
      // Ne pas afficher de toast d'erreur au chargement initial
      // car l'utilisateur peut ne pas avoir de documents encore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDocumentsStatus();
  }, [loadDocumentsStatus]);

  // Upload d'un fichier
  const uploadDocument = useCallback(async (file, documentType) => {
    try {
      setLoading(true);
      
      // Validation basique
      if (!file || !documentType) {
        throw new Error('Fichier et type de document requis');
      }

      // Vérifier la taille du fichier (16MB max)
      const maxSize = 16 * 1024 * 1024; // 16MB
      if (file.size > maxSize) {
        throw new Error('Le fichier est trop volumineux (maximum 16MB)');
      }

      // Vérifier le type de fichier
      const allowedTypes = ['application/pdf', 'application/msword', 
                           'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                           'text/plain'];
      if (!allowedTypes.includes(file.type)) {
        throw new Error('Type de fichier non supporté. Utilisez PDF, DOC, DOCX ou TXT.');
      }

      const response = await documentsApi.uploadDocument(file, documentType);
      
      if (response.success) {
        // Mettre à jour le statut du document
        setDocumentStatus(prev => ({
          ...prev,
          [documentType]: {
            uploaded: true,
            processed: response.processed || false,
            name: file.name,
            size: file.size
          }
        }));

        toast.success(`${file.name} téléchargé avec succès !`);
        return { success: true, data: response };
      } else {
        throw new Error(response.error || 'Erreur lors du téléchargement');
      }
    } catch (error) {
      const message = error.message || 'Erreur lors du téléchargement';
      toast.error(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  }, []);

  // Upload de texte (copier/coller)
  const uploadText = useCallback(async (text, documentType) => {
    try {
      setLoading(true);
      
      if (!text?.trim() || !documentType) {
        throw new Error('Texte et type de document requis');
      }

      const response = await documentsApi.uploadText(text.trim(), documentType);
      
      if (response.success) {
        setDocumentStatus(prev => ({
          ...prev,
          [documentType]: {
            uploaded: true,
            processed: response.processed || false,
            name: 'Texte collé',
            size: text.length
          }
        }));

        toast.success('Texte enregistré avec succès !');
        return { success: true, data: response };
      } else {
        throw new Error(response.error || 'Erreur lors de l\'enregistrement');
      }
    } catch (error) {
      const message = error.message || 'Erreur lors de l\'enregistrement';
      toast.error(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  }, []);

  // Supprimer un document
  const deleteDocument = useCallback(async (documentType) => {
    try {
      setLoading(true);
      
      const response = await documentsApi.deleteDocument(documentType);
      
      if (response.success) {
        setDocumentStatus(prev => ({
          ...prev,
          [documentType]: {
            uploaded: false,
            processed: false,
            name: null,
            size: null
          }
        }));

        toast.success('Document supprimé avec succès !');
        return { success: true };
      } else {
        throw new Error(response.error || 'Erreur lors de la suppression');
      }
    } catch (error) {
      const message = error.message || 'Erreur lors de la suppression';
      toast.error(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  }, []);

  // Calculer des statistiques
  const stats = {
    totalDocuments: Object.keys(documentStatus).length,
    uploadedDocuments: Object.values(documentStatus).filter(doc => doc?.uploaded).length,
    processedDocuments: Object.values(documentStatus).filter(doc => doc?.processed).length,
    hasCV: documentStatus.cv?.uploaded || false,
    hasJobOffer: documentStatus.offre_emploi?.uploaded || false,
  };

  return {
    documentStatus,
    loading,
    stats,
    uploadDocument,
    uploadText,
    deleteDocument,
    loadDocumentsStatus
  };
};
