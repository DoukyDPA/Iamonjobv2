// FICHIER : frontend/src/pages/AdminPartnersPage.js
// Interface d'administration pour gérer les partenaires - VERSION SIMPLIFIÉE

import React, { useState, useEffect } from 'react';
import {
  FiPlus, FiEdit2, FiTrash2, FiSave, FiX, FiBriefcase,
  FiMail, FiImage, FiLoader, FiGlobe, FiRefreshCw, FiCheck,
  FiAlertCircle, FiPlay, FiVideo
} from 'react-icons/fi';
import Header from '../components/Layout/Header';
import './AdminPartnersPage.css';

const AdminPartnersPage = () => {
  const [partnersData, setPartnersData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [currentPartnerId, setCurrentPartnerId] = useState(null);
  const [currentJobId, setCurrentJobId] = useState(null);
  const [showPartnerForm, setShowPartnerForm] = useState(false);
  const [showJobForm, setShowJobForm] = useState(false);
  const [editingPartner, setEditingPartner] = useState(null);
  const [editingJob, setEditingJob] = useState(null);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [debugInfo, setDebugInfo] = useState('');

  // Chargement des données
  useEffect(() => {
    loadPartnersData();
  }, []);

  const addDebugInfo = (info) => {
    setDebugInfo(prev => prev + '\n' + new Date().toLocaleTimeString() + ': ' + info);
    console.log('🐛 DEBUG:', info);
  };

  const loadPartnersData = async () => {
    try {
      setLoading(true);
      addDebugInfo('📡 Début chargement des données...');
      
      const response = await fetch('/api/partner-jobs/', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      addDebugInfo(`📡 Response status: ${response.status}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      addDebugInfo(`📊 Données reçues: ${JSON.stringify(data, null, 2)}`);
      
      if (data.success) {
        setPartnersData(data.partners || []);
        setError(null);
        addDebugInfo(`✅ ${data.partners?.length || 0} partenaires chargés`);
      } else {
        throw new Error(data.error || 'Erreur de chargement');
      }
    } catch (err) {
      console.error('❌ Erreur chargement partenaires:', err);
      addDebugInfo(`❌ Erreur: ${err.message}`);
      setError('Impossible de charger les données: ' + err.message);
      setPartnersData([]);
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (text, type = 'success') => {
    setMessage({ text, type });
    addDebugInfo(`💬 Message: ${text} (${type})`);
    setTimeout(() => setMessage({ text: '', type: '' }), 5000);
  };

  // Sauvegarde globale
  const saveAllData = async () => {
    try {
      setSaving(true);
      addDebugInfo('💾 Début sauvegarde...');
      addDebugInfo(`💾 Données à sauvegarder: ${JSON.stringify(partnersData, null, 2)}`);
      
      const response = await fetch('/api/partner-jobs/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          partners: partnersData
        })
      });

      addDebugInfo(`💾 Response status: ${response.status}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        addDebugInfo(`❌ Response error: ${errorText}`);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      const result = await response.json();
      addDebugInfo(`💾 Response data: ${JSON.stringify(result, null, 2)}`);

      if (result.success) {
        showMessage('✅ Données sauvegardées avec succès !', 'success');
        addDebugInfo(`✅ Sauvegarde réussie: ${result.count} partenaires`);
      } else {
        throw new Error(result.error || 'Erreur de sauvegarde');
      }
    } catch (err) {
      console.error('❌ Erreur sauvegarde:', err);
      addDebugInfo(`❌ Erreur sauvegarde: ${err.message}`);
      showMessage(`❌ Erreur lors de la sauvegarde : ${err.message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  // Gestion des partenaires
  const addNewPartner = () => {
    const newPartner = {
      id: Date.now(),
      name: "",
      description: "",
      logo: "🏢",
      website: "",
      contactAddress: "",
      sector: "",
      jobs: []
    };
    setEditingPartner(newPartner);
    setCurrentPartnerId(newPartner.id);
    setShowPartnerForm(true);
    setShowJobForm(false);
    addDebugInfo(`➕ Nouveau partenaire créé: ID ${newPartner.id}`);
  };

  const editPartner = (partnerId) => {
    const partner = partnersData.find(p => p.id === partnerId);
    setEditingPartner({ ...partner });
    setCurrentPartnerId(partnerId);
    setShowPartnerForm(true);
    setShowJobForm(false);
    setCurrentJobId(null);
    addDebugInfo(`✏️ Édition partenaire: ${partner.name} (ID: ${partnerId})`);
  };

  const savePartner = () => {
    if (!editingPartner.name.trim()) {
      showMessage('❌ Le nom de l\'entreprise est requis', 'error');
      return;
    }

    const existingIndex = partnersData.findIndex(p => p.id === editingPartner.id);
    let newPartnersData;

    if (existingIndex >= 0) {
      // Mise à jour
      newPartnersData = [...partnersData];
      newPartnersData[existingIndex] = { ...editingPartner };
      addDebugInfo(`🔄 Partenaire mis à jour: ${editingPartner.name}`);
    } else {
      // Ajout
      newPartnersData = [...partnersData, { ...editingPartner }];
      addDebugInfo(`➕ Partenaire ajouté: ${editingPartner.name}`);
    }

    setPartnersData(newPartnersData);
    setShowPartnerForm(false);
    setEditingPartner(null);
    setCurrentPartnerId(null);
    showMessage('✅ Partenaire sauvegardé', 'success');
  };

  const deletePartner = (partnerId) => {
    const partner = partnersData.find(p => p.id === partnerId);
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer "${partner.name}" et tous ses métiers ?`)) {
      setPartnersData(partnersData.filter(p => p.id !== partnerId));
      showMessage('✅ Partenaire supprimé', 'success');
      addDebugInfo(`🗑️ Partenaire supprimé: ${partner.name}`);
    }
  };

  // Gestion des métiers
  const addNewJob = (partnerId) => {
    const newJob = {
      id: Date.now(),
      title: "",
      description: "",
      detailedDescription: "",
      videoUrl: "",
      posted: new Date().toISOString().split('T')[0]
    };
    setEditingJob(newJob);
    setCurrentPartnerId(partnerId);
    setCurrentJobId(newJob.id);
    setShowJobForm(true);
    setShowPartnerForm(false);
    addDebugInfo(`➕ Nouveau métier créé pour partenaire ${partnerId}: ID ${newJob.id}`);
  };

  const editJob = (partnerId, jobId) => {
    const partner = partnersData.find(p => p.id === partnerId);
    const job = partner.jobs.find(j => j.id === jobId);
    setEditingJob({ ...job });
    setCurrentPartnerId(partnerId);
    setCurrentJobId(jobId);
    setShowJobForm(true);
    setShowPartnerForm(false);
    addDebugInfo(`✏️ Édition métier: ${job.title} (ID: ${jobId})`);
  };

  const saveJob = () => {
    if (!editingJob.title.trim()) {
      showMessage('❌ Le titre du métier est requis', 'error');
      return;
    }

    const newPartnersData = partnersData.map(partner => {
      if (partner.id === currentPartnerId) {
        const existingJobIndex = partner.jobs.findIndex(j => j.id === editingJob.id);
        let newJobs;

        if (existingJobIndex >= 0) {
          // Mettre à jour
          newJobs = [...partner.jobs];
          newJobs[existingJobIndex] = { ...editingJob };
          addDebugInfo(`🔄 Métier mis à jour: ${editingJob.title}`);
        } else {
          // Ajouter
          newJobs = [...partner.jobs, { ...editingJob }];
          addDebugInfo(`➕ Métier ajouté: ${editingJob.title}`);
        }

        return { ...partner, jobs: newJobs };
      }
      return partner;
    });

    setPartnersData(newPartnersData);
    setShowJobForm(false);
    setEditingJob(null);
    setCurrentJobId(null);
    showMessage('✅ Métier sauvegardé', 'success');
  };

  const deleteJob = (partnerId, jobId) => {
    const partner = partnersData.find(p => p.id === partnerId);
    const job = partner.jobs.find(j => j.id === jobId);
    
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer le métier "${job.title}" ?`)) {
      const newPartnersData = partnersData.map(partner => {
        if (partner.id === partnerId) {
          return {
            ...partner,
            jobs: partner.jobs.filter(j => j.id !== jobId)
          };
        }
        return partner;
      });

      setPartnersData(newPartnersData);
      showMessage('✅ Métier supprimé', 'success');
      addDebugInfo(`🗑️ Métier supprimé: ${job.title}`);
    }
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '400px',
        gap: '1rem'
      }}>
        <FiLoader style={{ fontSize: '2rem', animation: 'spin 1s linear infinite' }} />
        <p>Chargement de l'interface d'administration...</p>
      </div>
    );
  }

  return (
    <>
      {/* Header d'administration */}
      <div style={{
        backgroundColor: 'white',
        borderBottom: '1px solid #e2e8f0',
        padding: '1rem 0',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '0 1rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <h1 style={{ 
              fontSize: '1.5rem', 
              fontWeight: 'bold', 
              margin: 0,
              color: '#1f2937'
            }}>
              Gestion des Partenaires
            </h1>
            <span style={{
              backgroundColor: '#f3f4f6',
              color: '#6b7280',
              padding: '0.25rem 0.75rem',
              borderRadius: '1rem',
              fontSize: '0.875rem',
              fontWeight: '500'
            }}>
              Administration
            </span>
          </div>
          
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <button
              onClick={addNewPartner}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 1rem',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '0.375rem',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: '500'
              }}
            >
              <FiPlus size={16} />
              Nouveau Partenaire
            </button>
            
            <button
              onClick={loadPartnersData}
              disabled={loading}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 1rem',
                backgroundColor: '#f3f4f6',
                color: '#374151',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '0.875rem',
                opacity: loading ? 0.6 : 1
              }}
            >
              <FiRefreshCw size={16} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
              Actualiser
            </button>
            
            <button
              onClick={saveAllData}
              disabled={saving}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1.5rem',
                backgroundColor: saving ? '#6b7280' : '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '0.375rem',
                cursor: saving ? 'not-allowed' : 'pointer',
                fontSize: '0.875rem',
                fontWeight: '500',
                opacity: saving ? 0.7 : 1
              }}
            >
              {saving ? (
                <>
                  <FiLoader size={16} style={{ animation: 'spin 1s linear infinite' }} />
                  Sauvegarde...
                </>
              ) : (
                <>
                  <FiSave size={16} />
                  Sauvegarder
                </>
              )}
            </button>
          </div>
        </div>
      </div>
      
      {/* Contenu principal */}
      <div className="admin-partners-container">
        {/* Messages */}
        {message.text && (
          <div style={{
            padding: '1rem',
            marginBottom: '1rem',
            borderRadius: '0.5rem',
            backgroundColor: message.type === 'success' ? '#d1fae5' : '#fecaca',
            color: message.type === 'success' ? '#065f46' : '#991b1b',
            border: `1px solid ${message.type === 'success' ? '#10b981' : '#ef4444'}`,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            {message.type === 'success' ? <FiCheck /> : <FiAlertCircle />}
            {message.text}
          </div>
        )}

        {/* Erreur */}
        {error && (
          <div style={{
            padding: '1rem',
            marginBottom: '1rem',
            borderRadius: '0.5rem',
            backgroundColor: '#fecaca',
            color: '#991b1b',
            border: '1px solid #ef4444'
          }}>
            <strong>Erreur:</strong> {error}
          </div>
        )}

        {/* Debug Info */}
        {debugInfo && (
          <details style={{ marginBottom: '1rem' }}>
            <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>
              🐛 Informations de debug
            </summary>
            <pre style={{
              background: '#f3f4f6',
              padding: '1rem',
              borderRadius: '0.5rem',
              fontSize: '0.8rem',
              maxHeight: '200px',
              overflow: 'auto',
              whiteSpace: 'pre-wrap'
            }}>
              {debugInfo}
            </pre>
            <button 
              onClick={() => setDebugInfo('')}
              style={{
                marginTop: '0.5rem',
                padding: '0.25rem 0.5rem',
                fontSize: '0.8rem',
                backgroundColor: '#6b7280',
                color: 'white',
                border: 'none',
                borderRadius: '0.25rem',
                cursor: 'pointer'
              }}
            >
              Effacer debug
            </button>
          </details>
        )}

        {/* Liste des partenaires */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {partnersData.map(partner => (
            <div key={partner.id} style={{
              backgroundColor: 'white',
              padding: '1.5rem',
              borderRadius: '0.75rem',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              border: '1px solid #e2e8f0'
            }}>
              {/* Partner Header */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1rem',
                paddingBottom: '1rem',
                borderBottom: '1px solid #f1f5f9'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div className="partner-logo">
                    {partner.logo ? (
                      partner.logo.startsWith('http') || partner.logo.startsWith('/') || partner.logo.includes('.') ? (
                        <img src={partner.logo} alt={partner.name} />
                      ) : (
                        <span>{partner.logo}</span>
                      )
                    ) : (
                      '🏢'
                    )}
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: 0 }}>
                      {partner.name || 'Nom non défini'}
                    </h3>
                    <p style={{ color: '#64748b', margin: '0.25rem 0 0 0', fontSize: '0.9rem' }}>
                      {partner.sector && `${partner.sector} • `}
                      {partner.jobs?.length || 0} métier(s)
                    </p>
                  </div>
                </div>
                
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={() => editPartner(partner.id)}
                    style={{
                      padding: '0.5rem',
                      backgroundColor: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '0.375rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                  >
                    <FiEdit2 size={16} color="#64748b" />
                  </button>
                  <button
                    onClick={() => deletePartner(partner.id)}
                    style={{
                      padding: '0.5rem',
                      backgroundColor: '#fef2f2',
                      border: '1px solid #fecaca',
                      borderRadius: '0.375rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                  >
                    <FiTrash2 size={16} color="#ef4444" />
                  </button>
                </div>
              </div>

              {/* Partner Info */}
              {(partner.description || partner.contactAddress || partner.website) && (
                <div style={{ 
                  marginBottom: '1rem',
                  backgroundColor: '#f8fafc',
                  padding: '1rem',
                  borderRadius: '0.5rem'
                }}>
                  {partner.description && (
                    <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem' }}>
                      {partner.description}
                    </p>
                  )}
                  <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem', color: '#64748b' }}>
                    {partner.contactAddress && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <FiMail size={12} />
                        {partner.contactAddress}
                      </span>
                    )}
                    {partner.website && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <FiGlobe size={12} />
                        {partner.website}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Métiers */}
              <div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '1rem'
                }}>
                  <h4 style={{ fontSize: '1rem', fontWeight: '600', margin: 0 }}>
                    Métiers ({partner.jobs?.length || 0})
                  </h4>
                  <button
                    onClick={() => addNewJob(partner.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.5rem 1rem',
                      backgroundColor: '#3b82f6',
                      color: 'white',
                      border: 'none',
                      borderRadius: '0.375rem',
                      cursor: 'pointer',
                      fontSize: '0.8rem'
                    }}
                  >
                    <FiPlus size={14} />
                    Ajouter un métier
                  </button>
                </div>
                
                {partner.jobs && partner.jobs.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {partner.jobs.map(job => (
                      <div key={job.id} style={{
                        backgroundColor: '#f1f5f9',
                        padding: '1rem',
                        borderRadius: '0.5rem',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'start'
                      }}>
                        <div style={{ flex: 1 }}>
                          <h5 style={{ 
                            fontSize: '0.95rem', 
                            fontWeight: '600', 
                            margin: '0 0 0.5rem 0' 
                          }}>
                            {job.title || 'Titre non défini'}
                          </h5>
                          <p style={{ 
                            fontSize: '0.85rem', 
                            color: '#64748b', 
                            margin: '0 0 0.5rem 0',
                            lineHeight: 1.4
                          }}>
                            {job.description || 'Pas de description'}
                          </p>
                          <div style={{ 
                            display: 'flex', 
                            gap: '1rem', 
                            fontSize: '0.75rem', 
                            color: '#6b7280' 
                          }}>
                            {job.videoUrl && (
                              <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                <FiVideo size={12} />
                                Vidéo disponible
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <div style={{ display: 'flex', gap: '0.5rem', marginLeft: '1rem' }}>
                          <button
                            onClick={() => editJob(partner.id, job.id)}
                            style={{
                              padding: '0.375rem',
                              backgroundColor: 'white',
                              border: '1px solid #d1d5db',
                              borderRadius: '0.25rem',
                              cursor: 'pointer'
                            }}
                          >
                            <FiEdit2 size={14} color="#6b7280" />
                          </button>
                          <button
                            onClick={() => deleteJob(partner.id, job.id)}
                            style={{
                              padding: '0.375rem',
                              backgroundColor: '#fef2f2',
                              border: '1px solid #fecaca',
                              borderRadius: '0.25rem',
                              cursor: 'pointer'
                            }}
                          >
                            <FiTrash2 size={14} color="#ef4444" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{
                    textAlign: 'center',
                    padding: '2rem',
                    color: '#6b7280',
                    fontStyle: 'italic'
                  }}>
                    Aucun métier pour ce partenaire
                  </div>
                )}
              </div>
            </div>
          ))}
          
          {partnersData.length === 0 && !loading && (
            <div style={{
              textAlign: 'center',
              padding: '3rem',
              backgroundColor: 'white',
              borderRadius: '0.75rem',
              border: '2px dashed #d1d5db'
            }}>
              <FiBriefcase size={48} color="#9ca3af" />
              <h3 style={{ fontSize: '1.25rem', color: '#6b7280', margin: '1rem 0 0.5rem 0' }}>
                Aucun partenaire
              </h3>
              <p style={{ color: '#9ca3af', margin: '0 0 1.5rem 0' }}>
                Ajoutez votre premier partenaire pour commencer
              </p>
              <button
                onClick={addNewPartner}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.5rem',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: '500'
                }}
              >
                <FiPlus />
                Ajouter un partenaire
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modal Partner Form */}
      {showPartnerForm && editingPartner && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '0.75rem',
            padding: '2rem',
            maxWidth: '600px',
            width: '100%',
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '1.5rem'
            }}>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0 }}>
                {partnersData.find(p => p.id === editingPartner.id) ? 'Modifier' : 'Ajouter'} un partenaire
              </h3>
              <button
                onClick={() => setShowPartnerForm(false)}
                style={{
                  padding: '0.5rem',
                  backgroundColor: 'transparent',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                <FiX size={24} color="#6b7280" />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  Nom de l'entreprise *
                </label>
                <input
                  type="text"
                  value={editingPartner.name}
                  onChange={(e) => setEditingPartner({...editingPartner, name: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.5rem',
                    fontSize: '1rem'
                  }}
                  placeholder="Ex: TechCorp"
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  Logo de l'entreprise
                </label>
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '1rem',
                    marginBottom: '0.75rem'
                  }}>
                    <div style={{
                      width: '48px',
                      height: '48px',
                      border: '2px dashed #d1d5db',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: '#f9fafb'
                    }}>
                      {editingPartner.logo ? (
                        editingPartner.logo.startsWith('http') || editingPartner.logo.startsWith('/') || editingPartner.logo.includes('.') ? (
                          <img 
                            src={editingPartner.logo} 
                            alt="Logo" 
                            style={{ 
                              width: '40px', 
                              height: '40px', 
                              objectFit: 'contain',
                              borderRadius: '4px'
                            }}
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.nextSibling.style.display = 'block';
                            }}
                          />
                        ) : (
                          <span style={{ fontSize: '1.5rem' }}>{editingPartner.logo}</span>
                        )
                      ) : (
                        <span style={{ color: '#9ca3af', fontSize: '0.875rem' }}>Logo</span>
                      )}
                      {editingPartner.logo && (editingPartner.logo.startsWith('http') || editingPartner.logo.startsWith('/') || editingPartner.logo.includes('.')) && (
                        <span style={{ 
                          display: 'none', 
                          color: '#ef4444', 
                          fontSize: '0.75rem' 
                        }}>
                          ❌
                        </span>
                      )}
                    </div>
                    
                    <div style={{ flex: 1 }}>
                      <p style={{ 
                        margin: 0, 
                        fontSize: '0.875rem', 
                        color: '#6b7280',
                        marginBottom: '0.5rem'
                      }}>
                        Utilisez une URL d'image ou un emoji
                      </p>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <span 
                          onClick={() => setEditingPartner({...editingPartner, logo: '🏢'})}
                          style={{ 
                            cursor: 'pointer', 
                            fontSize: '1.25rem',
                            padding: '0.25rem',
                            borderRadius: '4px',
                            backgroundColor: editingPartner.logo === '🏢' ? '#e0f2fe' : 'transparent'
                          }}
                        >🏢</span>
                        <span 
                          onClick={() => setEditingPartner({...editingPartner, logo: '💼'})}
                          style={{ 
                            cursor: 'pointer', 
                            fontSize: '1.25rem',
                            padding: '0.25rem',
                            borderRadius: '4px',
                            backgroundColor: editingPartner.logo === '💼' ? '#e0f2fe' : 'transparent'
                          }}
                        >💼</span>
                        <span 
                          onClick={() => setEditingPartner({...editingPartner, logo: '🚀'})}
                          style={{ 
                            cursor: 'pointer', 
                            fontSize: '1.25rem',
                            padding: '0.25rem',
                            borderRadius: '4px',
                            backgroundColor: editingPartner.logo === '🚀' ? '#e0f2fe' : 'transparent'
                          }}
                        >🚀</span>
                        <span 
                          onClick={() => setEditingPartner({...editingPartner, logo: '⚡'})}
                          style={{ 
                            cursor: 'pointer', 
                            fontSize: '1.25rem',
                            padding: '0.25rem',
                            borderRadius: '4px',
                            backgroundColor: editingPartner.logo === '⚡' ? '#e0f2fe' : 'transparent'
                          }}
                        >⚡</span>
                        <span 
                          onClick={() => setEditingPartner({...editingPartner, logo: '🎯'})}
                          style={{ 
                            cursor: 'pointer', 
                            fontSize: '1.25rem',
                            padding: '0.25rem',
                            borderRadius: '4px',
                            backgroundColor: editingPartner.logo === '🎯' ? '#e0f2fe' : 'transparent'
                          }}
                        >🎯</span>
                      </div>
                    </div>
                  </div>
                  
                  <input
                    type="text"
                    value={editingPartner.logo}
                    onChange={(e) => setEditingPartner({...editingPartner, logo: e.target.value})}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.5rem',
                      fontSize: '1rem'
                    }}
                    placeholder="URL du logo (ex: https://example.com/logo.png) ou emoji (ex: 🏢)"
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  Secteur d'activité
                </label>
                <input
                  type="text"
                  value={editingPartner.sector}
                  onChange={(e) => setEditingPartner({...editingPartner, sector: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.5rem',
                    fontSize: '1rem'
                  }}
                  placeholder="Ex: Technologie, Finance, Santé..."
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  Description
                </label>
                <textarea
                  value={editingPartner.description}
                  onChange={(e) => setEditingPartner({...editingPartner, description: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.5rem',
                    fontSize: '1rem',
                    minHeight: '100px',
                    resize: 'vertical'
                  }}
                  placeholder="Description de l'entreprise..."
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  Email de contact
                </label>
                <input
                  type="email"
                  value={editingPartner.contactAddress}
                  onChange={(e) => setEditingPartner({...editingPartner, contactAddress: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.5rem',
                    fontSize: '1rem'
                  }}
                  placeholder="contact@entreprise.com"
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  Site web
                </label>
                <input
                  type="url"
                  value={editingPartner.website}
                  onChange={(e) => setEditingPartner({...editingPartner, website: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.5rem',
                    fontSize: '1rem'
                  }}
                  placeholder="https://www.entreprise.com"
                />
              </div>
            </div>

            <div style={{ 
              display: 'flex', 
              gap: '1rem', 
              marginTop: '2rem',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={() => setShowPartnerForm(false)}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#f3f4f6',
                  color: '#374151',
                  border: 'none',
                  borderRadius: '0.5rem',
                  cursor: 'pointer',
                  fontSize: '0.9rem'
                }}
              >
                Annuler
              </button>
              <button
                onClick={savePartner}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.5rem',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: '500'
                }}
              >
                Sauvegarder
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Job Form */}
      {showJobForm && editingJob && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '0.75rem',
            padding: '2rem',
            maxWidth: '700px',
            width: '100%',
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '1.5rem'
            }}>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0 }}>
                {currentJobId ? 'Modifier' : 'Ajouter'} un métier
              </h3>
              <button
                onClick={() => setShowJobForm(false)}
                style={{
                  padding: '0.5rem',
                  backgroundColor: 'transparent',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                <FiX size={24} color="#6b7280" />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  Nom du métier *
                </label>
                <input
                  type="text"
                  value={editingJob.title}
                  onChange={(e) => setEditingJob({...editingJob, title: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.5rem',
                    fontSize: '1rem'
                  }}
                  placeholder="Ex: Développeur Full Stack"
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  Description courte
                </label>
                <textarea
                  value={editingJob.description}
                  onChange={(e) => setEditingJob({...editingJob, description: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.5rem',
                    fontSize: '1rem',
                    minHeight: '80px',
                    resize: 'vertical'
                  }}
                  placeholder="Description courte du métier..."
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  Description détaillée
                </label>
                <textarea
                  value={editingJob.detailedDescription}
                  onChange={(e) => setEditingJob({...editingJob, detailedDescription: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.5rem',
                    fontSize: '1rem',
                    minHeight: '120px',
                    resize: 'vertical'
                  }}
                  placeholder="Description complète du métier, missions, compétences requises..."
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  URL de la vidéo (optionnel)
                </label>
                <input
                  type="url"
                  value={editingJob.videoUrl || ''}
                  onChange={(e) => setEditingJob({...editingJob, videoUrl: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.5rem',
                    fontSize: '1rem'
                  }}
                  placeholder="https://www.youtube.com/watch?v=... ou https://vimeo.com/..."
                />
                <p style={{ 
                  fontSize: '0.8rem', 
                  color: '#6b7280', 
                  margin: '0.5rem 0 0 0',
                  fontStyle: 'italic'
                }}>
                  Supporte YouTube, Vimeo et autres plateformes vidéo
                </p>
              </div>
            </div>

            <div style={{ 
              display: 'flex', 
              gap: '1rem', 
              marginTop: '2rem',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={() => setShowJobForm(false)}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#f3f4f6',
                  color: '#374151',
                  border: 'none',
                  borderRadius: '0.5rem',
                  cursor: 'pointer',
                  fontSize: '0.9rem'
                }}
              >
                Annuler
              </button>
              <button
                onClick={saveJob}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.5rem',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: '500'
                }}
              >
                Sauvegarder
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AdminPartnersPage;
