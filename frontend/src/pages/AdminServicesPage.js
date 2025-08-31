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

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h2>Chargement de l'interface admin...</h2>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
      <h1>Administration des Services</h1>
      
      <div style={{ marginBottom: '2rem' }}>
        {Object.entries(services).map(([serviceId, service]) => (
          <div key={serviceId} style={{
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            padding: '1rem',
            marginBottom: '1rem',
            background: 'white'
          }}>
            <h3>{service.title}</h3>
            <p>{service.description}</p>
            
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
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
            </div>
          </div>
        ))}
      </div>

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
    </div>
  );
};

export default AdminServicesPage;
