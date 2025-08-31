import React from 'react';
import { FiX, FiLightbulb, FiTrendingUp, FiTarget, FiCheckCircle } from 'react-icons/fi';
import './ProfileAdviceModal.css';

const ProfileAdviceModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const adviceItems = [
    {
      icon: <FiTarget />,
      title: "Définir vos objectifs",
      description: "Clarifiez vos aspirations professionnelles et vos objectifs de carrière à court et long terme."
    },
    {
      icon: <FiTrendingUp />,
      title: "Optimiser votre CV",
      description: "Adaptez votre CV en fonction des postes visés et mettez en avant vos compétences clés."
    },
    {
      icon: <FiCheckCircle />,
      title: "Valider vos compétences",
      description: "Identifiez et développez les compétences recherchées dans votre secteur d'activité."
    },
    {
      icon: <FiLightbulb />,
      title: "Développer votre réseau",
      description: "Construisez et entretenez un réseau professionnel pour accéder à de nouvelles opportunités."
    }
  ];

  return (
    <div className="profile-advice-modal-overlay" onClick={onClose}>
      <div className="profile-advice-modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="profile-advice-modal-header">
          <div className="profile-advice-modal-title">
            <FiLightbulb className="profile-advice-modal-title-icon" />
            <h2>Conseils pour optimiser votre profil</h2>
          </div>
          <button onClick={onClose} className="profile-advice-modal-close">
            <FiX />
          </button>
        </div>

        {/* Contenu */}
        <div className="profile-advice-modal-body">
          <div className="profile-advice-intro">
            <p>
              Découvrez nos recommandations personnalisées pour améliorer votre profil professionnel 
              et maximiser vos chances de succès sur Iamonjob.
            </p>
          </div>

          <div className="profile-advice-grid">
            {adviceItems.map((item, index) => (
              <div key={index} className="profile-advice-item">
                <div className="profile-advice-item-icon">
                  {item.icon}
                </div>
                <div className="profile-advice-item-content">
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="profile-advice-cta">
            <p>
              💡 <strong>Conseil bonus :</strong> Utilisez régulièrement nos outils d'analyse 
              pour suivre l'évolution de votre profil et identifier les axes d'amélioration.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="profile-advice-modal-actions">
          <button onClick={onClose} className="profile-advice-modal-btn">
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfileAdviceModal;
