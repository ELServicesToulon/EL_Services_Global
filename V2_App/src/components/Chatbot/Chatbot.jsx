import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Send, X, MessageCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [sessionId, setSessionId] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    // Session Management
    let sid = localStorage.getItem('chat_session_id');
    if (!sid) {
      sid = crypto.randomUUID();
      localStorage.setItem('chat_session_id', sid);
    }
    setSessionId(sid);

    // Initial Message
    if (messages.length === 0) {
        setMessages([{ 
            id: 'init', 
            sender: 'bot', 
            content: "Bonjour ! Je suis l'IA MediConvoi. Je peux vérifier l'état du site (Ghost Shopper) ou répondre à vos questions. Dites 'audit' pour tester le site." 
        }]);
    }

    // Realtime Subscription
    const channel = supabase
      .channel('chat_app')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `session_id=eq.${sid}` },
        (payload) => {
          const newMsg = payload.new;
          if (newMsg.sender === 'bot') {
            setMessages(prev => {
                // Avoid duplicates if we optimistically updated (though we don't optimistically update bot msgs)
                if (prev.some(m => m.id === newMsg.id)) return prev;
                return [...prev, newMsg];
            });
            setIsTyping(false);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOpen, isTyping]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userText = input.trim();
    const tempId = Date.now();

    // Optimistic UI
    const msg = {
      id: tempId,
      content: userText,
      sender: 'user',
      session_id: sessionId,
      created_at: new Date().toISOString()
    };

    setMessages(prev => [...prev, msg]);
    setInput('');
    setIsTyping(true);

    // Send to Backend (Supabase)
    const { error } = await supabase.from('chat_messages').insert([{ 
      content: userText, 
      sender: 'user', 
      session_id: sessionId 
    }]);

    if (error) {
      console.error('Error sending message:', error);
      setMessages(prev => [...prev, { id: 'err', sender: 'bot', content: "Erreur d'envoi : " + error.message }]);
      setIsTyping(false);
    }
  };

  // --- VOICE RECOGNITION ---
  const [isListening, setIsListening] = useState(false);
  
  const startListening = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert("Votre navigateur ne supporte pas la reconnaissance vocale.");
      return;
    }
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'fr-FR';
    recognition.interimResults = false;
    
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = (e) => {
        console.error("Speech error", e);
        setIsListening(false);
    };
    
    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        // On pourrait auto-submit ici si voulu
    };
    
    recognition.start();
  };

  return (
    <>
      {/* Floating Button */}
      <motion.button
        className="fixed bottom-6 right-6 w-16 h-16 bg-white rounded-full shadow-2xl z-50 flex items-center justify-center border-2 border-blue-600 hover:scale-105 transition-transform overflow-hidden curser-pointer"
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
      >
        {isOpen ? <X className="text-blue-600" /> : (
            <div className="w-full h-full relative">
                 <img 
                    src="/chatbot_logo.png" 
                    alt="Chat" 
                    className="w-full h-full object-cover" 
                    onError={(e) => {
                        e.target.style.display='none'; 
                        e.target.nextSibling.style.display='flex';
                    }} 
                />
                <div className="hidden absolute inset-0 items-center justify-center bg-blue-50">
                    <MessageCircle className="text-blue-600" />
                </div>
            </div>
        )}
      </motion.button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-24 right-6 w-80 md:w-96 h-[500px] bg-white rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden border border-gray-100 font-sans"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-800 p-4 flex items-center gap-3">
               <div className="w-10 h-10 rounded-full bg-white p-0.5 overflow-hidden shadow-sm">
                   <img src="/chatbot_logo.png" className="w-full h-full object-cover" alt="Bot" />
               </div>
               <div>
                   <h3 className="text-white font-bold text-sm">Assistant MediConvoi</h3>
                   <div className="flex items-center gap-1.5">
                       <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                       <span className="text-blue-100 text-xs">En ligne • IA Gemini</span>
                   </div>
               </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 bg-gray-50/50 space-y-4">
              {messages.map((m, i) => (
                <div key={m.id || i} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {m.sender === 'bot' && (
                      <div className="w-6 h-6 rounded-full bg-white border border-gray-200 overflow-hidden mr-2 mt-1 flex-shrink-0">
                          <img src="/chatbot_logo.png" className="w-full h-full object-cover" />
                      </div>
                  )}
                  <div className={`max-w-[75%] p-3 rounded-2xl text-sm shadow-sm ${
                    m.sender === 'user' 
                      ? 'bg-blue-600 text-white rounded-br-none' 
                      : 'bg-white text-gray-800 border border-gray-200 rounded-bl-none'
                  }`}>
                    {m.content}
                  </div>
                </div>
              ))}
              
              {isTyping && (
                <div className="flex justify-start">
                   <div className="w-6 h-6 rounded-full bg-white border border-gray-200 overflow-hidden mr-2 mt-1">
                        <img src="/chatbot_logo.png" className="w-full h-full object-cover" />
                   </div>
                   <div className="bg-white border border-gray-200 p-3 rounded-2xl rounded-bl-none flex items-center gap-1">
                       <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                       <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                       <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></span>
                   </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={sendMessage} className="p-3 bg-white border-t border-gray-100 flex gap-2 items-center">
              <button
                type="button"
                onClick={startListening}
                className={`p-2 rounded-full transition-colors ${
                    isListening ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
                title="Dictée vocale"
              >
                  {/* Mic Icon */}
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>
              </button>
              
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={isListening ? "Je vous écoute..." : "Posez votre question..."}
                className="flex-1 px-4 py-2 bg-gray-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-gray-800"
              />
              <button 
                type="submit" 
                disabled={!input.trim()}
                className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Send size={18} />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
