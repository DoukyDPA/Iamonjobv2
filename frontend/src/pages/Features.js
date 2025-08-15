import React from 'react';
import { Link } from 'react-router-dom';
import { 
  FiFileText, FiTarget, FiMail, FiMic, 
  FiZap, FiTrendingUp, FiShield, FiClock 
} from 'react-icons/fi';
import './Features.css';

const Features = () => {
  const features = [
    {
      icon: <FiFileText />,
      title: "Analyse approfondie de CV",
      description: "Notre IA analyse votre CV en profondeur pour identifier vos points forts et axes d'amélioration",
      details: [
        "Évaluation de la structure et mise en forme",
        "Analyse des mots-clés pertinents",
        "Suggestions de compétences à ajouter",
        "Score global avec recommandations"
      ]
    },
    {
      icon: <FiTarget />,
      title: "Compatibilité CV/Offre",
      description: "Évaluez instantanément votre compatibilité avec n'importe quelle offre d'emploi",
      details: [
        "Score de compatibilité en pourcentage",
        "Analyse des compétences manquantes",
        "Recommandations personnalisées",
        "Mots-clés à intégrer"
      ]
    },
    {
      icon: <FiMail />,
      title: "Lettres de motivation IA",
      description: "Générez des lettres de motivation personnalisées et percutantes",
      details: [
        "Adaptation automatique à l'offre",
        "Structure professionnelle",
        "Ton adapté à l'entreprise",
        "Exemples concrets intégrés"
      ]
    },
    {
      icon: <FiMic />,
      title: "Préparation d'entretiens",
      description: "Préparez-vous aux entretiens avec des simulations et conseils",
      details: [
        "Questions types par secteur",
        "Technique STAR expliquée",
        "Simulation d'entretien",
        "Conseils de présentation"
      ]
    },
    {
      icon: <FiZap />,
      title: "Actions rapides",
      description: "Accédez rapidement aux fonctionnalités clés en un clic",
      details: [
        "Analyse express de CV",
        "Pitch professionnel",
        "Conseils du jour",
        "Suivi de candidatures"
      ]
    },
    {
      icon: <FiTrendingUp />,
      title: "Suivi et progression",
      description: "Suivez votre évolution et mesurez vos progrès",
      details: [
        "Tableau de bord personnalisé",
        "Historique des analyses",
        "Statistiques de progression",
        "Objectifs personnalisés"
      ]
    }
  ];

  const additionalFeatures = [
    {
      icon: <FiShield />,
      title: "Données sécurisées",
      description: "Vos données sont chiffrées et protégées"
    },
    {
      icon: <FiClock />,
      title: "Disponible 24/7",
      description: "L'IA est disponible à tout moment"
    }
  ];

  return (
    <div className="features-page">
      {/* Hero Section */}
      <section className="features-hero">
        <div className="container">
          <h1>Fonctionnalités puissantes pour votre réussite</h1>
          <p>
            Découvrez comment IAMONJOB révolutionne votre recherche d'emploi 
            avec l'intelligence artificielle
          </p>
        </div>
      </section>

      {/* Main Features */}
      <section className="features-main">
        <div className="container">
          <div className="features-grid">
            {features.map((feature, index) => (
              <div key={index} className="feature-detailed">
                <div className="feature-header">
                  <div className="feature-icon-large">
                    {feature.icon}
                  </div>
                  <h3>{feature.title}</h3>
                </div>
                <p className="feature-description">{feature.description}</p>
                <ul className="feature-details">
                  {feature.details.map((detail, idx) => (
                    <li key={idx}>{detail}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Additional Features */}
      <section className="features-additional">
        <div className="container">
          <h2>Et ce n'est pas tout...</h2>
          <div className="additional-grid">
            {additionalFeatures.map((feature, index) => (
              <div key={index} className="additional-feature">
                <div className="additional-icon">{feature.icon}</div>
                <h4>{feature.title}</h4>
                <p>{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="features-cta">
        <div className="container">
          <h2>Prêt à transformer votre recherche d'emploi ?</h2>
          <p>Rejoignez des milliers d'utilisateurs qui ont trouvé leur job idéal</p>
          <div className="cta-buttons">
            <Link to="/register" className="btn btn-primary btn-lg">
              Commencer gratuitement
            </Link>
            <Link to="/pricing" className="btn btn-secondary btn-lg">
              Voir les tarifs
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Features;
