import React from 'react';
import { useNavigate } from 'react-router-dom';

const ActionTile = ({ title, description, icon, color = '#0a6b79', route }) => {
  const navigate = useNavigate();
  const handleClick = () => {
    if (route) {
      navigate(route);
    }
  };

  return (
    <div
      className="document-tile"
      style={{ '--tile-color': color, cursor: 'pointer' }}
      onClick={handleClick}
    >
      <div className="revolutionary-service-icon" style={{ background: color }}>
        {icon}
      </div>
      <div className="revolutionary-service-content">
        <h4 className="revolutionary-service-title">{title}</h4>
        <p className="revolutionary-service-description">{description}</p>
      </div>
    </div>
  );
};

export default ActionTile;
