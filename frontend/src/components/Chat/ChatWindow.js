import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { usePersistentData } from '../../hooks/usePersistentData';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import { FiRefreshCw, FiAlertCircle } from 'react-icons/fi';
import './ChatWindow.css';

const ChatWindow = () => {
  const { messages: contextMessages, sendMessage, clearChat, loading } = useApp();
  const { 
    data: persistentMessages, 
    updateData: updatePersistentMessages,
    source: dataSource,
    isLoading: messagesLoading 
  } = usePersistentData('chat_history', []);
  // Utiliser les messages persistants ou contextuels
  const messages = persistentMessages?.length > 0 ? persistentMessages : contextMessages;
  const [inputMessage, setInputMessage] = useState('');
  const messagesEndRef = useRef(null);

  // Scroll automatique vers le bas
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Synchroniser les messages du contexte avec la persistance
    if (contextMessages?.length > 0 && contextMessages !== persistentMessages) {
      updatePersistentMessages(contextMessages);
    }
  }, [contextMessages, persistentMessages, updatePersistentMessages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!inputMessage.trim() || loading) return;
    
    const message = inputMessage;
    setInputMessage(''); // Vider immédiatement
    
    await sendMessage(message);
  };

  const handleClearChat = async () => {
    if (window.confirm('Êtes-vous sûr de vouloir effacer tout l\'historique ?')) {
      await clearChat();
    }
  };

  const hasMessages = messages.length > 0;

  return (
    <div className="chat-window">
      {/* En-tête du chat */}
      <div className="chat-header">
        <div className="chat-header-title">
          <h3>Assistant IA IAMONJOB</h3>
          <span className="chat-status">
            <span className="status-dot"></span>
            En ligne
          </span>
        </div>
        {hasMessages && (
          <button 
            className="chat-clear-button"
            onClick={handleClearChat}
            disabled={loading}
            title="Effacer l'historique"
          >
            <FiRefreshCw />
          </button>
        )}
      </div>

      {/* Corps du chat */}
      <div className="chat-body">
        {hasMessages ? (
          <>
            <MessageList messages={messages} />
            <div ref={messagesEndRef} />
          </>
        ) : (
          <div className="chat-empty">
            <div className="empty-icon">💬</div>
            <h3>Bienvenue dans votre assistant IA !</h3>
            <p>Posez-moi vos questions sur :</p>
            <ul>
              <li>📄 L'analyse et l'optimisation de votre CV</li>
              <li>🎯 L'évaluation d'offres d'emploi</li>
              <li>✉️ La rédaction de lettres de motivation</li>
              <li>🎤 La préparation d'entretiens</li>
              <li>🔄 La reconversion professionnelle</li>
            </ul>
            <p className="empty-tip">
              <FiAlertCircle />
              Astuce : Uploadez d'abord votre CV pour des conseils personnalisés !
            </p>
          </div>
        )}
      </div>

      {/* Zone de saisie */}
      <MessageInput
        value={inputMessage}
        onChange={setInputMessage}
        onSend={handleSendMessage}
        disabled={loading}
      />
    </div>
  );
};

export default ChatWindow;
