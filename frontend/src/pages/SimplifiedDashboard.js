import React, { useState } from 'react';
import { FiUpload, FiCheck, FiArrowRight, FiTarget, FiTrendingUp, FiSmile } from 'react-icons/fi';
import { LogoIcon } from '../components/icons/ModernIcons';

const SimplifiedDashboard = () => {
  // Simulation d'états pour la maquette
  const [step, setStep] = useState(1); // 1: Upload, 2: Analyse, 3: Dashboard
  const [isUploading, setIsUploading] = useState(false);

  // Fonction factice pour simuler le parcours
  const handleFakeUpload = () => {
    setIsUploading(true);
    // Simulation upload + analyse
    setTimeout(() => {
      setIsUploading(false);
      setStep(2); // Passage à l'écran de succès/transition
      setTimeout(() => setStep(3), 2000); // Passage au dashboard final
    }, 1500);
  };

  // --- STYLES INLINE POUR LA MAQUETTE RAPIDE ---
  const styles = {
    container: {
      minHeight: '100vh',
      background: '#f8fafc',
      fontFamily: '-apple-system, sans-serif',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '40px 20px',
    },
    card: {
      background: 'white',
      borderRadius: '24px',
      boxShadow: '0 20px 50px rgba(0,0,0,0.05)',
      width: '100%',
      maxWidth: '900px',
      padding: '40px',
      textAlign: 'center',
      transition: 'all 0.3s ease',
    },
    title: {
      fontSize: '2rem',
      color: '#1f2937',
      marginBottom: '1rem',
      fontWeight: '700',
    },
    subtitle: {
      fontSize: '1.1rem',
      color: '#6b7280',
      marginBottom: '3rem',
      lineHeight: '1.6',
    },
    primaryButton: {
      background: 'linear-gradient(135deg, #0a6b79 0%, #27a2b4 100%)',
      color: 'white',
      border: 'none',
      padding: '18px 40px',
      fontSize: '1.2rem',
      borderRadius: '50px',
      cursor: 'pointer',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '12px',
      fontWeight: '600',
      boxShadow: '0 10px 25px rgba(10, 107, 121, 0.3)',
      transition: 'transform 0.2s',
    },
    uploadArea: {
      border: '3px dashed #e5e7eb',
      borderRadius: '20px',
      padding: '60px',
      marginBottom: '30px',
      cursor: 'pointer',
      background: '#f9fafb',
      transition: 'border-color 0.2s',
    },
    gridTwo: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '24px',
      marginTop: '30px',
    },
    actionCard: {
      background: 'white',
      border: '1px solid #e5e7eb',
      borderRadius: '20px',
      padding: '30px',
      textAlign: 'left',
      cursor: 'pointer',
      transition: 'transform 0.2s, border-color 0.2s',
    },
    badge: {
      background: '#dcfce7',
      color: '#166534',
      padding: '4px 12px',
      borderRadius: '20px',
      fontSize: '0.8rem',
      fontWeight: '600',
      marginBottom: '10px',
      display: 'inline-block',
    }
  };

  // --- VUE 1 : L'ACCUEIL ÉPURÉ (ONBOARDING) ---
  if (step === 1) {
    return (
      <div style={styles.container}>
        <div style={{ marginBottom: '40px' }}><LogoIcon size={60} /></div>
        
        <div style={styles.card}>
          <h1 style={styles.title}>Bonjour ! Commençons par le début.</h1>
          <p style={styles.subtitle}>
            Pour que votre coach IA puisse vous aider à trouver le job idéal,<br/>
            il a besoin de connaître votre parcours.
          </p>

          <div style={styles.uploadArea} onClick={handleFakeUpload}>
            {isUploading ? (
              <div style={{ color: '#0a6b79', fontWeight: '600' }}>
                🔄 Analyse de votre CV en cours...
              </div>
            ) : (
              <>
                <div style={{ color: '#0a6b79', fontSize: '3rem', marginBottom: '20px' }}><FiUpload /></div>
                <h3 style={{ fontSize: '1.3rem', margin: '0 0 10px 0', color: '#374151' }}>Déposez votre CV ici</h3>
                <p style={{ color: '#9ca3af', margin: 0 }}>PDF ou Word acceptés</p>
              </>
            )}
          </div>

          {!isUploading && (
            <button style={styles.primaryButton} onClick={handleFakeUpload}>
              Sélectionner mon fichier
            </button>
          )}
        </div>
      </div>
    );
  }

  // --- VUE 2 : TRANSITION / SUCCÈS ---
  if (step === 2) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={{ 
            width: '80px', height: '80px', background: '#dcfce7', borderRadius: '50%', 
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px auto',
            color: '#166534', fontSize: '40px'
          }}>
            <FiCheck />
          </div>
          <h2 style={styles.title}>CV analysé avec succès !</h2>
          <p style={styles.subtitle}>
            J'ai bien compris votre profil. Je peux maintenant vous aider<br/>
            à optimiser votre recherche.
          </p>
        </div>
      </div>
    );
  }

  // --- VUE 3 : DASHBOARD SIMPLIFIÉ (ACTION) ---
  return (
    <div style={styles.container}>
      {/* Header simplifié */}
      <div style={{ width: '100%', maxWidth: '900px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <LogoIcon size={32} />
          <span style={{ fontWeight: '700', fontSize: '1.2rem', color: '#1f2937' }}>Mon Espace</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={styles.badge}>CV : À jour</span>
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><FiSmile /></div>
        </div>
      </div>

      <div style={styles.card}>
        <h2 style={{ ...styles.title, fontSize: '1.8rem', textAlign: 'left' }}>Que souhaitez-vous faire aujourd'hui ?</h2>
        <p style={{ ...styles.subtitle, textAlign: 'left', marginBottom: '20px' }}>
          J'ai analysé votre profil. Voici les 2 meilleures options pour avancer :
        </p>

        <div style={styles.gridTwo}>
          {/* Option A : Chercher un job */}
          <div style={styles.actionCard} className="hover-scale">
            <div style={{ color: '#0a6b79', fontSize: '2rem', marginBottom: '16px' }}><FiTarget /></div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '700', margin: '0 0 8px 0', color: '#1f2937' }}>J'ai vu une offre d'emploi</h3>
            <p style={{ color: '#6b7280', fontSize: '0.95rem', lineHeight: '1.5' }}>
              Collez l'offre ici. Je vais vous dire si vous êtes compatible et comment adapter votre CV pour décrocher l'entretien.
            </p>
            <div style={{ marginTop: '20px', color: '#0a6b79', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '5px' }}>
              Tester la compatibilité <FiArrowRight />
            </div>
          </div>

          {/* Option B : Améliorer le profil */}
          <div style={styles.actionCard} className="hover-scale">
            <div style={{ color: '#c7356c', fontSize: '2rem', marginBottom: '16px' }}><FiTrendingUp /></div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '700', margin: '0 0 8px 0', color: '#1f2937' }}>Je veux améliorer mon CV</h3>
            <p style={{ color: '#6b7280', fontSize: '0.95rem', lineHeight: '1.5' }}>
              Votre CV a un score de 75/100. J'ai détecté 3 points faibles qui pourraient bloquer les recruteurs. Corrigeons-les.
            </p>
            <div style={{ marginTop: '20px', color: '#c7356c', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '5px' }}>
              Voir les conseils <FiArrowRight />
            </div>
          </div>
        </div>

        {/* Liens secondaires discrets */}
        <div style={{ marginTop: '40px', borderTop: '1px solid #f3f4f6', paddingTop: '20px', display: 'flex', gap: '20px', justifyContent: 'center' }}>
          <span style={{ color: '#9ca3af', fontSize: '0.9rem', cursor: 'pointer' }}>Préparer un entretien</span>
          <span style={{ color: '#9ca3af', fontSize: '0.9rem', cursor: 'pointer' }}>Idées de reconversion</span>
          <span style={{ color: '#9ca3af', fontSize: '0.9rem', cursor: 'pointer' }}>Mes documents</span>
        </div>
      </div>
    </div>
  );
};

export default SimplifiedDashboard;
