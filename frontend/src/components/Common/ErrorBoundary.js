import React from 'react';
import { Link } from 'react-router-dom';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    this.setState({ error });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <div className="container">
            <div className="error-content">
              <h1>😕 Oups, quelque chose s'est mal passé</h1>
              <p>
                Nous rencontrons un problème technique. 
                Nos équipes ont été notifiées et travaillent à résoudre le problème.
              </p>
              
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="error-details">
                  <summary>Détails de l'erreur (dev only)</summary>
                  <pre>{this.state.error.toString()}</pre>
                </details>
              )}
              
              <div className="error-actions">
                <button onClick={this.handleReset} className="btn btn-primary">
                  Réessayer
                </button>
                <Link to="/" className="btn btn-secondary">
                  Retour à l'accueil
                </Link>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;