import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

// Contextes (Le moteur de l'app)
import { AuthProvider } from './context/AuthContext';
import { AppProvider } from './context/AppContext';

// Composants Techniques CRITIQUES (Ceux qui faisaient marcher les documents)
import DataSync from './components/Common/DataSync';
import UserIndividualization from './components/Common/UserIndividualization';
import MobileResponsiveTest from './components/TestAccess/MobileResponsiveTest';
import TestAccessWrapper from './components/TestAccess/TestAccessWrapper';

// Layout et protection
import Layout from './components/Layout/Layout';
import PrivateRoute from './components/Auth/PrivateRoute';

// Pages publiques
import Home from './pages/Home';
import Features from './pages/Features';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';

// --- VOS NOUVELLES PAGES (Intégrées proprement) ---
import Dashboard from './pages/Dashboard'; // Le nouveau dashboard simplifié
import MindMap from './pages/MindMap';     // La nouvelle Mindmap
import CVAnalysisDashboard from './components/Analysis/CVAnalysisDashboard';
import MatchingAnalysis from './components/Analysis/MatchingAnalysis';
import ChatWindow from './components/Chat/ChatWindow';

// Pages existantes (On les garde pour éviter les erreurs 404)
import ServicesGrid from './components/Services/ServicesGrid';
import GenericDocumentProcessor from './components/Common/GenericDocumentProcessor';

// Pages d'administration
import AdminServicesPage from './pages/AdminServicesPage';
import AdminPartnersPage from './pages/AdminPartnersPage';
import AdminUsersPage from './pages/AdminUsersPage';

// Pages Légales / GDPR
import GDPRPage from './pages/GDPRPage';
import LegalNotice from './pages/LegalNotice';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import CookiesPolicy from './pages/CookiesPolicy';
import FAQ from './pages/FAQ';

// STYLES GLOBAUX (Pour ne plus être "affreux")
import './App.css';
import './styles/revolutionary-design.css'; 

function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <Router>
          {/* Ces wrappers sont indispensables pour vos documents et user ID */}
          <UserIndividualization>
            <TestAccessWrapper>
              <DataSync /> 
              
              <div className="app">
                <Routes>
                  {/* === ROUTES PUBLIQUES === */}
                  <Route path="/" element={<Layout><Home /></Layout>} />
                  <Route path="/features" element={<Layout><Features /></Layout>} />
                  <Route path="/login" element={<Layout><Login /></Layout>} />
                  <Route path="/register" element={<Layout><Register /></Layout>} />
                  <Route path="/forgot-password" element={<Layout><ForgotPassword /></Layout>} />

                  {/* === DASHBOARD & NOUVELLE NAVIGATION === */}
                  <Route path="/dashboard" element={
                    <PrivateRoute>
                      <Layout>
                        <Dashboard />
                      </Layout>
                    </PrivateRoute>
                  } />

                  <Route path="/mindmap" element={
                    <PrivateRoute>
                      <Layout>
                        <MindMap />
                      </Layout>
                    </PrivateRoute>
                  } />

                  {/* === NOS OUTILS EXPERTS (Restaurés) === */}
                  <Route path="/cv-analysis" element={
                    <PrivateRoute>
                      <Layout>
                        <CVAnalysisDashboard />
                      </Layout>
                    </PrivateRoute>
                  } />

                  <Route path="/matching" element={
                    <PrivateRoute>
                      <Layout>
                        <MatchingAnalysis />
                      </Layout>
                    </PrivateRoute>
                  } />

                  <Route path="/chat" element={
                    <PrivateRoute>
                      <Layout>
                        <ChatWindow />
                      </Layout>
                    </PrivateRoute>
                  } />

                  {/* === ROUTES HISTORIQUES (Pour compatibilité) === */}
                  <Route path="/services" element={
                    <PrivateRoute>
                      <Layout><ServicesGrid /></Layout>
                    </PrivateRoute>
                  } />
                  
                  {/* Route générique pour les anciens services si besoin */}
                  <Route path="/service/:serviceId" element={
                    <PrivateRoute>
                      <Layout><GenericDocumentProcessor /></Layout>
                    </PrivateRoute>
                  } />

                  {/* === ADMINISTRATION === */}
                  <Route path="/admin/services" element={<PrivateRoute><Layout><AdminServicesPage /></Layout></PrivateRoute>} />
                  <Route path="/admin/partners" element={<PrivateRoute><Layout><AdminPartnersPage /></Layout></PrivateRoute>} />
                  <Route path="/admin/users" element={<PrivateRoute><Layout><AdminUsersPage /></Layout></PrivateRoute>} />
                  
                  {/* === PAGES LÉGALES === */}
                  <Route path="/gdpr" element={<PrivateRoute><Layout><GDPRPage /></Layout></PrivateRoute>} />
                  <Route path="/mentions-legales" element={<Layout><LegalNotice /></Layout>} />
                  <Route path="/confidentialite" element={<Layout><PrivacyPolicy /></Layout>} />
                  <Route path="/conditions" element={<Layout><TermsOfService /></Layout>} />
                  <Route path="/cookies" element={<Layout><CookiesPolicy /></Layout>} />
                  <Route path="/faq" element={<Layout><FAQ /></Layout>} />
                  
                  {/* === PAGES DE TEST === */}
                  <Route path="/test-responsive" element={<Layout><MobileResponsiveTest /></Layout>} />

                  {/* === 404 / FALLBACK === */}
                  <Route path="*" element={
                    <Layout>
                      <div style={{ padding: '4rem', textAlign: 'center' }}>
                        <h2>Page non trouvée</h2>
                        <a href="/dashboard" className="btn-primary">Retour au Dashboard</a>
                      </div>
                    </Layout>
                  } />
                </Routes>

                <Toaster 
                  position="top-right"
                  toastOptions={{
                    duration: 4000,
                    style: { background: '#363636', color: '#fff' },
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
