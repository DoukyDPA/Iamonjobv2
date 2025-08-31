// NOUVEAU FICHIER : frontend/src/pages/AdminServicesPage.js
// Interface d'administration des services

import React, { useState, useEffect } from 'react';
import { 
  FiEdit3, FiEye, FiEyeOff, FiStar, FiPlus, 
  FiSave, FiX, FiAlertCircle, FiCheck, FiHome, FiUsers 
} from 'react-icons/fi';
import { ServiceIcon } from '../components/icons/ModernIcons';
import toast from 'react-hot-toast';

const AdminServicesPage = () => {
  const [activeTab, setActiveTab] = useState('services');
  const [services, setServices] = useState({});
  const [themes, setThemes] = useState({});
  const [featuredService, setFeaturedService] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editingService, setEditingService] = useState(null);
  const [editingPrompt, setEditingPrompt] = useState('');
  const [editingRequirements, setEditingRequirements] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newService, setNewService] = useState({
    id: '', title: '', coach_advice: '', theme: 'evaluate_offer',
    requires_cv: false, requires_job_offer: false, requires_questionnaire: false,
    difficulty: 'beginner', duration_minutes: 5
  });

  useEffect(() => {
    loadServicesData();
  }, []);

  const loadServicesData = async () => {
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      
      if (!token) {
        toast.error('Token d\'authentification manquant');
        setLoading(false);
        return;
      }
      
      console.log('🔍 Token trouvé:', token.substring(0, 20) + '...');
      
      const response = await fetch('/api/admin/services', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('🔍 Réponse API:', response.status, response.statusText);
      
      if (response.status === 404) {
        console.error('❌ API admin non accessible (404)');
        toast.error('❌ API admin non accessible. Vérifiez le déploiement Railway.');
        setLoading(false);
        return;
      }
      
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.error('❌ Réponse non-JSON reçue:', contentType);
        const errorText = await response.text();
        console.error('❌ Contenu de la réponse:', errorText);
        toast.error('❌ Réponse invalide de l\'API admin. Vérifiez le déploiement.');
        setLoading(false);
        return;
      }
      
      const data = await response.json();
      
      if (data.success) {
        setServices(data.services);
        setThemes(data.themes);
        setFeaturedService(data.featured);
        console.log('✅ Services chargés depuis Supabase:', Object.keys(data.services));
        toast.success('Services chargés depuis Supabase');
      } else {
        toast.error(data.error || 'Erreur lors du chargement des services depuis Supabase');
        console.error('❌ Erreur API:', data);
      }
    } catch (error) {
      console.error('❌ Erreur chargement services depuis Supabase:', error);
      toast.error('❌ Impossible de se connecter à Supabase. Vérifiez le déploiement Railway.');
    } finally {
      setLoading(false);
    }
  };

  const toggleVisibility = async (serviceId) => {
    try {
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

  const editPrompt = async (serviceId) => {
    console.log('🔍 editPrompt appelé avec serviceId:', serviceId);
    setEditingService(serviceId);
    console.log('🔍 editingService défini à:', serviceId);
    
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      
      if (!token) {
        toast.error('Token d\'authentification manquant');
        return;
      }
      
      console.log('🔍 Appel API /api/admin/prompts/' + serviceId);
      const res = await fetch(`/api/admin/prompts/${serviceId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('🔍 Réponse API prompt:', res.status, res.statusText);
      const data = await res.json();
      console.log('🔍 Données reçues:', data);
      
      if (data.success) {
        console.log('🔍 Prompt reçu:', data.prompt);
        // Nettoyer les \n littéraux pour l'affichage
        const cleanedPrompt = data.prompt.replace(/\\n/g, '\n');
        console.log('🔍 Prompt nettoyé:', cleanedPrompt);
        setEditingPrompt(cleanedPrompt);
      } else {
        console.log('🔍 Erreur API:', data.error);
        setEditingPrompt('');
        toast.error(data.error || 'Erreur lors du chargement du prompt');
      }
    } catch (err) {
      console.error('❌ Erreur chargement prompt:', err);
      toast.error('Erreur lors du chargement');
    }
  };

  const savePrompt = async () => {
    try {
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
          toast.success('Thème mis à jour');
        } else {
          toast.error(data.error || 'Erreur lors de la mise à jour');
        }
      } else {
        toast.error('Erreur lors de la mise à jour');
      }
    } catch (error) {
      console.error('Erreur changement thème:', error);
      toast.error('Erreur lors de la mise à jour');
    }
  };

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
              requires_cv: requirements.requires_cv,
              requires_job_offer: requirements.requires_job_offer,
              requires_questionnaire: requirements.requires_questionnaire
            }
          }));
          toast.success('Documents requis mis à jour');
          setEditingRequirements(null);
        } else {
          toast.error(data.error || 'Erreur lors de la mise à jour');
        }
      } else {
        toast.error('Erreur lors de la mise à jour');
      }
    } catch (error) {
      console.error('Erreur mise à jour documents:', error);
      toast.error('Erreur lors de la mise à jour');
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
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <FiHome size={24} />
        <h1 style={{ margin: 0 }}>Administration des Services</h1>
      </div>

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
          <FiEdit3 size={16} /> Services
        </button>
        <button
          onClick={() => setActiveTab('themes')}
          style={{
            padding: '0.75rem 1.5rem',
            background: activeTab === 'themes' ? '#0a6b79' : 'transparent',
            color: activeTab === 'themes' ? 'white' : '#6b7280',
            border: 'none',
            borderRadius: '8px 8px 0 0',
            cursor: 'pointer',
            fontWeight: activeTab === 'themes' ? '600' : '400',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <FiStar size={16} /> Thèmes
        </button>
        <button
          onClick={() => setActiveTab('users')}
          style={{
            padding: '0.75rem 1.5rem',
            background: activeTab === 'users' ? '#0a6b79' : 'transparent',
            color: activeTab === 'users' ? 'white' : '#6b7280',
            border: 'none',
            borderRadius: '8px 8px 0 0',
            cursor: 'pointer',
            fontWeight: activeTab === 'users' ? '600' : '400',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <FiUsers size={16} /> Utilisateurs
        </button>
      </div>

      {/* Contenu des onglets */}
      {activeTab === 'services' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2>Gestion des Services</h2>
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
                gap: '0.5rem'
              }}
            >
              <FiPlus size={16} /> Ajouter un service
            </button>
          </div>

          <div style={{ display: 'grid', gap: '1rem' }}>
            {Object.entries(services).map(([serviceId, service]) => (
              <div key={serviceId} style={{
                border: '1px solid #e5e7eb',
                borderRadius: '12px',
                padding: '1.5rem',
                background: 'white',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <div>
                    <h3 style={{ margin: '0 0 0.5rem 0', color: '#1f2937' }}>{service.title}</h3>
                    <p style={{ margin: '0 0 1rem 0', color: '#6b7280' }}>{service.description}</p>
                    
                    <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                      <span style={{
                        padding: '0.25rem 0.75rem',
                        background: '#f3f4f6',
                        borderRadius: '6px',
                        fontSize: '0.875rem',
                        color: '#374151'
                      }}>
                        {difficultyLabels[service.difficulty] || 'N/A'}
                      </span>
                      <span style={{
                        padding: '0.25rem 0.75rem',
                        background: '#f3f4f6',
                        borderRadius: '6px',
                        fontSize: '0.875rem',
                        color: '#374151'
                      }}>
                        {service.duration_minutes} min
                      </span>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      onClick={() => toggleVisibility(serviceId)}
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
                      {service.visible ? 'Désactiver' : 'Activer'}
                    </button>

                    <button
                      onClick={() => editPrompt(serviceId)}
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

                    <select
                      value={service.theme}
                      onChange={(e) => changeServiceTheme(serviceId, e.target.value)}
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

                    <button
                      onClick={() => setEditingRequirements(serviceId)}
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
              </div>
            ))}
          </div>
        </>
      )}

      {activeTab === 'themes' && (
        <div>
          <h2>Gestion des Thèmes</h2>
          <p>Interface de gestion des thèmes à implémenter...</p>
        </div>
      )}

      {activeTab === 'users' && (
        <div>
          <h2>Gestion des Utilisateurs</h2>
          <p>Interface de gestion des utilisateurs à implémenter...</p>
        </div>
      )}

      {/* Modal édition de prompt */}
      {editingService && (
        <>
          {console.log('🔍 Modal prompt - editingService:', editingService)}
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
        </>
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
                        requires_cv: e.target.checked,
                        requires_job_offer: service.requires_job_offer,
                        requires_questionnaire: service.requires_questionnaire
                      });
                    }
                  }}
                  style={{ marginRight: '0.5rem' }}
                />
                CV requis
              </label>
              
              <label style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
                <input
                  type="checkbox"
                  checked={services[editingRequirements]?.requires_job_offer || false}
                  onChange={(e) => {
                    const service = services[editingRequirements];
                    if (service) {
                      updateServiceRequirements(editingRequirements, {
                        requires_cv: service.requires_cv,
                        requires_job_offer: e.target.checked,
                        requires_questionnaire: service.requires_questionnaire
                      });
                    }
                  }}
                  style={{ marginRight: '0.5rem' }}
                />
                Offre d'emploi requise
              </label>
              
              <label style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
                <input
                  type="checkbox"
                  checked={services[editingRequirements]?.requires_questionnaire || false}
                  onChange={(e) => {
                    const service = services[editingRequirements];
                    if (service) {
                      updateServiceRequirements(editingRequirements, {
                        requires_cv: service.requires_cv,
                        requires_job_offer: service.requires_job_offer,
                        requires_questionnaire: e.target.checked
                      });
                    }
                  }}
                  style={{ marginRight: '0.5rem' }}
                />
                Questionnaire requis
              </label>
            </div>
            
            <button
              onClick={() => setEditingRequirements(null)}
              style={{
                background: '#6b7280',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '0.75rem 1.5rem',
                cursor: 'pointer',
                width: '100%'
              }}
            >
              Fermer
            </button>
          </div>
        </div>
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
            <h3 style={{ margin: '0 0 1.5rem 0' }}>Ajouter un nouveau service</h3>
            
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                ID du service
              </label>
              <input
                type="text"
                value={newService.id}
                onChange={(e) => setNewService(prev => ({ ...prev, id: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px'
                }}
                placeholder="ex: new_service"
              />
            </div>
            
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                Titre
              </label>
              <input
                type="text"
                value={newService.title}
                onChange={(e) => setNewService(prev => ({ ...prev, title: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px'
                }}
                placeholder="Titre du service"
              />
            </div>
            
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                Description
              </label>
              <textarea
                value={newService.description}
                onChange={(e) => setNewService(prev => ({ ...prev, description: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  minHeight: '100px'
                }}
                placeholder="Description du service"
              />
            </div>
            
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                onClick={() => setShowAddModal(false)}
                style={{
                  flex: 1,
                  background: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '0.75rem',
                  cursor: 'pointer'
                }}
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  // TODO: Implémenter l'ajout de service
                  toast.info('Fonctionnalité à implémenter');
                  setShowAddModal(false);
                }}
                style={{
                  flex: 1,
                  background: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '0.75rem',
                  cursor: 'pointer'
                }}
              >
                Ajouter
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminServicesPage;
