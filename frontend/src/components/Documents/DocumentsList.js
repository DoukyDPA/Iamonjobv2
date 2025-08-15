import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  FiFileText, 
  FiTarget, 
  FiUser,
  FiFile,
  FiDownload,
  FiTrash2,
  FiEye,
  FiCheck,
  FiClock,
  FiAlertCircle
} from 'react-icons/fi';
import toast from 'react-hot-toast';

const DocumentsList = () => {
  const { documentStatus, loading } = useApp();
  const [expandedDoc, setExpandedDoc] = useState(null);

  const documentTypes = {
    cv: {
      title: 'CV',
      icon: <FiFileText />,
      color: 'primary',
      description: 'Curriculum Vitae'
    },
    offre_emploi: {
      title: 'Offre d\'emploi',
      icon: <FiTarget />,
      color: 'success',
      description: 'Offre d\'emploi ciblée'
    },
    metier_souhaite: {
      title: 'Métier visé',
      icon: <FiUser />,
      color: 'info',
      description: 'Métier pour reconversion'
    },
    questionnaire: {
      title: 'Questionnaire',
      icon: <FiFile />,
      color: 'warning',
      description: 'Objectifs et aspirations'
    }
  };

  const getUploadedDocuments = () => {
    return Object.entries(documentStatus)
      .filter(([_, status]) => status?.uploaded)
      .map(([type, status]) => ({
        type,
        ...status,
        config: documentTypes[type]
      }))
      .sort((a, b) => {
        // Trier par ordre d'importance : CV d'abord
        const order = { cv: 0, offre_emploi: 1, questionnaire: 2, metier_souhaite: 3 };
        return order[a.type] - order[b.type];
      });
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return 'Taille inconnue';
    
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${Math.round(bytes / Math.pow(1024, i) * 100) / 100} ${sizes[i]}`;
  };

  const getStatusInfo = (status) => {
    if (status.processed) {
      return {
        icon: <FiCheck />,
        text: 'Traité',
        className: 'success'
      };
    } else if (status.uploaded) {
      return {
        icon: <FiClock />,
        text: 'En traitement',
        className: 'processing'
      };
    } else {
      return {
        icon: <FiAlertCircle />,
        text: 'En attente',
        className: 'pending'
      };
    }
  };

  const handleDelete = async (docType) => {
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer ce document ?`)) {
      return;
    }

    try {
      // TODO: Implémenter la suppression via l'API
      // await deleteDocument(docType);
      toast.success('Document supprimé');
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleDownload = (doc) => {
    // TODO: Implémenter le téléchargement
    toast.info('Téléchargement non disponible');
  };

  const handlePreview = (doc) => {
    setExpandedDoc(expandedDoc === doc.type ? null : doc.type);
  };

  const uploadedDocs = getUploadedDocuments();

  if (uploadedDocs.length === 0) {
    return (
      <div className="documents-list empty">
        <div className="empty-state">
          <FiFile className="empty-icon" />
          <h3>Aucun document chargé</h3>
          <p>
            Commencez par télécharger votre CV dans l'onglet "Upload" 
            pour bénéficier d'analyses personnalisées.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="documents-list">
      <div className="list-header">
        <h3>📁 Documents chargés</h3>
        <span className="docs-count">
          {uploadedDocs.length} document{uploadedDocs.length > 1 ? 's' : ''}
        </span>
      </div>

      <div className="document-types">
        {uploadedDocs.map((doc) => {
          const status = getStatusInfo(doc);
          const isExpanded = expandedDoc === doc.type;
          
          return (
            <div 
              key={doc.type}
              className={`document-item ${doc.config.color} ${isExpanded ? 'expanded' : ''}`}
            >
              {/* En-tête du document */}
              <div className="document-header">
                <div className="doc-icon">
                  {doc.config.icon}
                </div>
                
                <div className="doc-info">
                  <h4 className="doc-title">{doc.config.title}</h4>
                  <p className="doc-description">{doc.config.description}</p>
                  
                  <div className="doc-meta">
                    <span className="doc-name" title={doc.name}>
                      {doc.name}
                    </span>
                    <span className="doc-size">
                      {formatFileSize(doc.size)}
                    </span>
                  </div>
                </div>

                <div className="doc-status">
                  <div className={`status-badge ${status.className}`}>
                    {status.icon}
                    <span>{status.text}</span>
                  </div>
                </div>
              </div>

              {/* Actions du document */}
              <div className="document-actions">
                <button
                  className="action-btn preview"
                  onClick={() => handlePreview(doc)}
                  title="Voir les détails"
                >
                  <FiEye />
                </button>
                
                <button
                  className="action-btn download"
                  onClick={() => handleDownload(doc)}
                  title="Télécharger"
                  disabled={loading}
                >
                  <FiDownload />
                </button>
                
                <button
                  className="action-btn delete"
                  onClick={() => handleDelete(doc.type)}
                  title="Supprimer"
                  disabled={loading}
                >
                  <FiTrash2 />
                </button>
              </div>

              {/* Détails étendus */}
              {isExpanded && (
                <div className="document-details">
                  <div className="details-grid">
                    <div className="detail-item">
                      <label>Type :</label>
                      <span>{doc.config.title}</span>
                    </div>
                    
                    <div className="detail-item">
                      <label>Nom du fichier :</label>
                      <span>{doc.name}</span>
                    </div>
                    
                    <div className="detail-item">
                      <label>Taille :</label>
                      <span>{formatFileSize(doc.size)}</span>
                    </div>
                    
                    {doc.uploadDate && (
                      <div className="detail-item">
                        <label>Date d'upload :</label>
                        <span>{new Date(doc.uploadDate).toLocaleDateString('fr-FR')}</span>
                      </div>
                    )}
                    
                    <div className="detail-item">
                      <label>Statut :</label>
                      <span className={`status-text ${status.className}`}>
                        {status.text}
                      </span>
                    </div>
                  </div>

                  {doc.extractedText && (
                    <div className="extracted-preview">
                      <label>Aperçu du contenu :</label>
                      <div className="text-preview">
                        {doc.extractedText.substring(0, 200)}
                        {doc.extractedText.length > 200 && '...'}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Résumé des documents */}
      <div className="documents-summary">
        <div className="summary-stats">
          <div className="stat-item">
            <FiCheck className="stat-icon success" />
            <span>
              {uploadedDocs.filter(doc => doc.processed).length} traité{uploadedDocs.filter(doc => doc.processed).length > 1 ? 's' : ''}
            </span>
          </div>
          
          <div className="stat-item">
            <FiClock className="stat-icon processing" />
            <span>
              {uploadedDocs.filter(doc => doc.uploaded && !doc.processed).length} en cours
            </span>
          </div>
        </div>

        <div className="summary-actions">
          <button 
            className="btn btn-outline"
            onClick={() => window.location.reload()}
            disabled={loading}
          >
            Actualiser le statut
          </button>
        </div>
      </div>
    </div>
  );
};

export default DocumentsList;
