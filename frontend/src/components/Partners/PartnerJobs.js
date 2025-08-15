// frontend/src/components/Partners/PartnerJobs.js
// Version complète avec import d'offres partenaires

import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import MatchingAnalysis from '../Analysis/MatchingAnalysis';
import { 
  FiLoader, FiAlertCircle, FiBriefcase, FiMapPin, 
  FiDollarSign, FiClock, FiUsers, FiTarget, FiCheck,
  FiArrowLeft, FiEye, FiDownload, FiGlobe
} from 'react-icons/fi';
import toast from 'react-hot-toast';

// ⭐ NOUVEAU COMPOSANT POUR AFFICHER LE LOGO
const CompanyLogo = ({ company, size = 'medium' }) => {
  const isUrl = company.logo && (company.logo.startsWith('http') || company.logo.startsWith('/') || company.logo.includes('.'));
  
  const sizeStyles = {
    small: { width: '32px', height: '32px', fontSize: '1rem' },
    medium: { width: '48px', height: '48px', fontSize: '1.5rem' },
    large: { width: '64px', height: '64px', fontSize: '2rem' }
  };
  
  const baseStyle = {
    ...sizeStyles[size],
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0
  };
  
  if (isUrl) {
    return (
      <img
        src={company.logo}
        alt={`Logo ${company.name}`}
        style={{
          ...baseStyle,
          objectFit: 'contain',
          backgroundColor: '#f9fafb',
          border: '1px solid #e5e7eb'
        }}
        onError={(e) => {
          // En cas d'erreur de chargement, afficher l'emoji par défaut
          e.target.style.display = 'none';
          if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
        }}
      />
    );
  } else {
    return (
      <div style={{
        ...baseStyle,
        background: company.logo && company.logo !== '🏢' ? 'transparent' : '#f3f4f6',
        color: company.logo && company.logo !== '🏢' ? 'inherit' : '#6b7280',
        border: company.logo && company.logo !== '🏢' ? 'none' : '1px solid #e5e7eb'
      }}>
        {company.logo || '🏢'}
      </div>
    );
  }
};

