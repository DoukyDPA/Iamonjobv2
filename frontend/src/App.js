import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Contextes
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppProvider } from './context/AppContext';

// Layout & Pages Communes
import Layout from './components/Layout/Layout';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import NotFound from './pages/NotFound';
import MindMap from './pages/MindMap'; // Import de la nouvelle page MindMap

// Pages Services (Les outils)
import CVAnalysisDashboard from './components/Analysis/CVAnalysisDashboard';
import MatchingAnalysis from './components/Analysis/MatchingAnalysis';
import ChatWindow from './components/Chat/ChatWindow';

// Pages Admin & Autres
import AdminServicesPage from './pages/AdminServicesPage';
import PrivateRoute from './components/Auth/PrivateRoute';

const AppRoutes = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div className="loading-screen">Chargement de l'application...</div>;
  }

  return (
    <Routes>
      {/* 1. ROUTE PUBLIQUE (Landing Page) */}
      <Route 
        path="/" 
        element={!isAuthenticated ? <Home /> : <Navigate to="/dashboard" />} 
      />
      
      {/* 2. AUTHENTIFICATION */}
      <Route 
        path="/login" 
        element={!isAuthenticated ? <Login /> : <Navigate to="/dashboard" />} 
      />
      <Route 
        path="/register" 
        element={!isAuthenticated ? <Register /> : <Navigate to="/dashboard" />} 
      />

      {/* 3. ESPACE CONNECTÉ (Layout avec Header/Sidebar) */}
      <Route element={<Layout />}>
        
        {/* Dashboard Principal */}
        <Route 
          path="/dashboard" 
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          } 
        />

        {/* Mind Map (L'arbre de décision) */}
        <Route 
          path="/mindmap" 
          element={
            <PrivateRoute>
              <MindMap />
            </PrivateRoute>
          } 
        />
        
        {/* Outil 1 : Analyse CV */}
        <Route 
          path="/cv-analysis" 
          element={
            <PrivateRoute>
              <CVAnalysisDashboard />
            </PrivateRoute>
          } 
        />

        {/* Outil 2 : Matching Offre */}
        <Route 
          path="/matching" 
          element={
            <PrivateRoute>
              <MatchingAnalysis />
            </PrivateRoute>
          } 
        />

        {/* Outil 3 : Chat / Coach */}
        <Route 
          path="/chat" 
          element={
            <PrivateRoute>
              <ChatWindow />
            </PrivateRoute>
          } 
        />

        {/* Administration */}
        <Route 
          path="/admin/services" 
          element={
            <PrivateRoute adminOnly={true}>
              <AdminServicesPage />
            </PrivateRoute>
          } 
        />

      </Route>

      {/* 4. ROUTE 404 (Pour toute URL inconnue) */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => {
  return (
    <Router>
      <AuthProvider>
        <AppProvider>
          <AppRoutes />
        </AppProvider>
      </AuthProvider>
    </Router>
  );
};

export default App;
