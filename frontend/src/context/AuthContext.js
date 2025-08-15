import React, { createContext, useState, useContext, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '../services/api';

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(() => {
    try {
      return localStorage.getItem('token');
    } catch {
      return null;
    }
  });

  // Vérifier le token au chargement
  useEffect(() => {
    const verifyAndLoadUser = async () => {
      if (token && token !== 'null' && token !== 'undefined' && token !== 'demo_token') {
        try {
          // Vérifier le token côté serveur
          const response = await api.post('/api/auth/verify-token', { token });

          if (response.data.success && response.data.user) {
            setUser({
              id: response.data.user.id,
              email: response.data.user.email,
              isAdmin: response.data.user.is_admin || false
            });
          } else {
            // Token invalide
            localStorage.removeItem('token');
            localStorage.removeItem('user_email');
            setToken(null);
            setUser(null);
          }
        } catch (error) {
          console.error('Erreur vérification token:', error);
          // En cas d'erreur réseau, garder l'utilisateur avec l'email stocké
          const storedEmail = localStorage.getItem('user_email');
          if (storedEmail && token) {
            setUser({
              id: 'offline',
              email: storedEmail,
              isAdmin: false
            });
          }
        }
      }
      setLoading(false);
    };

    verifyAndLoadUser();
  }, [token]);

  const login = async (email, password) => {
    try {
      setLoading(true);
      
      // Validation basique
      if (!email || !password) {
        throw new Error('Email et mot de passe requis');
      }

      // Appel API de connexion
      const response = await api.post('/api/auth/login', { email, password });

      if (response.data.success) {
        const userToken = response.data.token;
        const userData = {
          id: response.data.user?.id || response.data.user_id || 'new',
          email: email, // Utiliser l'email fourni
          isAdmin: response.data.user?.is_admin || false
        };
        
        // Sauvegarder dans localStorage
        try {
          localStorage.setItem('token', userToken);
          localStorage.setItem('user_email', email);
        } catch (e) {
          console.warn('LocalStorage non disponible');
        }
        
        setToken(userToken);
        setUser(userData);
        
        toast.success('Connexion réussie !');
        return { success: true };
      } else {
        // Erreur de connexion
        const errorMessage = response.data.error || 'Email ou mot de passe incorrect';
        throw new Error(errorMessage);
      }
    } catch (error) {
      const message = error.message || 'Erreur de connexion';
      toast.error(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  };

  const register = async (email, password, confirmPassword) => {
    try {
      setLoading(true);
      
      // Validations
      if (!email || !password || !confirmPassword) {
        throw new Error('Tous les champs sont requis');
      }
      
      if (password !== confirmPassword) {
        throw new Error('Les mots de passe ne correspondent pas');
      }
      
      if (password.length < 6) {
        throw new Error('Le mot de passe doit contenir au moins 6 caractères');
      }
      
      // Appel API d'inscription
      const response = await api.post('/api/auth/register', { 
        email, 
        password, 
        confirm_password: confirmPassword,
        data_consent: true 
      });

      if (response.data.success) {
        const userToken = response.data.token;
        const userData = {
          id: response.data.user?.id || response.data.user_id || 'new',
          email: email,
          isAdmin: false
        };
        
        try {
          localStorage.setItem('token', userToken);
          localStorage.setItem('user_email', email);
        } catch (e) {
          console.warn('LocalStorage non disponible');
        }
        
        setToken(userToken);
        setUser(userData);
        
        toast.success('Inscription réussie !');
        return { success: true };
      } else {
        // Gérer les erreurs spécifiques
        const errorMessage = response.data.error || 'Erreur lors de l\'inscription';
        throw new Error(errorMessage);
      }
    } catch (error) {
      const message = error.message || 'Erreur lors de l\'inscription';
      toast.error(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      // Appel API de déconnexion (optionnel)
      if (token) {
        await api.post('/api/auth/logout', {}).catch(() => {
          // Ignorer les erreurs de déconnexion
        });
      }
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
    }
    
    // Nettoyer le localStorage et l'état
    try {
      localStorage.removeItem('token');
      localStorage.removeItem('user_email');
      localStorage.removeItem('iamonjob_data');
    } catch (e) {
      console.warn('LocalStorage non disponible');
    }
    
    setToken(null);
    setUser(null);
    toast.success('Déconnexion réussie');
  };

  const value = {
    user,
    token,
    loading,
    login,
    register,
    logout,
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