const PartnerJobs = () => {
  console.log('PartnerJobs mounted');
  const [partnersData, setPartnersData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentView, setCurrentView] = useState('companies'); // 'companies' | 'jobs' | 'details'
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [selectedJob, setSelectedJob] = useState(null);
  const [importingJob, setImportingJob] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState(null);

  const { documentStatus, loadDocumentsStatus } = useApp();

  useEffect(() => {
    loadPartnersData();
  }, []);

  const loadPartnersData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/partner-jobs/', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`Erreur ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.success && data.partners) {
        setPartnersData(data.partners);
      } else {
        throw new Error(data.error || 'Données invalides');
      }
    } catch (err) {
      console.error('Erreur chargement partenaires:', err);
      setError(err.message);
      // Données de test en cas d'erreur
      setPartnersData([
        {
          id: 1,
          name: "TechCorp Solutions",
          description: "Solutions digitales innovantes",
          logo: "🏢",
          sector: "Technologie",
          contactAddress: "recrutement@techcorp.com",
          website: "https://techcorp.com",
          jobs: [
            {
              id: 101,
              title: "Développeur Full Stack",
              description: "Développement d'applications web modernes avec React et Node.js",
              detailedDescription: "Rejoignez notre équipe de développement pour créer des solutions innovantes. Vous travaillerez sur des projets variés en utilisant les dernières technologies web.",
              contractType: "CDI",
              location: "Paris, France",
              salary: "45k-65k€",
              skills: ["React", "Node.js", "MongoDB"],
              experience: "2-5 ans",
              remote: true
            }
          ]
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Sélectionner une entreprise et afficher ses postes
  const handleCompanyClick = (company) => {
    setSelectedCompany(company);
    setCurrentView('jobs');
  };

  // Afficher les détails d'un poste
  const handleJobClick = (job) => {
    setSelectedJob(job);
    setCurrentView('details');
  };

  // Retour à la liste des entreprises
  const handleBackToCompanies = () => {
    setCurrentView('companies');
    setSelectedCompany(null);
    setSelectedJob(null);
    setAnalysisResult(null);
    setAnalysisError(null);
  };

  // Retour à la liste des postes
  const handleBackToJobs = () => {
    setCurrentView('jobs');
    setSelectedJob(null);
    setAnalysisResult(null);
    setAnalysisError(null);
  };

  // Lancer automatiquement l'analyse de compatibilité après l'import
  const performCompatibilityAnalysis = async () => {
    if (!documentStatus.cv?.uploaded) {
      return;
    }

    try {
      setAnalysisLoading(true);
      setAnalysisError(null);

      const response = await fetch('/api/actions/compatibility', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ service_id: 'matching_cv_offre' })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        setAnalysisResult(data.matching || data.response || data.analysis);
      } else {
        throw new Error(data.error || 'Erreur analyse');
      }
    } catch (e) {
      console.error('Erreur analyse compatibilité:', e);
      setAnalysisError(e.message);
    } finally {
      setAnalysisLoading(false);
    }
  };

  // ✅ FONCTION PRINCIPALE : Importer l'offre partenaire comme offre utilisateur
  const handleImportJobOffer = async (job) => {
    try {
      setImportingJob(true);
      
      // Créer l'offre complète avec toutes les informations
      const offreComplete = {
        // Infos du poste
        id: job.id,
        title: job.title,
        description: job.description,
        detailedDescription: job.detailedDescription || job.description,
        contractType: job.contractType || 'CDI',
        location: job.location || 'Non spécifié',
        salary: job.salary || 'À négocier',
        skills: job.skills || [],
        experience: job.experience || 'Non spécifié',
        remote: job.remote || false,
        
        // Infos de l'entreprise partenaire
        partnerName: selectedCompany.name,
        partnerId: selectedCompany.id,
        partnerLogo: selectedCompany.logo,
        partnerDescription: selectedCompany.description,
        partnerSector: selectedCompany.sector,
        contactAddress: selectedCompany.contactAddress,
        website: selectedCompany.website,
        
        // Description formatée pour l'IA
        detailedDescription: `
OFFRE D'EMPLOI - ${selectedCompany.name}
====================================

🎯 POSTE: ${job.title}
🏢 ENTREPRISE: ${selectedCompany.name}
🏭 SECTEUR: ${selectedCompany.sector || 'Non spécifié'}
📍 LOCALISATION: ${job.location || 'Non spécifié'}
💼 TYPE DE CONTRAT: ${job.contractType || 'CDI'}
💰 SALAIRE: ${job.salary || 'À négocier'}
🏠 TÉLÉTRAVAIL: ${job.remote ? 'Possible' : 'Non mentionné'}
📈 EXPÉRIENCE: ${job.experience || 'Non spécifié'}

📝 DESCRIPTION DU POSTE:
${job.detailedDescription || job.description}

🛠️ COMPÉTENCES REQUISES:
${Array.isArray(job.skills) ? job.skills.map(skill => `- ${skill}`).join('\n') : (job.skills || 'Non spécifiées')}

🏢 À PROPOS DE L'ENTREPRISE:
${selectedCompany.description}

📧 CONTACT:
${selectedCompany.contactAddress || 'Non spécifié'}
🌐 SITE WEB:
${selectedCompany.website || 'Non spécifié'}

---
Source: Offre partenaire IAMONJOB
        `.trim()
      };

      // ✅ UTILISER FETCH DIRECTEMENT (plus fiable)
      const response = await fetch('/api/documents/upload-offre-partenaire', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ offre: offreComplete })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success) {
        toast.success(
          `🎯 Offre "${job.title}" importée avec succès !\n\n` +
          `✅ Vous pouvez maintenant :\n` +
          `• Analyser la compatibilité avec votre CV\n` +
          `• Générer une lettre de motivation\n` +
          `• Préparer votre entretien\n\n` +
          `L'offre remplace votre précédente offre d'emploi.`,
          {
            duration: 6000,
            style: {
              background: '#10b981',
              color: '#fff',
              maxWidth: '500px'
            }
          }
        );

        // Rafraîchir le statut des documents puis lancer l'analyse auto
        await loadDocumentsStatus();
        await performCompatibilityAnalysis();

        // Message informatif supplémentaire après un délai
        setTimeout(() => {
          toast(
            `💡 Conseil : Allez dans "Services" pour utiliser l'analyse de compatibilité avec cette nouvelle offre !`,
            {
              icon: '🚀',
              duration: 4000,
              style: {
                background: '#3b82f6',
                color: '#fff'
              }
            }
          );
        }, 2000);
        
      } else {
        throw new Error(result.error || 'Erreur lors de l\'import');
      }
    } catch (error) {
      console.error('Erreur import offre:', error);
      toast.error(`❌ Erreur : ${error.message}`, { duration: 5000 });
    } finally {
      setImportingJob(false);
    }
  };

  // Fonction pour contacter l'entreprise
  const handleContactCompany = (company, job = null) => {
    const contactAddress = company.contactAddress;
    
    if (!contactAddress) {
      toast.error('Aucun contact disponible pour cette entreprise');
      return;
    }

    if (contactAddress.includes('@')) {
      // C'est un email
      const subject = `Candidature IAMONJOB - ${company.name}${job ? ` - ${job.title}` : ''}`;
      const body = `Bonjour,\n\nJe souhaite postuler ${job ? `pour le poste de ${job.title}` : 'chez votre entreprise'} via la plateforme IAMONJOB.\n\nJe vous prie de me contacter pour discuter des opportunités disponibles.\n\nCordialement`;
      
      window.location.href = `mailto:${contactAddress}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      
      toast.success('Email de candidature ouvert !');
    } else {
      // C'est probablement une URL
      const url = contactAddress.startsWith('http') ? contactAddress : `https://${contactAddress}`;
      window.open(url, '_blank');
      
      toast.success('Page de candidature ouverte !');
    }
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '3rem',
        color: '#6b7280'
      }}>
        <FiLoader style={{ 
          fontSize: '2rem', 
          animation: 'spin 1s linear infinite',
          marginBottom: '1rem'
        }} />
        <p>Chargement des entreprises partenaires...</p>
        <style>
          {`
            @keyframes spin {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
          `}
        </style>
      </div>
    );
  }

  if (error && partnersData.length === 0) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '3rem',
        color: '#dc2626'
      }}>
        <FiAlertCircle style={{ fontSize: '2rem', marginBottom: '1rem' }} />
        <p>{error}</p>
        <button
          onClick={loadPartnersData}
          style={{
            marginTop: '1rem',
            padding: '0.5rem 1rem',
            background: '#0a6b79',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          Réessayer
        </button>
      </div>
    );
  }

  // Vue des entreprises (logos + secteurs)
  if (currentView === 'companies') {
    return (
      <div>


        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: '1.5rem'
        }}>
          {partnersData.map((company) => (
            <div
              key={company.id}
              onClick={() => handleCompanyClick(company)}
              style={{
                background: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '12px',
                padding: '1.5rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                ':hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  borderColor: '#0a6b79'
                }
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                e.target.style.borderColor = '#0a6b79';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
                e.target.style.borderColor = '#e5e7eb';
              }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                marginBottom: '1rem'
              }}>
                {/* ⭐ NOUVEAU : Utilisation du composant CompanyLogo */}
                <CompanyLogo company={company} size="large" />
                
                <div style={{ flex: 1 }}>
                  <h4 style={{
                    margin: 0,
                    fontSize: '1.2rem',
                    fontWeight: '600',
                    color: '#1f2937',
                    marginBottom: '0.25rem'
                  }}>
                    {company.name}
                  </h4>
                  <span style={{
                    fontSize: '0.875rem',
                    color: '#6b7280',
                    background: '#f3f4f6',
                    padding: '0.25rem 0.5rem',
                    borderRadius: '4px'
                  }}>
                    {company.sector}
                  </span>
                </div>
              </div>

              <p style={{
                margin: 0,
                fontSize: '0.875rem',
                color: '#6b7280',
                lineHeight: '1.4',
                marginBottom: '1rem'
              }}>
                {company.description}
              </p>

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '0.875rem'
              }}>
                <span style={{ color: '#6b7280' }}>
                  {company.jobs?.length || 0} poste{company.jobs?.length !== 1 ? 's' : ''}
                </span>
                <span style={{
                  color: '#0a6b79',
                  fontWeight: '500'
                }}>
                  Voir les offres →
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Vue des postes d'une entreprise
  if (currentView === 'jobs' && selectedCompany) {
    return (
      <div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          marginBottom: '2rem'
        }}>
          <button
            onClick={handleBackToCompanies}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 1rem',
              background: 'transparent',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              cursor: 'pointer',
              color: '#6b7280'
            }}
          >
            <FiArrowLeft />
            Retour
          </button>
          
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem'
          }}>
            {/* ⭐ NOUVEAU : Utilisation du composant CompanyLogo */}
            <CompanyLogo company={selectedCompany} size="large" />
            
            <div>
              <h3 style={{
                margin: 0,
                fontSize: '1.5rem',
                fontWeight: '600',
                color: '#1f2937'
              }}>
                {selectedCompany.name}
              </h3>
              <p style={{
                margin: '0.25rem 0 0 0',
                color: '#6b7280'
              }}>
                {selectedCompany.description}
              </p>
            </div>
          </div>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
          gap: '1.5rem'
        }}>
          {selectedCompany.jobs?.map((job) => (
            <div
              key={job.id}
              onClick={() => handleJobClick(job)}
              style={{
                background: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '16px',
                padding: '1.5rem',
                cursor: 'pointer',
                transition: 'all 0.2s cubic-bezier(0.25,0.46,0.45,0.94)',
                boxShadow: '0 4px 24px rgba(10,107,121,0.08)',
                display: 'flex',
                flexDirection: 'column',
                minHeight: '180px',
                position: 'relative',
                marginBottom: '0.5rem'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-4px) scale(1.01)';
                e.currentTarget.style.boxShadow = '0 15px 40px rgba(0,0,0,0.08), 0 0 30px rgba(102,126,234,0.1)';
                e.currentTarget.style.borderColor = '#0a6b79';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0) scale(1)';
                e.currentTarget.style.boxShadow = '0 4px 24px rgba(10,107,121,0.08)';
                e.currentTarget.style.borderColor = '#e5e7eb';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                {/* Logo entreprise à la place de l'icône */}
                <CompanyLogo company={selectedCompany} size="medium" />
                <span style={{ fontWeight: 600, color: '#0a6b79', fontSize: '1rem' }}>{selectedCompany.name}</span>
              </div>
              <h4 style={{
                margin: 0,
                fontSize: '1.1rem',
                fontWeight: '600',
                color: '#1f2937',
                marginBottom: '0.5rem'
              }}>
                {job.title}
              </h4>
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '0.5rem',
                marginBottom: '0.75rem'
              }}>
                <span style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  fontSize: '0.8rem',
                  color: '#6b7280'
                }}>
                  <FiMapPin size={12} />
                  {job.location || 'Localisation non spécifiée'}
                </span>
                <span style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  fontSize: '0.8rem',
                  color: '#6b7280'
                }}>
                  <FiBriefcase size={12} />
                  {job.contractType || 'CDI'}
                </span>
                {job.salary && (
                  <span style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    fontSize: '0.8rem',
                    color: '#6b7280'
                  }}>
                    <FiDollarSign size={12} />
                    {job.salary}
                  </span>
                )}
              </div>

              <p style={{
                margin: 0,
                fontSize: '0.875rem',
                color: '#6b7280',
                lineHeight: '1.4',
                marginBottom: '1rem'
              }}>
                {job.description?.substring(0, 120)}{job.description?.length > 120 ? '...' : ''}
              </p>

              {job.skills && job.skills.length > 0 && (
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '0.5rem',
                  marginBottom: '1rem'
                }}>
                  {job.skills.slice(0, 3).map((skill, index) => (
                    <span
                      key={index}
                      style={{
                        fontSize: '0.75rem',
                        background: '#e0f2fe',
                        color: '#0c4a6e',
                        padding: '0.25rem 0.5rem',
                        borderRadius: '4px'
                      }}
                    >
                      {skill}
                    </span>
                  ))}
                  {job.skills.length > 3 && (
                    <span style={{
                      fontSize: '0.75rem',
                      color: '#6b7280'
                    }}>
                      +{job.skills.length - 3} autres
                    </span>
                  )}
                </div>
              )}

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '0.875rem'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  color: '#6b7280'
                }}>
                  <FiClock size={12} />
                  {job.experience || 'Expérience non spécifiée'}
                </div>
                <span style={{
                  color: '#0a6b79',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem'
                }}>
                  <FiEye size={12} />
                  Voir le détail
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Vue détail d'un poste
  if (currentView === 'details' && selectedJob && selectedCompany) {
    return (
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          marginBottom: '2rem'
        }}>
          <button
            onClick={handleBackToJobs}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 1rem',
              background: 'transparent',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              cursor: 'pointer',
              color: '#6b7280'
            }}
          >
            <FiArrowLeft />
            Retour aux offres
          </button>
        </div>

        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '2rem',
          border: '1px solid #e5e7eb',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1.5rem',
            marginBottom: '2rem'
          }}>
            {/* ⭐ NOUVEAU : Logo dans la vue détaillée */}
            <CompanyLogo company={selectedCompany} size="large" />
            
            <div style={{ flex: 1 }}>
              <h1 style={{
                margin: 0,
                fontSize: '1.8rem',
                fontWeight: '700',
                color: '#1f2937',
                marginBottom: '0.5rem'
              }}>
                {selectedJob.title}
              </h1>
              <h2 style={{
                margin: 0,
                fontSize: '1.2rem',
                fontWeight: '500',
                color: '#0a6b79',
                marginBottom: '0.5rem'
              }}>
                {selectedCompany.name}
              </h2>
              <p style={{
                margin: 0,
                color: '#6b7280',
                fontSize: '0.9rem'
              }}>
                {selectedCompany.sector} • {selectedCompany.description}
              </p>
            </div>
          </div>

          {/* Contenu principal */}
          <div>
            <div style={{
              background: 'white',
              borderRadius: '12px',
              padding: '2rem',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              marginBottom: '1.5rem'
            }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '1rem',
                margin: '1.5rem 0',
                padding: '1.5rem',
                background: '#f8fafc',
                borderRadius: '8px'
              }}>
                {selectedJob.contractType && (
                  <div>
                    <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                      Type de contrat
                    </div>
                    <div style={{ fontWeight: '600', color: '#1f2937' }}>
                      {selectedJob.contractType}
                    </div>
                  </div>
                )}
                
                {selectedJob.location && (
                  <div>
                    <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                      Localisation
                    </div>
                    <div style={{ fontWeight: '600', color: '#1f2937' }}>
                      {selectedJob.location}
                    </div>
                  </div>
                )}
                
                {selectedJob.salary && (
                  <div>
                    <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                      Salaire
                    </div>
                    <div style={{ fontWeight: '600', color: '#1f2937' }}>
                      {selectedJob.salary}
                    </div>
                  </div>
                )}
                
                {selectedJob.experience && (
                  <div>
                    <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                      Expérience
                    </div>
                    <div style={{ fontWeight: '600', color: '#1f2937' }}>
                      {selectedJob.experience}
                    </div>
                  </div>
                )}
              </div>

              <div style={{ marginBottom: '2rem' }}>
                <h3 style={{
                  fontSize: '1.1rem',
                  fontWeight: '600',
                  color: '#1f2937',
                  marginBottom: '1rem'
                }}>
                  Description du poste
                </h3>
                <div style={{
                  color: '#4b5563',
                  lineHeight: '1.6',
                  whiteSpace: 'pre-wrap'
                }}>
                  {selectedJob.detailedDescription || selectedJob.description}
                </div>
              </div>

              {selectedJob.skills && selectedJob.skills.length > 0 && (
                <div>
                  <h3 style={{
                    fontSize: '1.1rem',
                    fontWeight: '600',
                    color: '#1f2937',
                    marginBottom: '1rem'
                  }}>
                    Compétences recherchées
                  </h3>
                  <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '0.5rem'
                  }}>
                    {(Array.isArray(selectedJob.skills) ? selectedJob.skills : [selectedJob.skills]).map((skill, index) => (
                      <span
                        key={index}
                        style={{
                          background: '#dbeafe',
                          color: '#1d4ed8',
                          padding: '0.5rem 1rem',
                          borderRadius: '6px',
                          fontSize: '0.875rem',
                          fontWeight: '500'
                        }}
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar actions */}
          <div>
            <div style={{
              background: 'white',
              borderRadius: '12px',
              padding: '1.5rem',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              position: 'sticky',
              top: '2rem'
            }}>
              <h3 style={{
                fontSize: '1.1rem',
                fontWeight: '600',
                color: '#1f2937',
                marginBottom: '1rem'
              }}>
                Actions
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <button
                  onClick={() => handleImportJobOffer(selectedJob)}
                  disabled={importingJob}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    width: '100%',
                    padding: '0.75rem',
                    background: importingJob ? '#6b7280' : '#0a6b79',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: importingJob ? 'not-allowed' : 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: '500'
                  }}
                >
                  {importingJob ? (
                    <FiLoader style={{ animation: 'spin 1s linear infinite' }} />
                  ) : (
                    <FiTarget size={16} />
                  )}
                  {importingJob ? 'Import en cours...' : 'Importer cette offre'}
                </button>

                <button
                  onClick={() => handleContactCompany(selectedCompany, selectedJob)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    width: '100%',
                    padding: '0.75rem',
                    background: 'transparent',
                    border: '1px solid #0a6b79',
                    color: '#0a6b79',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: '500'
                  }}
                >
                  <FiGlobe size={16} />
                  Contacter l'entreprise
                </button>
              </div>

              <div style={{
                marginTop: '1.5rem',
                padding: '1rem',
                background: '#f0f9ff',
                borderRadius: '8px',
                border: '1px solid #0ea5e9'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  marginBottom: '0.5rem'
                }}>
                  <FiCheck style={{ color: '#0ea5e9' }} size={16} />
                  <span style={{
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    color: '#0c4a6e'
                  }}>
                    Après import
                  </span>
                </div>
                <ul style={{
                  fontSize: '0.8rem',
                  color: '#0c4a6e',
                  margin: 0,
                  paddingLeft: '1rem',
                  lineHeight: '1.4'
                }}>
                  <li>Analyse de compatibilité CV</li>
                  <li>Génération lettre de motivation</li>
                  <li>Préparation d'entretien</li>
                  <li>Conseils personnalisés</li>
                </ul>
              </div>

              {selectedCompany.website && (
                <div style={{
                  marginTop: '1rem',
                  fontSize: '0.875rem',
                  color: '#6b7280'
                }}>
                  <a
                    href={selectedCompany.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      color: '#0a6b79',
                      textDecoration: 'none'
                    }}
                  >
                    🌐 Site web de l'entreprise
                  </a>
                </div>
              )}
            </div>
          </div>
          {(analysisLoading || analysisResult || analysisError) && (
            <div style={{ marginTop: '2rem' }}>
              <h3 style={{
                fontSize: '1.1rem',
                fontWeight: '600',
                color: '#1f2937',
                marginBottom: '1rem'
              }}>
                Analyse de compatibilité
              </h3>
              {analysisLoading && (
                <div style={{ color: '#0a6b79' }}>Analyse en cours...</div>
              )}
              {analysisError && (
                <div style={{ color: '#dc2626' }}>{analysisError}</div>
              )}
              {analysisResult && (
                <MatchingAnalysis preloadedData={analysisResult} hideButton={true} />
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
};

export default PartnerJobs;
