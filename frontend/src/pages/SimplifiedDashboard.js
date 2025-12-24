import React, { useState } from 'react';
import { 
  FiUpload, 
  FiCheck, 
  FiArrowRight, 
  FiTarget, 
  FiTrendingUp, 
  FiSmile, 
  FiCompass // Nouvelle icône pour le projet
} from 'react-icons/fi';
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

  // --- STYLES INLINE MODIFIÉS ---
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
      maxWidth: '1100px', // Élargi pour accueillir 3 colonnes confortablement
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
    // Grille adaptative 3 colonnes
    actionGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
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
      transition: 'transform 0.2s, border-color 0.2s, box-shadow 0.2s',
      display: 'flex',
      flexDirection: 'column',
      height: '100%', // Pour aligner les hauteurs
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
    },
    cardIcon: {
      fontSize: '2rem', 
      marginBottom: '16px',
      width: '60px',
      height: '60px',
      borderRadius: '16px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  };

  // --- VUE 1 : L'ACCUEIL ÉPURÉ (ONBOARDING) ---
  if (step === 1) {
    return (
      <div style={styles.container}>
        <div style={{ marginBottom: '40px' }}><LogoIcon size={60} /></div>
        
        <div style={styles.card} style={{ maxWidth: '800px' }}>
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
        <div style={styles.card} style={{ maxWidth: '800px' }}>
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

  // --- VUE 3 : DASHBOARD FINAL (3 OPTIONS) ---
  return (
    <div style={styles.container}>
      {/* Header simplifié */}
      <div style={{ width: '100%', maxWidth: '1100px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
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
          J'ai analysé votre profil. Voici les 3 meilleures options pour avancer :
        </p>

        <div style={styles.actionGrid}>
          
          {/* Option A : Chercher un job */}
          <div style={styles.actionCard} className="hover-scale">
            <div style={{ ...styles.cardIcon, background: '#ecfeff', color: '#0a6b79' }}>
              <FiTarget />
            </div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '700', margin: '0 0 8px 0', color: '#1f2937' }}>J'ai vu une offre</h3>
            <p style={{ color: '#6b7280', fontSize: '0.95rem', lineHeight: '1.5', flex: 1 }}>
              Collez une offre d'emploi. Je vais évaluer votre compatibilité et vous aider à adapter votre candidature.
            </p>
            <div style={{ marginTop: '20px', color: '#0a6b79', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '5px' }}>
              Tester la compatibilité <FiArrowRight />
            </div>
          </div>

          {/* Option B : Améliorer le profil */}
          <div style={styles.actionCard} className="hover-scale">
            <div style={{ ...styles.cardIcon, background: '#fdf2f8', color: '#be185d' }}>
              <FiTrendingUp />
            </div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '700', margin: '0 0 8px 0', color: '#1f2937' }}>Améliorer mon CV</h3>
            <p style={{ color: '#6b7280', fontSize: '0.95rem', lineHeight: '1.5', flex: 1 }}>
              Votre CV a un score de 75/100. J'ai détecté 3 points faibles qui pourraient bloquer les recruteurs.
            </p>
            <div style={{ marginTop: '20px', color: '#be185d', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '5px' }}>
              Voir les conseils <FiArrowRight />
            </div>
          </div>

          {/* Option C : Projet Pro (NOUVEAU) */}
          <div style={styles.actionCard} className="hover-scale">
            <div style={{ ...styles.cardIcon, background: '#fffbeb', color: '#b45309' }}>
              <FiCompass />
            </div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '700', margin: '0 0 8px 0', color: '#1f2937' }}>Préparer mon projet</h3>
            <p style={{ color: '#6b7280', fontSize: '0.95rem', lineHeight: '1.5', flex: 1 }}>
              Je ne sais pas encore quel métier viser. Identifions vos compétences transférables et des pistes de reconversion.
            </p>
            <div style={{ marginTop: '20px', color: '#b45309', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '5px' }}>
              Explorer les pistes <FiArrowRight />
            </div>
          </div>

        </div>

        {/* Liens secondaires encore plus discrets */}
        <div style={{ marginTop: '40px', borderTop: '1px solid #f3f4f6', paddingTop: '20px', display: 'flex', gap: '20px', justifyContent: 'center' }}>
          <span style={{ color: '#9ca3af', fontSize: '0.9rem', cursor: 'pointer' }}>Mes documents</span>
          <span style={{ color: '#9ca3af', fontSize: '0.9rem', cursor: 'pointer' }}>Préparer un entretien</span>
        </div>
      </div>
    </div>
  );
};

export default SimplifiedDashboard;
