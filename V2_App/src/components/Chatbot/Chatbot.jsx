import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Send, X, MessageCircle, Sparkles, Mic, Cpu, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  
  const [messages, setMessages] = useState(() => {
    return [{ 
        id: 'init', 
        sender: 'bot', 
        content: "System initialized. I am your Holographic Assistant. How can I facilitate your operations today?" 
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
    if (!sessionId) return;

    // Realtime Subscription
    const channel = supabase
      .channel('chat_app')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `session_id=eq.${sessionId}` },
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
  }, [sessionId]);

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
      let errorMsg = "Connection Error. Neural link unstable.";
      if (error.message.includes('relation "public.chat_messages" does not exist')) {
          errorMsg = "Maintenance Mode: Database upgrade in progress.";
      }
      setMessages(prev => [...prev, { id: 'err', sender: 'bot', content: errorMsg }]);
      setIsTyping(false);
    }
  };

  const startListening = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert("Voice module not detected.");
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
      {/* Launcher Button with Neon Pulse Effect */}
      <motion.div className="fixed bottom-6 right-6 z-50">
          <div className="absolute inset-0 bg-brand-neon-blue rounded-full animate-ping opacity-25"></div>
          <motion.button
            className="relative w-16 h-16 bg-black/80 backdrop-blur-xl border border-brand-neon-blue text-brand-neon-blue rounded-full shadow-[0_0_20px_rgba(0,243,255,0.4)] flex items-center justify-center hover:bg-brand-neon-blue hover:text-black transition-all group"
            onClick={() => setIsOpen(!isOpen)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {isOpen ? <X size={28} /> : 
                <div className="flex flex-col items-center">
                    <Cpu size={24} className="group-hover:animate-spin" />
                </div>
            }
          </motion.button>
      </motion.div>

      {/* Chat Window - Holographic Interface */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9, rotate: 2 }}
            animate={{ opacity: 1, y: 0, scale: 1, rotate: 0 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            transition={{ type: "spring", damping: 25, stiffness: 260 }}
            className="fixed bottom-24 right-4 md:right-6 w-[90vw] md:w-96 h-[550px] bg-black/90 backdrop-blur-xl border border-brand-neon-blue/50 rounded-lg shadow-[0_0_30px_rgba(0,243,255,0.15)] z-50 flex flex-col overflow-hidden font-mono clip-path-polygon-[0_0,100%_0,100%_95%,95%_100%,0_100%]"
          >
            {/* Header */}
            <div className="bg-brand-neon-blue/10 p-4 flex items-center gap-4 relative overflow-hidden border-b border-brand-neon-blue/30">
               {/* Decorative Lines */}
               <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-brand-neon-blue to-transparent"></div>
               
               <div className="w-10 h-10 rounded-sm border border-brand-neon-blue/50 flex items-center justify-center bg-black/50 overflow-hidden">
                    <img src="/chatbot_logo.png" className="w-full h-full object-cover opacity-80" alt="AI" 
                         onError={(e) => { e.target.style.display='none'; e.target.parentNode.innerHTML='<Cpu size=20 color=#00f3ff />'; }} />
               </div>
               
               <div className="relative z-10 flex-1">
                   <h3 className="text-brand-neon-blue font-bold text-sm tracking-widest uppercase">AI_ADVISOR v3.2</h3>
                   <div className="flex items-center gap-2">
                       <span className="w-1.5 h-1.5 bg-brand-neon-green rounded-full animate-pulse shadow-[0_0_8px_#0aff0a]"></span>
                       <span className="text-brand-neon-blue/60 text-[10px] font-medium uppercase tracking-wider">Neural Link Active</span>
                   </div>
               </div>
               
               <Zap size={16} className="text-brand-neon-purple animate-pulse" />
            </div>

            {/* Messages Area - Grid Background */}
            <div className="flex-1 overflow-y-auto p-4 bg-black/50 space-y-5 scroll-smooth relative">
               <div className="absolute inset-0 bg-[linear-gradient(rgba(0,243,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,243,255,0.03)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none"></div>

              {messages.map((m, i) => (
                <motion.div 
                    key={m.id || i} 
                    initial={{ opacity: 0, x: m.sender === 'user' ? 20 : -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'} relative z-10`}
                >
                  {m.sender === 'bot' && (
                      <div className="w-6 h-6 rounded-sm border border-brand-neon-blue/30 bg-brand-neon-blue/10 mr-2 mt-1 flex-shrink-0 flex items-center justify-center text-[10px] text-brand-neon-blue">
                          AI
                      </div>
                  )}
                  <div className={`max-w-[85%] p-3 text-xs leading-relaxed shadow-sm relative border ${
                    m.sender === 'user' 
                      ? 'bg-brand-neon-blue/10 border-brand-neon-blue text-brand-neon-blue rounded-tl-lg rounded-bl-lg rounded-br-sm' 
                      : 'bg-white/5 border-white/10 text-slate-300 rounded-tr-lg rounded-br-lg rounded-bl-sm'
                  }`}>
                    {m.content}
                    {/* Timestamp */}
                    <div className={`text-[9px] mt-1 opacity-50 font-mono text-right ${m.sender === 'user' ? 'text-brand-neon-blue' : 'text-slate-500'}`}>
                        {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </div>
                  </div>
                </motion.div>
              ))}
              
              {isTyping && (
                <div className="flex justify-start relative z-10">
                   <div className="w-6 h-6 rounded-sm border border-brand-neon-blue/30 bg-brand-neon-blue/10 mr-2 mt-1 flex items-center justify-center">
                        <Cpu size={12} className="text-brand-neon-blue animate-spin" />
                   </div>
                   <div className="bg-black/40 border border-brand-neon-blue/30 p-2 rounded-tr-lg rounded-br-lg rounded-bl-sm flex items-center gap-1.5 w-14 h-8">
                       <span className="w-1.5 h-1.5 bg-brand-neon-blue rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                       <span className="w-1.5 h-1.5 bg-brand-neon-purple rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                       <span className="w-1.5 h-1.5 bg-brand-neon-pink rounded-full animate-bounce"></span>
                   </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-black/80 border-t border-brand-neon-blue/30 backdrop-blur-md">
                <form onSubmit={sendMessage} className="relative flex items-center gap-2">
                    <button
                        type="button"
                        onClick={startListening}
                        className={`p-2 rounded-sm border transition-all duration-300 ${
                            isListening 
                            ? 'bg-red-500/20 border-red-500 text-red-500 animate-pulse' 
                            : 'bg-transparent border-white/20 text-slate-400 hover:border-brand-neon-blue hover:text-brand-neon-blue'
                        }`}
                        title="Voice Input"
                    >
                        <Mic size={18} />
                    </button>
                    
                    <div className="flex-1 relative group">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder={isListening ? "Listening..." : "Input command..."}
                            className="w-full pl-4 pr-10 py-2 bg-black/50 border border-white/10 rounded-sm text-brand-neon-blue placeholder:text-slate-600 focus:outline-none focus:border-brand-neon-blue focus:bg-black/80 transition-all font-mono text-sm"
                        />
                        <button 
                            type="submit" 
                            disabled={!input.trim()}
                            className="absolute right-1 top-1/2 -translate-y-1/2 p-1.5 bg-brand-neon-blue/20 text-brand-neon-blue rounded-sm hover:bg-brand-neon-blue hover:text-black hover:scale-105 disabled:opacity-30 disabled:scale-100 transition-all duration-200"
                        >
                            <Send size={14} />
                        </button>
                    </div>
                </form>
                <div className="flex justify-between items-center mt-2 px-1">
                    <p className="text-[9px] text-slate-500 font-mono tracking-wider">SECURE CONNECTION // TLS 1.3</p>
                    <p className="text-[9px] text-brand-neon-purple font-mono uppercase">Gemini 2.0 Core</p>
                </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
