import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  FiFileText, FiTarget, FiMail, FiMic, 
  FiZap, FiTrendingUp, FiUsers, FiAward 
} from 'react-icons/fi';
import './Home.css';

const Home = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const features = [
    {
      icon: <FiFileText />,
      title: "Analyse de CV",
      description: "Obtenez une analyse détaillée de votre CV avec des recommandations personnalisées pour l'améliorer."
    },
    {
      icon: <FiTarget />,
      title: "Compatibilité offres",
      description: "Évaluez votre compatibilité avec les offres d'emploi et identifiez les points à améliorer."
    },
    {
      icon: <FiMail />,
      title: "Lettres de motivation",
      description: "Rédigez des lettres de motivation percutantes adaptées à chaque poste."
    },
    {
      icon: <FiMic />,
      title: "Préparation entretiens",
      description: "Préparez-vous aux entretiens avec des questions types et des conseils personnalisés."
    },
    {
      icon: <FiZap />,
      title: "Actions rapides",
      description: "Accédez rapidement aux fonctionnalités principales avec des raccourcis intelligents."
    },
    {
      icon: <FiTrendingUp />,
      title: "Suivi de progression",
      description: "Suivez votre évolution et mesurez l'impact de vos améliorations."
    }
  ];

  const stats = [
    { value: "30 ans", label: "d'expérience de l'accompagnement vers l'emploi" },
    { value: "400", label: "personnes formées à l'utilisation de l'IA pour l'emploi" },
    { value: "12", label: "fonctions IA pour vous aider dans votre recherche" },
    { value: "24/7", label: "Un coach, toujours disponible pour vous conseiller" },
  ];

  return (
    <div className="home">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="container">
          <div className="hero-content">
            <h1 className="hero-title">
              Trouvez votre futur job avec notre coach emploi boosté à l'IA
            </h1>
            <p className="hero-subtitle">
              IAMONJOB utilise l'intelligence artificielle pour optimiser votre recherche d'emploi. 
              Analysez votre CV, évaluez les offres, préparez vos entretiens... et décrochez le poste idéal.
            </p>
            <div className="hero-actions">
              {isAuthenticated ? (
                <Link to="/dashboard" className="btn btn-primary btn-lg">
                  Accéder au tableau de bord
                </Link>
              ) : (
                <>
                  <Link to="/register" className="btn btn-primary btn-lg">
                    Commencer gratuitement
                  </Link>
                  <Link to="/login" className="btn btn-secondary btn-lg">
                    Se connecter
                  </Link>
                </>
              )}
            </div>
          </div>
          <div className="hero-image">
            <div className="hero-illustration">
              <div className="floating-card card-1">
                <FiFileText />
                <span>CV optimisé</span>
              </div>
              <div className="floating-card card-2">
                <FiTarget />
                <span>Compatibilité avec les offres</span>
              </div>
              <div className="floating-card card-3">
                <FiAward />
                <span>Prêt pour l'entretien</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="stats-section">
        <div className="container">
          <div className="stats-grid">
            {stats.map((stat, index) => (
              <div key={index} className="stat-item">
                <h3>{stat.value}</h3>
                <p>{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="how-section">
        <div className="container">
          <div className="section-header">
            <h2>Comment ça marche ?</h2>
            <p>3 étapes simples pour booster votre recherche d'emploi</p>
          </div>
          <div className="steps-grid">
            <div className="step-item">
              <div className="step-number">1</div>
              <h3>Téléchargez votre CV</h3>
              <p>Importez votre CV actuel pour obtenir une analyse détaillée et des recommandations personnalisées.</p>
            </div>
            <div className="step-item">
              <div className="step-number">2</div>
              <h3>Analysez et optimisez</h3>
              <p>IAMONJOB analyse votre profil et vous guide pour améliorer votre CV et vos candidatures.</p>
            </div>
            <div className="step-item">
              <div className="step-number">3</div>
              <h3>Décrochez le job</h3>
              <p>Préparez vos entretiens et postulez avec confiance grâce à nos conseils personnalisés.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="container">
          <div className="cta-content">
            <h2>Prêt à transformer votre recherche d'emploi ?</h2>
            <p>Trouver votre futur job avec IAMONJOB</p>
            {!isAuthenticated && (
              <Link to="/register" className="btn btn-primary btn-lg">
                Créer mon compte gratuit
              </Link>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
