// Service Chat API simplifié - Version qui build sans erreur

export const chatApi = {
  getMessages: () => {
    return Promise.resolve({
      data: { 
        success: true, 
        messages: [] 
      }
    });
  },

  sendMessage: (message) => {
    return Promise.resolve({
      data: { 
        success: true,
        user_message: {
          role: 'user',
          content: message,
          timestamp: new Date().toISOString()
        },
        ai_response: {
          role: 'assistant',
          content: 'Réponse de l\'IA (version démo)',
          timestamp: new Date().toISOString()
        }
      }
    });
  },

  quickAction: (actionType) => {
    return Promise.resolve({
      data: { 
        success: true,
        action: actionType,
        response: 'Action simulée'
      }
    });
  },

  clearChat: () => {
    return Promise.resolve({
      data: { success: true }
    });
  }
};
