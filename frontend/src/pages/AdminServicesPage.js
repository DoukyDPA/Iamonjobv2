// NOUVEAU FICHIER : frontend/src/pages/AdminServicesPage.js
// Interface d'administration des services

import React, { useState, useEffect } from 'react';
import { 
  FiEdit3, FiEye, FiEyeOff, FiStar, FiPlus, 
  FiSave, FiX, FiAlertCircle, FiCheck, FiHome 
} from 'react-icons/fi';
import { ServiceIcon } from '../components/icons/ModernIcons';
import toast from 'react-hot-toast';

const AdminServicesPage = () => {
  const [activeTab, setActiveTab] = useState('services');
  const [services, setServices] = useState({});
  const [themes, setThemes] = useState({});
  const [featuredService, setFeaturedService] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editingService, setEditingService] = useState(null); // service id en édition
  const [editingPrompt, setEditingPrompt] = useState('');
  const [editingRequirements, setEditingRequirements] = useState(null); // service id pour les exigences
  const [showAddModal, setShowAddModal] = useState(false);
  const [newService, setNewService] = useState({
    id: '', title: '', coach_advice: '', theme: 'evaluate_offer',
    requires_cv: false, requires_job_offer: false, requires_questionnaire: false,
    difficulty: 'beginner', duration_minutes: 5
  });

  // Charger les données depuis l'API
  useEffect(() => {
    loadServicesData();
  }, []);

  const loadServicesData = async () => {
    try {
      // Récupérer le token d'authentification
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      
      if (!token) {
        toast.error('Token d\'authentification manquant');
        setLoading(false);
        return;
      }
      
      const response = await fetch('/api/admin/services', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        setServices(data.services);
        setThemes(data.themes);
        setFeaturedService(data.featured);
      } else {
        toast.error(data.error || 'Erreur lors du chargement des services');
      }
    } catch (error) {
      console.error('Erreur chargement services:', error);
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  // Changer la visibilité d'un service
  const toggleVisibility = async (serviceId) => {
    try {
      // Récupérer le token d'authentification
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      
      if (!token) {
        toast.error('Token d\'authentification manquant');
        return;
      }
      
      const currentVisibility = services[serviceId].visible;
      const response = await fetch(`/api/admin/services/${serviceId}/visibility`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ visible: !currentVisibility })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setServices(prev => ({
            ...prev,
            [serviceId]: { ...prev[serviceId], visible: !currentVisibility }
          }));
          toast.success(`Service ${!currentVisibility ? 'activé' : 'désactivé'}`);
          // Recharger les services pour synchroniser
          loadServicesData();
        } else {
          toast.error(data.error || 'Erreur lors de la modification');
        }
      } else {
        toast.error('Erreur lors de la modification');
      }
    } catch (error) {
      console.error('Erreur toggle visibilité:', error);
      toast.error('Erreur lors de la modification');
    }
  };

  // Changer le thème d'un service
  const changeServiceTheme = async (serviceId, newTheme) => {
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      
      if (!token) {
        toast.error('Token d\'authentification manquant');
        return;
      }
      
      const response = await fetch(`/api/admin/services/${serviceId}/theme`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ theme: newTheme })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setServices(prev => ({
            ...prev,
            [serviceId]: { ...prev[serviceId], theme: newTheme }
          }));
          toast.success(`Service déplacé vers ${themeLabels[newTheme]}`);
          // Recharger les services pour synchroniser
          loadServicesData();
        } else {
          toast.error(data.error || 'Erreur lors du déplacement');
        }
      } else {
        toast.error('Erreur lors du déplacement');
      }
    } catch (error) {
      console.error('Erreur changement thème:', error);
      toast.error('Erreur lors du déplacement');
    }
  };

  // Mettre à jour les documents requis
  const updateServiceRequirements = async (serviceId, requirements) => {
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      
      if (!token) {
        toast.error('Token d\'authentification manquant');
        return;
      }
      
      const response = await fetch(`/api/admin/services/${serviceId}/requirements`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requirements)
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setServices(prev => ({
            ...prev,
            [serviceId]: { 
              ...prev[serviceId], 
              ...requirements 
            }
          }));
          toast.success('Documents requis mis à jour');
          // Recharger les services pour synchroniser
          loadServicesData();
        } else {
          toast.error(data.error || 'Erreur lors de la mise à jour');
        }
      } else {
        toast.error('Erreur lors de la mise à jour');
      }
    } catch (error) {
      console.error('Erreur mise à jour exigences:', error);
      toast.error('Erreur lors de la mise à jour');
    }
  };

  // Mettre un service en avant
  const setFeatured = async (serviceId) => {
    try {
      // Récupérer le token d'authentification
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      
      if (!token) {
        toast.error('Token d\'authentification manquant');
        return;
      }
      
      const featuredTitle = prompt('Titre personnalisé pour la mise en avant:');
      if (!featuredTitle) return;

      const response = await fetch(`/api/admin/services/${serviceId}/feature`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          featured_title: featuredTitle,
          duration_days: 30 
        })
      });

      if (response.ok) {
        setFeaturedService(services[serviceId]);
        toast.success('Service mis en avant !');
        loadServicesData(); // Recharger pour mettre à jour
      }
    } catch (error) {
      console.error('Erreur mise en avant:', error);
      toast.error('Erreur lors de la mise en avant');
    }
  };

  // Supprimer la mise en avant
  const clearFeatured = async () => {
    try {
      // Récupérer le token d'authentification
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      
      if (!token) {
        toast.error('Token d\'authentification manquant');
        return;
      }
      
      const response = await fetch('/api/admin/services/featured', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        setFeaturedService(null);
        toast.success('Mise en avant supprimée');
        loadServicesData();
      }
    } catch (error) {
      console.error('Erreur suppression mise en avant:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  // Ajouter un nouveau service
  const addService = async () => {
    try {
      // Récupérer le token d'authentification
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      
      if (!token) {
        toast.error('Token d\'authentification manquant');
        return;
      }
      
      const response = await fetch('/api/admin/services', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newService)
      });

      if (response.ok) {
        toast.success('Service ajouté avec succès');
        setShowAddModal(false);
        setNewService({
          id: '', title: '', coach_advice: '', theme: 'evaluate_offer',
          requires_cv: false, requires_job_offer: false, requires_questionnaire: false,
          difficulty: 'beginner', duration_minutes: 5
        });
        loadServicesData();
      } else {
        const errorData = await response.json();
        toast.error(`Erreur: ${errorData.error || 'Erreur lors de l\'ajout'}`);
      }
    } catch (error) {
      console.error('Erreur ajout service:', error);
      toast.error('Erreur lors de l\'ajout');
    }
  };

  // Nettoyer les services en double
  const cleanDuplicateServices = async () => {
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      
      if (!token) {
        toast.error('Token d\'authentification manquant');
        return;
      }
      
      const confirmed = window.confirm(
        'Êtes-vous sûr de vouloir nettoyer les services en double ? ' +
        'Cette action supprimera les doublons en gardant le service le plus récent.'
      );
      
      if (!confirmed) return;
      
      const response = await fetch('/api/admin/services/cleanup', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          toast.success(`Nettoyage terminé: ${result.result.duplicates_deleted} doublons supprimés`);
          loadServicesData(); // Recharger les données
        } else {
          toast.error('Erreur lors du nettoyage');
        }
      } else {
        const errorData = await response.json();
        toast.error(`Erreur: ${errorData.error || 'Erreur lors du nettoyage'}`);
      }
    } catch (error) {
      console.error('Erreur nettoyage services:', error);
      toast.error('Erreur lors du nettoyage');
    }
  };

  // Éditer le prompt d'un service
  const editPrompt = async (serviceId) => {
    setEditingService(serviceId);
    try {
      // Récupérer le token d'authentification
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      
      if (!token) {
        toast.error('Token d\'authentification manquant');
        return;
      }
      
      const res = await fetch(`/api/admin/prompts/${serviceId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await res.json();
      if (data.success) {
        setEditingPrompt(data.prompt);
      } else {
        setEditingPrompt('');
        toast.error(data.error || 'Erreur lors du chargement du prompt');
      }
    } catch (err) {
      console.error('Erreur chargement prompt:', err);
      toast.error('Erreur lors du chargement');
    }
  };

  const savePrompt = async () => {
    try {
      // Récupérer le token d'authentification
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      
      if (!token) {
        toast.error('Token d\'authentification manquant');
        return;
      }
      
      const res = await fetch(`/api/admin/prompts/${editingService}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ prompt: editingPrompt })
      });
      
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(data.message || 'Prompt mis à jour');
        setEditingPrompt('');
        setEditingService(null);
      } else {
        toast.error(data.error || 'Erreur lors de la sauvegarde');
      }
    } catch (err) {
      console.error('Erreur sauvegarde prompt:', err);
      toast.error('Erreur lors de la sauvegarde');
    }
  };

  const themeLabels = {
    'evaluate_offer': '🎯 Évaluer une offre',
    'improve_cv': '📄 Améliorer mon CV', 
    'apply_jobs': '✉️ Candidater',
    'interview_prep': '🎤 Préparer l\'entretien',
    'career_project': '🔄 Tout changer'
  };

  const difficultyLabels = {
    'beginner': '🟢 Débutant',
    'intermediate': '🟡 Intermédiaire',
    'advanced': '🔴 Avancé'
  };

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h2>Chargement de l'interface admin...</h2>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>

      {/* Navigation tabs */}
      <div style={{
        display: 'flex',
        gap: '0.5rem',
        marginBottom: '2rem',
        borderBottom: '1px solid #e5e7eb'
      }}>
        <button
          onClick={() => setActiveTab('services')}
          style={{
            padding: '0.75rem 1.5rem',
            background: activeTab === 'services' ? '#0a6b79' : 'transparent',
            color: activeTab === 'services' ? 'white' : '#6b7280',
            border: 'none',
            borderRadius: '8px 8px 0 0',
            cursor: 'pointer',
            fontWeight: activeTab === 'services' ? '600' : '400',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <FiEdit3 />
          Services IA
        </button>
        <button
          onClick={() => setActiveTab('partners')}
          style={{
            padding: '0.75rem 1.5rem',
            background: activeTab === 'partners' ? '#0a6b79' : 'transparent',
            color: activeTab === 'partners' ? 'white' : '#6b7280',
            border: 'none',
            borderRadius: '8px 8px 0 0',
            cursor: 'pointer',
            fontWeight: activeTab === 'partners' ? '600' : '400',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
                          <FiHome />
          Métiers Partenaires
        </button>
      </div>

      {/* Content based on active tab */}
      {activeTab === 'partners' ? (
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <h2>Gérer les métiers partenaires</h2>
          <p>Cette section est en cours de développement.</p>
        </div>
      ) : (
        <>
          {/* Services content */}
          <div style={{ marginBottom: '2rem' }}>
            <h2 style={{ 
              fontSize: '1.5rem', 
              fontWeight: 'bold',
              color: '#1f2937',
              marginBottom: '0.5rem'
            }}>
              🔧 Administration des Services
            </h2>
            <p style={{ color: '#6b7280', fontSize: '1rem' }}>
              Gérez la visibilité, la mise en avant et les paramètres des services IA
            </p>
          </div>

      {/* Service mis en avant */}
      {featuredService && (
        <div style={{
          background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
          borderRadius: '12px',
          padding: '1.5rem',
          marginBottom: '2rem',
          color: 'white'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ margin: '0 0 0.5rem 0' }}>
                ⭐ Service en avant : {featuredService.title}
              </h3>
              <p style={{ margin: 0, opacity: 0.9 }}>
                {featuredService.featured_title || featuredService.title}
              </p>
            </div>
            <button
              onClick={clearFeatured}
              style={{
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                borderRadius: '8px',
                padding: '0.5rem 1rem',
                color: 'white',
                cursor: 'pointer'
              }}
            >
              <FiX size={16} /> Supprimer
            </button>
          </div>
        </div>
      )}

      {/* Actions globales */}
      <div style={{ 
        display: 'flex', 
        gap: '1rem', 
        marginBottom: '2rem' 
      }}>
        <button
          onClick={() => setShowAddModal(true)}
          style={{
            background: '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            padding: '0.75rem 1.5rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.9rem'
          }}
        >
          <FiPlus size={16} /> Ajouter un service
        </button>
        
        <button
          onClick={cleanDuplicateServices}
          style={{
            background: '#f59e0b',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            padding: '0.75rem 1.5rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.9rem'
          }}
        >
          🧹 Nettoyer les doublons
        </button>
        
        <button
          onClick={loadServicesData}
          style={{
            background: '#6b7280',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            padding: '0.75rem 1.5rem',
            cursor: 'pointer',
            fontSize: '0.9rem'
          }}
        >
          Actualiser
        </button>
      </div>

      {/* Liste des services par thème */}
      {Object.entries(themeLabels).map(([themeKey, themeLabel]) => {
        const themeServices = Object.values(services).filter(service => service.theme === themeKey);
        
        if (themeServices.length === 0) return null;

        return (
          <div key={themeKey} style={{ marginBottom: '3rem' }}>
            <h2 style={{
              fontSize: '1.5rem',
              fontWeight: '600',
              color: '#1f2937',
              marginBottom: '1.5rem',
              borderBottom: '2px solid #e5e7eb',
              paddingBottom: '0.5rem'
            }}>
              {themeLabel}
            </h2>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
              gap: '1.5rem'
            }}>
              {themeServices.map(service => (
                <div
                  key={service.id}
                  style={{
                    background: 'white',
                    border: service.visible ? '2px solid #10b981' : '2px solid #ef4444',
                    borderRadius: '12px',
                    padding: '1.5rem',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                  }}
                >
                  {/* Header du service */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '1rem'
                  }}>
                    <div style={{ flex: 1 }}>
                      <h3 style={{
                        margin: '0 0 0.5rem 0',
                        fontSize: '1.1rem',
                        fontWeight: '600',
                        color: '#1f2937'
                      }}>
                        {service.title}
                      </h3>
                      <p style={{
                        margin: 0,
                        fontSize: '0.85rem',
                        color: '#6b7280',
                        lineHeight: '1.4'
                      }}>
                        {service.coach_advice}
                      </p>
                    </div>
                    
                    <ServiceIcon 
                      type={service.iconType || 'document'} 
                      size={24} 
                      className="service-icon"
                    />
                  </div>

                  {/* Informations du service */}
                  <div style={{
                    display: 'flex',
                    gap: '0.5rem',
                    flexWrap: 'wrap',
                    marginBottom: '1rem'
                  }}>
                    <span style={{
                      background: '#f3f4f6',
                      padding: '0.25rem 0.5rem',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      color: '#374151'
                    }}>
                      {difficultyLabels[service.difficulty]}
                    </span>
                    
                    <span style={{
                      background: '#f3f4f6',
                      padding: '0.25rem 0.5rem',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      color: '#374151'
                    }}>
                      ⏱️ {service.duration_minutes}min
                    </span>
                    
                    {service.requires_cv && (
                      <span style={{
                        background: '#dbeafe',
                        padding: '0.25rem 0.5rem',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        color: '#1e40af'
                      }}>
                        📄 CV requis
                      </span>
                    )}
                    
                    {service.requires_job_offer && (
                      <span style={{
                        background: '#dcfce7',
                        padding: '0.25rem 0.5rem',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        color: '#166534'
                      }}>
                        🎯 Offre requise
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div style={{
                    display: 'flex',
                    gap: '0.5rem',
                    flexWrap: 'wrap'
                  }}>
                    <button
                      onClick={() => toggleVisibility(service.id)}
                      style={{
                        background: service.visible ? '#ef4444' : '#10b981',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '0.5rem 1rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        fontSize: '0.8rem'
                      }}
                    >
                      {service.visible ? <FiEyeOff size={14} /> : <FiEye size={14} />}
                      {service.visible ? 'Masquer' : 'Afficher'}
                    </button>
                    
                    <button
                      onClick={() => setFeatured(service.id)}
                      style={{
                        background: '#f59e0b',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '0.5rem 1rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        fontSize: '0.8rem'
                      }}
                    >
                      <FiStar size={14} /> Mettre en avant
                    </button>

                    <button
                      onClick={() => editPrompt(service.id)}
                      style={{
                        background: '#3b82f6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '0.5rem 1rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        fontSize: '0.8rem'
                      }}
                    >
                      <FiEdit3 size={14} /> Modifier le prompt
                    </button>

                    {/* Sélecteur de thème */}
                    <select
                      value={service.theme}
                      onChange={(e) => changeServiceTheme(service.id, e.target.value)}
                      style={{
                        padding: '0.5rem',
                        borderRadius: '6px',
                        border: '1px solid #d1d5db',
                        fontSize: '0.8rem',
                        background: 'white',
                        cursor: 'pointer'
                      }}
                    >
                      {Object.entries(themeLabels).map(([themeKey, themeLabel]) => (
                        <option key={themeKey} value={themeKey}>
                          {themeLabel}
                        </option>
                      ))}
                    </select>

                    {/* Bouton Documents requis */}
                    <button
                      onClick={() => setEditingRequirements(service.id)}
                      style={{
                        background: '#8b5cf6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '0.5rem 1rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        fontSize: '0.8rem'
                      }}
                    >
                      📄 Documents
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
        </>
      )}

      {/* Modal d'ajout de service */}
      {showAddModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '2rem',
            maxWidth: '500px',
            width: '90%',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1.3rem' }}>
              Ajouter un nouveau service
            </h3>
            
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                ID du service:
              </label>
              <input
                type="text"
                value={newService.id}
                onChange={(e) => setNewService({...newService, id: e.target.value})}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px'
                }}
                placeholder="ex: mon_nouveau_service"
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                Titre:
              </label>
              <input
                type="text"
                value={newService.title}
                onChange={(e) => setNewService({...newService, title: e.target.value})}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px'
                }}
                placeholder="ex: Mon nouveau service"
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                Conseil de coach:
              </label>
              <textarea
                value={newService.coach_advice}
                onChange={(e) => setNewService({...newService, coach_advice: e.target.value})}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  minHeight: '100px'
                }}
                placeholder="Description du service..."
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                Thème:
              </label>
              <select
                value={newService.theme}
                onChange={(e) => setNewService({...newService, theme: e.target.value})}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px'
                }}
              >
                {Object.entries(themeLabels).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="checkbox"
                  checked={newService.requires_cv}
                  onChange={(e) => setNewService({...newService, requires_cv: e.target.checked})}
                />
                CV requis
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="checkbox"
                  checked={newService.requires_job_offer}
                  onChange={(e) => setNewService({...newService, requires_job_offer: e.target.checked})}
                />
                Offre requise
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="checkbox"
                  checked={newService.requires_questionnaire}
                  onChange={(e) => setNewService({...newService, requires_questionnaire: e.target.checked})}
                />
                Questionnaire requis
              </label>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
              <button
                onClick={addService}
                style={{
                  flex: 1,
                  background: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '0.75rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem'
                }}
              >
                <FiSave size={16} /> Ajouter
              </button>
              <button
                onClick={() => setShowAddModal(false)}
                style={{
                  flex: 1,
                  background: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '0.75rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem'
                }}
              >
                <FiX size={16} /> Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal édition de prompt */}
      {editingService && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '2rem',
            maxWidth: '600px',
            width: '90%',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <h3 style={{ margin: '0 0 1rem 0' }}>Modifier le prompt</h3>
            <textarea
              value={editingPrompt}
              onChange={(e) => setEditingPrompt(e.target.value)}
              style={{
                width: '100%',
                minHeight: '200px',
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '8px'
              }}
            />
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <button
                onClick={savePrompt}
                style={{
                  flex: 1,
                  background: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '0.75rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem'
                }}
              >
                <FiSave size={16} /> Sauvegarder
              </button>
              <button
                onClick={() => setEditingService(null)}
                style={{
                  flex: 1,
                  background: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '0.75rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem'
                }}
              >
                <FiX size={16} /> Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal édition des documents requis */}
      {editingRequirements && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '2rem',
            maxWidth: '500px',
            width: '90%',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <h3 style={{ margin: '0 0 1.5rem 0' }}>
              Documents requis pour {services[editingRequirements]?.title}
            </h3>
            
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
                <input
                  type="checkbox"
                  checked={services[editingRequirements]?.requires_cv || false}
                  onChange={(e) => {
                    const service = services[editingRequirements];
                    if (service) {
                      updateServiceRequirements(editingRequirements, {
                        ...service,
                        requires_cv: e.target.checked
                      });
                    }
                  }}
                  style={{ marginRight: '0.5rem' }}
                />
                📄 CV requis
              </label>
              
              <label style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
                <input
                  type="checkbox"
                  checked={services[editingRequirements]?.requires_job_offer || false}
                  onChange={(e) => {
                    const service = services[editingRequirements];
                    if (service) {
                      updateServiceRequirements(editingRequirements, {
                        ...service,
                        requires_job_offer: e.target.checked
                      });
                    }
                  }}
                  style={{ marginRight: '0.5rem' }}
                />
                🎯 Offre d'emploi requise
              </label>
              
              <label style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
                <input
                  type="checkbox"
                  checked={services[editingRequirements]?.requires_questionnaire || false}
                  onChange={(e) => {
                    const service = services[editingRequirements];
                    if (service) {
                      updateServiceRequirements(editingRequirements, {
                        ...service,
                        requires_questionnaire: e.target.checked
                      });
                    }
                  }}
                  style={{ marginRight: '0.5rem' }}
                />
                📝 Questionnaire requis
              </label>
            </div>
            
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                onClick={() => setEditingRequirements(null)}
                style={{
                  flex: 1,
                  background: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '0.75rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem'
                }}
              >
                <FiX size={16} /> Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminServicesPage;
