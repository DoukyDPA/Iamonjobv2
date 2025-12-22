import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { usePersistentData } from '../../hooks/usePersistentData';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import ReactMarkdown from 'react-markdown'; // Assurez-vous d'avoir installé react-markdown
import { FiRefreshCw, FiAlertCircle, FiCpu } from 'react-icons/fi';
import './ChatWindow.css';

const ChatWindow = () => {
  const { messages: contextMessages, clearChat, loading: appLoading, setMessages: setContextMessages } = useApp();
  
  // Gestion de la persistance
  const { 
    data: persistentMessages, 
    updateData: updatePersistentMessages,
  } = usePersistentData('chat_history', []);

  // On utilise les messages persistants s'ils existent
  const activeMessages = persistentMessages?.length > 0 ? persistentMessages : contextMessages;
  
  // États locaux
  const [inputMessage, setInputMessage] = useState('');
  const [streamingContent, setStreamingContent] = useState(''); // Pour le message en cours de génération
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef(null);

  // Scroll automatique
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [activeMessages, streamingContent]);

  // Synchronisation context <-> persistance
  useEffect(() => {
    if (contextMessages?.length > 0 && JSON.stringify(contextMessages) !== JSON.stringify(persistentMessages)) {
      updatePersistentMessages(contextMessages);
    }
  }, [contextMessages, persistentMessages, updatePersistentMessages]);

  // ============================================================
  // LOGIQUE DE STREAMING (Le cœur de la fonctionnalité)
  // ============================================================
  const handleSendMessage = async (text) => { // Accepte le texte directement ou l'événement
    const messageText = typeof text === 'string' ? text : inputMessage;
    
    if (!messageText.trim() || isStreaming) return;
    
    // 1. Ajouter immédiatement le message utilisateur
    const userMsg = { role: 'user', content: messageText, timestamp: new Date().toISOString() };
    const newMessages = [...activeMessages, userMsg];
    
    // Mise à jour optimiste (local + contexte)
    setContextMessages(newMessages);
    updatePersistentMessages(newMessages);
    setInputMessage('');
    setIsStreaming(true);
    setStreamingContent(''); // Reset buffer

    try {
      // 2. Appel à l'API de streaming
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // 'Authorization': `Bearer ${token}` // Si auth nécessaire
        },
        body: JSON.stringify({ message: messageText })
      });

      if (!response.ok) throw new Error("Erreur réseau");

      // 3. Lecture du flux (Reader)
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullAiResponse = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        fullAiResponse += chunk;
        setStreamingContent(prev => prev + chunk); // Mise à jour temps réel
      }

      // 4. Finalisation : on ajoute le message complet à l'historique
      const aiMsg = { role: 'assistant', content: fullAiResponse, timestamp: new Date().toISOString() };
      const finalMessages = [...newMessages, aiMsg];
      
      setContextMessages(finalMessages);
      updatePersistentMessages(finalMessages);
      setStreamingContent(''); // Nettoyage
      
    } catch (error) {
      console.error("Erreur chat:", error);
      const errorMsg = { role: 'system', content: "Désolé, une erreur de connexion est survenue." };
      setContextMessages([...newMessages, errorMsg]);
    } finally {
      setIsStreaming(false);
    }
  };

  // Wrapper pour l'input
  const onInputSend = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    handleSendMessage(inputMessage);
  };

  const handleClearChat = async () => {
    if (window.confirm('Êtes-vous sûr de vouloir effacer tout l\'historique ?')) {
      await clearChat();
      updatePersistentMessages([]);
    }
  };

  const hasMessages = activeMessages.length > 0;

  return (
    <div className="chat-window">
      {/* En-tête */}
      <div className="chat-header">
        <div className="chat-header-title">
          <h3>Assistant IA IAMONJOB</h3>
          <span className={`chat-status ${isStreaming ? 'streaming' : ''}`}>
            <span className="status-dot"></span>
            {isStreaming ? 'En train d\'écrire...' : 'En ligne'}
          </span>
        </div>
        {hasMessages && (
          <button className="chat-clear-button" onClick={handleClearChat} disabled={isStreaming} title="Effacer">
            <FiRefreshCw />
          </button>
        )}
      </div>

      {/* Corps */}
      <div className="chat-body">
        {hasMessages ? (
          <>
            <MessageList messages={activeMessages} />
            
            {/* ZONE DE STREAMING : Affiche le message en cours de construction */}
            {isStreaming && streamingContent && (
              <div className="message assistant streaming-message">
                <div className="message-avatar">
                  <FiCpu />
                </div>
                <div className="message-content">
                  <ReactMarkdown>{streamingContent}</ReactMarkdown>
                  <span className="cursor-blink">▋</span>
                </div>
              </div>
            )}
            
            {/* Indicateur de chargement (avant le premier octet) */}
            {isStreaming && !streamingContent && (
              <div className="loading-indicator">
                <div className="typing-dots"><span>.</span><span>.</span><span>.</span></div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </>
        ) : (
          <div className="chat-empty">
            <div className="empty-icon">🤖</div>
            <h3>Bonjour ! Je suis votre coach IA.</h3>
            <p>Je peux vous aider à :</p>
            <ul>
              <li>📄 Analyser votre CV</li>
              <li>✉️ Rédiger une lettre de motivation</li>
              <li>🎤 Préparer un entretien</li>
            </ul>
            <p className="empty-tip">
              <FiAlertCircle />
              Astuce : Uploadez votre CV pour commencer !
            </p>
          </div>
        )}
      </div>

      {/* Input */}
      <MessageInput
        value={inputMessage}
        onChange={setInputMessage}
        onSend={onInputSend}
        disabled={isStreaming}
        placeholder={isStreaming ? "L'IA est en train de répondre..." : "Posez votre question ici..."}
      />
    </div>
  );
};

export default ChatWindow;
