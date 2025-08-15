import React from 'react';
import { Link } from 'react-router-dom';
import { FiHome, FiArrowLeft } from 'react-icons/fi';
import './NotFound.css';

const NotFound = () => {
  return (
    <div className="not-found-page">
      <div className="container">
        <div className="not-found-content">
          <div className="not-found-icon">404</div>
          <h1>Page introuvable</h1>
          <p>
            Désolé, la page que vous recherchez n'existe pas ou a été déplacée.
          </p>
          
          <div className="not-found-actions">
            <Link to="/" className="btn btn-primary">
              <FiHome />
              Retour à l'accueil
            </Link>
            <button 
              onClick={() => window.history.back()} 
              className="btn btn-secondary"
            >
              <FiArrowLeft />
              Page précédente
            </button>
          </div>
          
          <div className="not-found-suggestions">
            <h3>Pages populaires :</h3>
            <ul>
              <li><Link to="/dashboard">Tableau de bord</Link></li>
              <li><Link to="/features">Fonctionnalités</Link></li>
              <li><Link to="/login">Connexion</Link></li>
              <li><Link to="/register">Inscription</Link></li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
