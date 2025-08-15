// Service Auth API simplifié - Version qui build sans erreur

export const authApi = {
  login: (email, password) => {
    return Promise.resolve({
      data: { 
        success: true, 
        token: 'demo_token', 
        user: { id: '1', email } 
      }
    });
  },

  register: (email, password, confirmPassword) => {
    return Promise.resolve({
      data: { 
        success: true, 
        token: 'demo_token', 
        user: { id: '1', email } 
      }
    });
  },

  logout: () => {
    return Promise.resolve({
      data: { success: true }
    });
  },

  verifyToken: (token) => {
    return Promise.resolve({
      data: { 
        success: !!token, 
        user: token ? { id: '1', email: 'demo@example.com' } : null 
      }
    });
  },

  getCurrentUser: () => {
    return Promise.resolve({
      data: { 
        success: true, 
        user: { id: '1', email: 'demo@example.com' } 
      }
    });
  }
};
