// frontend/src/pages/MindMap.js
import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiTarget, FiFileText, FiMessageSquare, FiCpu, FiSmile } from 'react-icons/fi';
import './MindMap.css';

const MindMap = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  // On récupère le mode depuis la navigation (par défaut 'offer')
  const mode = location.state?.mode || 'offer';

  // Configuration des Arbres de décision
  const mapConfig = {
    offer: {
      title: "Stratégie : Répondre à une offre",
      centerIcon: <FiTarget />,
      color: "#4f46e5",
      branches: [
        {
          id: 'analyze',
          label: "1. Analyser",
          nodes: [
            { label: "Matching CV/Offre", icon: <FiCpu />, action: () => navigate('/matching') },
            { label: "Analyse du CV", icon: <FiFileText />, action: () => navigate('/cv-analysis') }
          ]
        },
        {
          id: 'apply',
          label: "2. Postuler",
          nodes: [
            { label: "Lettre de Motivation", icon: <FiFileText />, action: () => alert("Générateur de lettre bientôt disponible") },
            { label: "Mail de contact", icon: <FiMessageSquare />, action: () => alert("Générateur de mail bientôt disponible") }
          ]
        },
        {
          id: 'prepare',
          label: "3. Réussir",
          nodes: [
            { label: "Coach d'entretien", icon: <FiSmile />, action: () => navigate('/chat') }
          ]
        }
      ]
    },
    career: {
      title: "Stratégie : Trouver ma voie",
      centerIcon: <FiSmile />,
      color: "#d97706",
      branches: [
        {
          id: 'explore',
          label: "Exploration",
          nodes: [
            { label: "Bilan de compétences IA", icon: <FiCpu />, action: () => navigate('/cv-analysis') },
            { label: "Discussion Coach", icon: <FiMessageSquare />, action: () => navigate('/chat') }
          ]
        },
        {
          id: 'market',
          label: "Marché",
          nodes: [
            { label: "Tendances Jobs", icon: <FiTarget />, action: () => alert("Analyse marché bientôt disponible") }
          ]
        }
      ]
    }
  };

  const currentMap = mapConfig[mode];

  return (
    <div className="mindmap-container">
      <button className="back-btn" onClick={() => navigate('/dashboard')}>
        <FiArrowLeft /> Retour au Dashboard
      </button>

      <div className="mindmap-header">
        <h1 style={{ color: currentMap.color }}>{currentMap.title}</h1>
        <p>Sélectionnez une étape pour activer les outils correspondants.</p>
      </div>

      <div className="mindmap-canvas">
        {/* Nœud Central */}
        <div className="central-node" style={{ backgroundColor: currentMap.color }}>
          {currentMap.centerIcon}
        </div>

        {/* Branches */}
        <div className="branches-container">
          {currentMap.branches.map((branch, index) => (
            <div key={branch.id} className="branch-column">
              <div className="branch-connector"></div>
              <div className="branch-title" style={{ color: currentMap.color }}>
                {branch.label}
              </div>
              
              <div className="nodes-list">
                {branch.nodes.map((node, i) => (
                  <div key={i} className="node-card" onClick={node.action}>
                    <div className="node-icon" style={{ color: currentMap.color }}>
                      {node.icon}
                    </div>
                    <span>{node.label}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MindMap;
