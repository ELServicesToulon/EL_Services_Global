import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Send, X, MessageCircle, Sparkles, Mic } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  
  const [messages, setMessages] = useState(() => {
    return [{ 
        id: 'init', 
        sender: 'bot', 
        content: "Bonjour ! Je suis l'Assistant Intelligent MediConvoi. Je peux lancer un audit technique, vérifier l'état du site ou répondre à vos questions. Comment puis-je vous aider ?" 
    }];
  });

  const [sessionId] = useState(() => {
    let sid = localStorage.getItem('chat_session_id');
    if (!sid) {
      sid = crypto.randomUUID();
      localStorage.setItem('chat_session_id', sid);
    }
    return sid;
  });

  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const [isListening, setIsListening] = useState(false);

  useEffect(() => {
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

    const { error } = await supabase.from('chat_messages').insert([{ 
      content: userText, 
      sender: 'user', 
      session_id: sessionId 
    }]);

    if (error) {
      console.error('Error sending message:', error);
      // More user friendly error message
      let errorMsg = "Oups, une erreur de connexion est survenue.";
      if (error.message.includes('relation "public.chat_messages" does not exist')) {
          errorMsg = "Maintenance en cours : Le système de chat est en cours de mise à jour (Table manquante).";
      }
      setMessages(prev => [...prev, { id: 'err', sender: 'bot', content: errorMsg }]);
      setIsTyping(false);
    }
  };

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
    };
    
    recognition.start();
  };

  return (
    <>
      {/* Launcher Button with Pulse Effect */}
      <motion.div className="fixed bottom-6 right-6 z-50">
          <div className="absolute inset-0 bg-indigo-500 rounded-full animate-ping opacity-25"></div>
          <motion.button
            className="relative w-16 h-16 bg-gradient-to-br from-indigo-600 to-violet-700 text-white rounded-full shadow-2xl flex items-center justify-center border border-white/20 hover:shadow-indigo-500/50 transition-all"
            onClick={() => setIsOpen(!isOpen)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {isOpen ? <X size={28} /> : 
                <div className="flex flex-col items-center">
                    <Sparkles size={24} className="animate-pulse" />
                </div>
            }
          </motion.button>
      </motion.div>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9, rotate: 2 }}
            animate={{ opacity: 1, y: 0, scale: 1, rotate: 0 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            transition={{ type: "spring", damping: 25, stiffness: 260 }}
            className="fixed bottom-24 right-4 md:right-6 w-[90vw] md:w-96 h-[550px] bg-white rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden border border-gray-100 font-sans"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 p-5 flex items-center gap-4 relative overflow-hidden">
               {/* Decorative Background Elements */}
               <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-10 blur-xl"></div>
               <div className="absolute bottom-0 left-0 w-24 h-24 bg-black/10 rounded-full translate-y-12 -translate-x-10 blur-lg"></div>

               <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm p-0.5 flex items-center justify-center border border-white/30 shadow-inner">
                   <div className="w-full h-full bg-indigo-100 rounded-full overflow-hidden flex items-center justify-center">
                        <img src="/chatbot_logo.png" className="w-full h-full object-cover" alt="AI" 
                             onError={(e) => { e.target.style.display='none'; e.target.parentNode.innerHTML='🤖'; }} />
                   </div>
               </div>
               <div className="relative z-10">
                   <h3 className="text-white font-bold text-lg tracking-wide">Assistant AI</h3>
                   <div className="flex items-center gap-2">
                       <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]"></span>
                       <span className="text-indigo-100 text-xs font-medium uppercase tracking-wider">En ligne • Gemini Pro</span>
                   </div>
               </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 bg-slate-50 space-y-5 scroll-smooth">
              {messages.map((m, i) => (
                <motion.div 
                    key={m.id || i} 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {m.sender === 'bot' && (
                      <div className="w-8 h-8 rounded-full bg-indigo-100 border border-indigo-200 overflow-hidden mr-3 mt-1 flex-shrink-0 shadow-sm flex items-center justify-center text-xs">
                          AI
                      </div>
                  )}
                  <div className={`max-w-[80%] p-4 rounded-2xl text-[14px] leading-relaxed shadow-sm relative ${
                    m.sender === 'user' 
                      ? 'bg-gradient-to-br from-indigo-600 to-violet-600 text-white rounded-br-none shadow-indigo-200' 
                      : 'bg-white text-slate-700 border border-slate-100 rounded-bl-none shadow-slate-200'
                  }`}>
                    {m.content}
                    {/* Timestamp (Optional) */}
                    <div className={`text-[10px] mt-1 opacity-70 ${m.sender === 'user' ? 'text-indigo-100' : 'text-slate-400'}`}>
                        {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </div>
                  </div>
                </motion.div>
              ))}
              
              {isTyping && (
                <div className="flex justify-start">
                   <div className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-100 mr-3 mt-1 flex items-center justify-center">
                        <Sparkles size={14} className="text-indigo-400 animate-spin-slow" />
                   </div>
                   <div className="bg-white border border-slate-100 p-4 rounded-2xl rounded-bl-none shadow-sm flex items-center gap-1.5 w-16 h-[46px]">
                       <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                       <span className="w-2 h-2 bg-violet-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                       <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"></span>
                   </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white border-t border-slate-100">
                <form onSubmit={sendMessage} className="relative flex items-center gap-2">
                    <button
                        type="button"
                        onClick={startListening}
                        className={`p-3 rounded-xl transition-all duration-300 ${
                            isListening 
                            ? 'bg-rose-50 text-rose-500 shadow-inner' 
                            : 'bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600'
                        }`}
                        title="Dictée vocale"
                    >
                        <Mic size={20} className={isListening ? 'animate-pulse' : ''} />
                    </button>
                    
                    <div className="flex-1 relative">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder={isListening ? "Je vous écoute..." : "Posez votre question..."}
                            className="w-full pl-5 pr-12 py-3 bg-slate-50 border-none rounded-xl text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:bg-white transition-all shadow-inner"
                        />
                        <button 
                            type="submit" 
                            disabled={!input.trim()}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-indigo-600 text-white rounded-lg shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:scale-105 disabled:opacity-50 disabled:scale-100 disabled:shadow-none transition-all duration-200"
                        >
                            <Send size={18} />
                        </button>
                    </div>
                </form>
                <div className="text-center mt-2">
                    <p className="text-[10px] text-slate-300 font-medium">Powered by Gemini & Supabase</p>
                </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
