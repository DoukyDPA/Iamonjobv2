import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { FiMenu, FiX, FiUser, FiLogOut, FiSettings } from 'react-icons/fi';

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/');
    setMobileMenuOpen(false);
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <header className="header">
      <div className="container">
        <div className="header-content">
          {/* Logo seul - remplace le titre */}
          <Link to="/" className="logo" onClick={closeMobileMenu}>
            <img 
              src={`${process.env.PUBLIC_URL}/logo_iamonjob.png`}
              alt="IAMONJOB" 
              className="logo-image"
              onError={(e) => {
                console.error('Erreur chargement logo:', e);
                e.target.style.display = 'none';
              }}
            />
          </Link>

          {/* Navigation Desktop */}
          <nav className="nav-desktop">
            {isAuthenticated ? (
              <>
                <Link 
                  to="/dashboard" 
                  className={`nav-link ${isActive('/dashboard') ? 'active' : ''}`}
                >
                  Tableau de bord
                </Link>
                
                <div className="nav-user">
                  <button className="nav-user-button">
                    <FiUser />
                    <span>{user?.email?.split('@')[0] || 'Utilisateur'}</span>
                  </button>
                  
                  <div className="nav-dropdown">
                    <button onClick={handleLogout} className="dropdown-item">
                      <FiLogOut />
                      Déconnexion
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <Link 
                  to="/" 
                  className={`nav-link ${isActive('/') ? 'active' : ''}`}
                >
                  Accueil
                </Link>
                <Link 
                  to="/login" 
                  className={`nav-link ${isActive('/login') ? 'active' : ''}`}
                >
                  Connexion
                </Link>
                <Link to="/register" className="btn btn-primary btn-sm">
                  S'inscrire
                </Link>
              </>
            )}
          </nav>

          {/* Bouton menu mobile */}
          <button className="mobile-menu-button" onClick={toggleMobileMenu}>
            {mobileMenuOpen ? <FiX /> : <FiMenu />}
          </button>
        </div>

        {/* Navigation Mobile */}
        {mobileMenuOpen && (
          <nav className="nav-mobile">
            {isAuthenticated ? (
              <>
                <Link
                  to="/dashboard"
                  className={`mobile-nav-link ${isActive('/dashboard') ? 'active' : ''}`}
                  onClick={closeMobileMenu}
                >
                  Tableau de bord
                </Link>
                
                <button onClick={handleLogout} className="mobile-nav-link logout">
                  <FiLogOut />
                  Déconnexion
                </button>
              </>
            ) : (
              <>
                <Link 
                  to="/"
                  className={`mobile-nav-link ${isActive('/') ? 'active' : ''}`}
                  onClick={closeMobileMenu}
                >
                  Accueil
                </Link>
                <Link 
                  to="/login"
                  className={`mobile-nav-link ${isActive('/login') ? 'active' : ''}`}
                  onClick={closeMobileMenu}
                >
                  Connexion
                </Link>
                <Link 
                  to="/register" 
                  className="mobile-nav-link register"
                  onClick={closeMobileMenu}
                >
                  S'inscrire
                </Link>
              </>
            )}
          </nav>
        )}
      </div>
    </header>
  );
};

export default Header;
