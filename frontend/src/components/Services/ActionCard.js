// frontend/src/components/Services/ActionCard.js
import React from 'react';
import { FiArrowRight } from 'react-icons/fi';
import '../../styles/actions.css'; // On créera ce CSS après

const ActionCard = ({ title, subtitle, icon, color, onClick, badge }) => {
  return (
    <div 
      className="action-card" 
      onClick={onClick}
      style={{ '--card-color': color }}
    >
      <div className="action-icon-wrapper">
        {icon}
      </div>
      <div className="action-content">
        <h3>{title}</h3>
        <p>{subtitle}</p>
      </div>
      <div className="action-arrow">
        <FiArrowRight />
      </div>
      {badge && <span className="action-badge">{badge}</span>}
    </div>
  );
};

export default ActionCard;
