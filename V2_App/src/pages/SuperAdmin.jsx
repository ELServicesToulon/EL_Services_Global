import React, { useState, useEffect } from 'react';
import { Activity, Shield, Zap, Terminal, RefreshCw, Power, AlertTriangle, MessageSquare, Menu, FileText, Cpu } from 'lucide-react';

export default function SuperAdmin() {
    const [agents, setAgents] = useState([]);
    const [advisorTip, setAdvisorTip] = useState("Chargement du conseil stratégique...");
    const [events, setEvents] = useState([]);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [pin, setPin] = useState("");

    // Simulation de données (Fallback si API non dispo)
    const MOCK_AGENTS = [
        { id: 'sentinel', name: 'Sentinel Core', role: 'Orchestrateur', status: 'running', lastLog: 'Monitoring active...' },
        { id: 'network', name: 'Network Overseer', role: 'Surveillance', status: 'running', lastLog: 'PING Mediconvoi: OK (120ms)' },
        { id: 'security', name: 'Security Agent', role: 'Cybersécurité', status: 'idle', lastLog: 'Scan terminé. R.A.S' },
        { id: 'advisor', name: 'Chief Advisor', role: 'Stratégie', status: 'active', lastLog: 'Analyse des KPI en cours' },
        { id: 'secretary', name: 'Secretary Agent', role: 'Administratif', status: 'waiting', lastLog: 'En attente de documents' },
    ];

    useEffect(() => {
        if (isAuthenticated) {
            fetchData();
            // Polling toutes les 5 sec
            const interval = setInterval(fetchData, 5000);
            return () => clearInterval(interval);
        }
    }, [isAuthenticated]);

    const fetchData = async () => {
        try {
            // Tentative connexion API locale (ne marchera que si localhost accessible, sinon fallback)
            // Dans un vrai déploiement, utiliser Tunnel ou Supabase.
            // Ici on utilise le MOCK pour la démo visuelle immédiate.
            setAgents(MOCK_AGENTS);
            
            // Simulation events
            setEvents([
                { id: 1, type: 'warning', text: 'Latence réseau détectée sur API Core (18:30)' },
                { id: 2, type: 'info', text: 'Backup journalier effectué avec succès.' }
            ]);

            // Simulation Conseil
            setAdvisorTip("💡 Conseil : Pensez à vérifier les logs du Ghost Shopper, le taux de conversion a légèrement baissé ce matin.");

        } catch (e) {
            console.error("Erreur Dashboard", e);
        }
    };

    const handleLogin = (e) => {
        e.preventDefault();
        if (pin === "1567") { // Code simple pour démo
            setIsAuthenticated(true);
        } else {
            alert("Code PIN incorrect");
        }
    };

    const handleAction = (agentId, action) => {
        alert(`Commande envoyée : ${action} -> ${agentId}`);
        // Logique d'appel API ici
    };

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
                <div className="bg-slate-800 p-8 rounded-2xl shadow-2xl border border-slate-700 w-full max-w-md text-center">
                    <div className="mb-6 flex justify-center">
                        <div className="h-16 w-16 bg-blue-600 rounded-full flex items-center justify-center animate-pulse">
                            <Shield className="h-8 w-8 text-white" />
                        </div>
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-2">Accès Superviseur</h1>
                    <p className="text-slate-400 mb-6 font-mono text-sm">IDENTIFICATION REQUISE</p>
                    <form onSubmit={handleLogin} className="space-y-4">
                        <input 
                            type="password" 
                            value={pin}
                            onChange={(e) => setPin(e.target.value)}
                            placeholder="Code PIN"
                            inputMode="numeric"
                            className="w-full bg-slate-900 border border-slate-600 text-white px-4 py-3 rounded-xl text-center text-2xl tracking-widest focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        />
                        <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-colors">
                            Entrer
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 pb-20 font-sans">
            {/* Header */}
            <header className="fixed top-0 w-full bg-slate-900/80 backdrop-blur-md border-b border-slate-800 z-50 px-4 py-3 pb-safe">
                <div className="flex justify-between items-center max-w-7xl mx-auto">
                    <div className="flex items-center space-x-3">
                        <Activity className="text-green-500 h-6 w-6" />
                        <span className="font-bold text-lg tracking-tight">Superviseur IA</span>
                    </div>
                    <div className="flex items-center space-x-4">
                        <div className="hidden md:flex items-center space-x-2 text-xs font-mono text-slate-500">
                            <span className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></span>
                            <span>CONNECTED</span>
                        </div>
                        <button onClick={() => setIsAuthenticated(false)} className="bg-slate-800 p-2 rounded-lg text-slate-400 hover:text-white">
                            <Power className="h-5 w-5" />
                        </button>
                    </div>
                </div>
            </header>

            <main className="pt-20 px-4 max-w-7xl mx-auto space-y-6">
                
                {/* 1. Advisor Banner */}
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 shadow-lg shadow-indigo-900/20 p-6 animate-fade-in-up">
                    <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
                    <div className="relative z-10 flex items-start space-x-4">
                        <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
                            <MessageSquare className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <h3 className="text-indigo-100 text-xs font-bold uppercase tracking-wider mb-1">Le Conseil de l'Adjoint</h3>
                            <p className="text-white font-medium text-lg leading-snug">
                                {advisorTip}
                            </p>
                        </div>
                    </div>
                </div>

                {/* 2. Critical Events Banner */}
                <div className="bg-slate-900 border-l-4 border-yellow-500 rounded-r-xl p-4 shadow-md flex items-center space-x-4">
                    <AlertTriangle className="h-5 w-5 text-yellow-500 flex-shrink-0" />
                    <div className="flex-1 overflow-hidden">
                        <div className="flex flex-col space-y-1">
                            {events.map(ev => (
                                <span key={ev.id} className="text-sm text-slate-300 truncate">
                                    <span className="text-yellow-500 font-bold mr-2">[{ev.type.toUpperCase()}]</span>
                                    {ev.text}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>

                {/* 3. Agents Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {agents.map(agent => (
                        <div key={agent.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-all group">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center space-x-3">
                                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${
                                        agent.status === 'running' ? 'bg-green-500/10 text-green-500' : 
                                        agent.status === 'stopped' ? 'bg-red-500/10 text-red-500' : 'bg-slate-700/50 text-slate-400'
                                    }`}>
                                        <Cpu className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-white">{agent.name}</h4>
                                        <div className="text-xs text-slate-500">{agent.role}</div>
                                    </div>
                                </div>
                                <div className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border ${
                                    agent.status === 'running' ? 'border-green-500/30 text-green-400' : 'border-slate-700 text-slate-500'
                                }`}>
                                    {agent.status}
                                </div>
                            </div>
                            
                            {/* Terminal Logs Mockup */}
                            <div className="bg-black/50 rounded-lg p-3 font-mono text-xs text-slate-400 mb-4 h-16 overflow-hidden relative">
                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-slate-700"></div>
                                <p className="pl-3 line-clamp-2">
                                    <span className="text-green-500">$</span> {agent.lastLog}
                                </p>
                            </div>

                            {/* Actions */}
                            <div className="grid grid-cols-2 gap-2">
                                <button 
                                    onClick={() => handleAction(agent.id, 'restart')}
                                    className="bg-slate-800 hover:bg-slate-700 text-slate-300 py-2 rounded-lg text-sm font-medium flex items-center justify-center transition-colors"
                                >
                                    <RefreshCw className="h-3 w-3 mr-2" />
                                    Relancer
                                </button>
                                <button 
                                    onClick={() => handleAction(agent.id, 'logs')}
                                    className="bg-slate-800 hover:bg-slate-700 text-slate-300 py-2 rounded-lg text-sm font-medium flex items-center justify-center transition-colors"
                                >
                                    <FileText className="h-3 w-3 mr-2" />
                                    Logs
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </main>

            {/* Android Install Instructions (Visible only on mobile) */}
            <div className="mt-8 mx-4 p-4 bg-blue-900/20 border border-blue-900/50 rounded-xl text-center md:hidden">
                <p className="text-blue-200 text-sm">Pour installer sur Android :<br/>Menu Chrome > "Ajouter à l'écran d'accueil"</p>
            </div>
        </div>
    );
}
