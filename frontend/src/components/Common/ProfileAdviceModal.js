import React from 'react';
import { FiX, FiHelpCircle, FiTrendingUp, FiTarget, FiCheckCircle } from 'react-icons/fi';
import './ProfileAdviceModal.css';

const ProfileAdviceModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const adviceItems = [
    {
      icon: <FiTarget />,
      title: "Définissez vos objectifs",
      description: "Clarifiez vos aspirations professionnelles et vos objectifs de carrière à court et long terme."
    },
    {
      icon: <FiTrendingUp />,
      title: "Optimisez votre CV",
      description: "Adaptez votre CV en fonction des postes visés et mettez en avant vos compétences clés. Aujourd'hui on ne peut plus se contenter d'un seul CV. Il faut à minima un CV par type de poste visé."
    },
    {
      icon: <FiCheckCircle />,
      title: "Anonymisez votre CV pour l'IA",
      description: "Les données sont traitées par une intelligence artificielle (en l'occurence Mistral) qui va les traiter sur ses serveurs. Pour garantir la confidentialités de vos informations, pensez à retirer vos coordonnées du CV que vous allez utiliser pour l'analyse"
    },
    {
      icon: <FiHelpCircle />,
      title: "Développez votre réseau",
      description: "L'IA c'est bien, mais c'est le réseau humain qui fait souvent la différenceonstruisez et entretenez un réseau professionnel pour accéder à de nouvelles opportunités."
    }
  ];

  return (
    <div className="profile-advice-modal-overlay" onClick={onClose}>
      <div className="profile-advice-modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="profile-advice-modal-header">
          <div className="profile-advice-modal-title">
            <FiHelpCircle className="profile-advice-modal-title-icon" />
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
