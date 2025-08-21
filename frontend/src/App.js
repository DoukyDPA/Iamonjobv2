import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

// Contextes
import { AuthProvider } from './context/AuthContext';
import { AppProvider } from './context/AppContext';

// Composant de synchronisation
import DataSync from './components/Common/DataSync';

// Composant d'individualisation des utilisateurs
import UserIndividualization from './components/Common/UserIndividualization';

// Layout et protection
import Layout from './components/Layout/Layout';
import PrivateRoute from './components/Auth/PrivateRoute';
import TestAccessWrapper from './components/TestAccess/TestAccessWrapper';

// Pages publiques
import Home from './pages/Home';
import Features from './pages/Features';
import Login from './pages/Login';
import Register from './pages/Register';

// Pages protégées
import Dashboard from './pages/Dashboard';
import ServicesGrid from './components/Services/ServicesGrid';
import ServiceRouteWrapper from './components/Common/ServiceRouteWrapper';

// Pages d'administration
import AdminServicesPage from './pages/AdminServicesPage';
import AdminPartnersPage from './pages/AdminPartnersPage';
import AdminUsersPage from './pages/AdminUsersPage';

// Pages légales
import LegalNotice from './pages/LegalNotice';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import CookiesPolicy from './pages/CookiesPolicy';
import FAQ from './pages/FAQ';

import './App.css';

function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <Router>
          <UserIndividualization>
            <TestAccessWrapper>
              <DataSync />
              <div className="app">
                <Routes>
                  {/* Routes publiques avec layout */}
                  <Route path="/" element={
                    <Layout>
                      <Home />
                    </Layout>
                  } />
                  
                  <Route path="/features" element={
                    <Layout>
                      <Features />
                    </Layout>
                  } />

                  {/* Routes d'authentification */}
                  <Route path="/login" element={
                    <Layout>
                      <Login />
                    </Layout>
                  } />
                  
                  <Route path="/register" element={
                    <Layout>
                      <Register />
                    </Layout>
                  } />

                  {/* Routes protégées */}
                  <Route path="/dashboard" element={
                    <PrivateRoute>
                      <Layout>
                        <Dashboard />
                      </Layout>
                    </PrivateRoute>
                  } />

                  {/* Routes pour les services génériques */}
                  <Route path="/services" element={
                    <PrivateRoute>
                      <Layout>
                        <ServicesGrid />
                      </Layout>
                    </PrivateRoute>
                  } />
                  
                  {/* Route dynamique pour tous les services IA */}
                  <Route path="/:serviceId" element={
                    <PrivateRoute>
                      <Layout>
                        <ServiceRouteWrapper />
                      </Layout>
                    </PrivateRoute>
                  } />
                
                  {/* Routes d'administration */}
                  <Route path="/admin/services" element={
                    <PrivateRoute>
                      <Layout>
                        <AdminServicesPage />
                      </Layout>
                    </PrivateRoute>
                  } />
                  
                  <Route path="/admin/partners" element={
                    <PrivateRoute>
                      <Layout>
                        <AdminPartnersPage />
                      </Layout>
                    </PrivateRoute>
                  } />
                  
                              <Route path="/admin/users" element={
              <PrivateRoute>
                <Layout>
                  <AdminUsersPage />
                </Layout>
              </PrivateRoute>
            } />
            <Route path="/admin/partners" element={
              <PrivateRoute>
                <Layout>
                  <AdminPartnersPage />
                </Layout>
              </PrivateRoute>
            } />
                  
                  {/* Page de test progression */}
                  <Route path="/test" element={
                    <Layout>
                      <div style={{ padding: '2rem', textAlign: 'center' }}>
                        <h2>🧪 Page de test</h2>
                        <p>✅ Contextes fonctionnels</p>
                        <p>✅ Layout et Header</p>
                        <p>✅ Pages Home et Features</p>
                        <p>✅ Authentification Login/Register</p>
                        <p>✅ Page d'administration des utilisateurs</p>
                        <p>Étape 5/5 terminée</p>
                        
                        <div style={{ marginTop: '2rem' }}>
                          <h3>🎯 Navigation disponible :</h3>
                          <p>
                            <a href="/" style={{ margin: '0 1rem', color: '#0a6b79' }}>🏠 Home</a>
                            <a href="/features" style={{ margin: '0 1rem', color: '#0a6b79' }}>⚡ Features</a>
                            <a href="/login" style={{ margin: '0 1rem', color: '#0a6b79' }}>🔐 Login</a>
                            <a href="/register" style={{ margin: '0 1rem', color: '#0a6b79' }}>📝 Register</a>
                            <a href="/dashboard" style={{ margin: '0 1rem', color: '#0a6b79' }}>🎯 Dashboard</a>
                            <a href="/admin/users" style={{ margin: '0 1rem', color: '#0a6b79' }}>👥 Admin Users</a>
                            <a href="/test" style={{ margin: '0 1rem', color: '#0a6b79' }}>🔧 Test</a>
                          </p>
                        </div>
                      </div>
                    </Layout>
                  } />

                  {/* Routes légales */}
                  <Route path="/mentions-legales" element={
                    <Layout>
                      <LegalNotice />
                    </Layout>
                  } />
                  
                  <Route path="/confidentialite" element={
                    <Layout>
                      <PrivacyPolicy />
                    </Layout>
                  } />
                  
                  <Route path="/conditions" element={
                    <Layout>
                      <TermsOfService />
                    </Layout>
                  } />
                  
                  <Route path="/cookies" element={
                    <Layout>
                      <CookiesPolicy />
                    </Layout>
                  } />
                  
                  <Route path="/faq" element={
                    <Layout>
                      <FAQ />
                    </Layout>
                  } />
                  
                  {/* Routes de construction */}
                  <Route path="*" element={
                    <Layout>
                      <div style={{ padding: '2rem', textAlign: 'center' }}>
                        <h2>🚧 Page en construction</h2>
                        <p>Cette fonctionnalité sera bientôt disponible !</p>
                        <p>
                          <a href="/" style={{ color: '#0a6b79' }}>← Retour à l'accueil</a>
                        </p>
                      </div>
                    </Layout>
                  } />
                </Routes>

                <Toaster 
                  position="top-right"
                  toastOptions={{
                    duration: 4000,
                    style: {
                      background: '#363636',
                      color: '#fff',
                    },
                  }}
                />
              </div>
            </TestAccessWrapper>
          </UserIndividualization>
        </Router>
      </AppProvider>
    </AuthProvider>
  );
}

export default App;
