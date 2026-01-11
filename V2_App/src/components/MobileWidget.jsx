import React from 'react';
import { Box, Home, Truck, Shield, LogIn } from 'lucide-react';
import { Link } from 'react-router-dom';

export function MobileWidget() {
    const apps = [
        { name: 'Site Public', icon: Home, link: '/', color: 'bg-emerald-500' },
        { name: 'Commander', icon: Box, link: '/booking', color: 'bg-indigo-600' },
        { name: 'Livreur', icon: Truck, link: '/delivery', color: 'bg-blue-600' },
        { name: 'Admin', icon: Shield, link: '/admin', color: 'bg-rose-500' },
        { name: 'Espace Pro', icon: LogIn, link: '/login', color: 'bg-slate-700' }
    ];

    return (
        <div className="w-full max-w-sm mx-auto mt-8 lg:hidden">
            {/* Widget Container styling imitating iOS/Android widgets */}
            <div className="bg-white/80 backdrop-blur-xl border border-white/40 rounded-3xl shadow-2xl p-6 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-600"></div>

                <div className="flex justify-between items-center mb-6">
                    <button 
                        onClick={() => window.location.reload()}
                        className="text-slate-600 font-bold text-xs uppercase tracking-wider flex items-center gap-2 hover:text-brand-purple transition-colors"
                    >
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                        Accès Rapide
                    </button>
                    <button 
                        onClick={() => window.open('https://github.com/mediconvoi/v2-changelog', '_blank')}
                        className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-mono hover:bg-slate-200 transition-colors"
                    >
                        v2.0
                    </button>
                </div>

                <div className="grid grid-cols-4 gap-4">
                    {apps.map((app, idx) => (
                        <Link
                            key={idx}
                            to={app.link}
                            className="flex flex-col items-center gap-2 group"
                        >
                            <div className={`
                                h-14 w-14 ${app.color} 
                                rounded-2xl flex items-center justify-center 
                                text-white shadow-lg shadow-gray-200 
                                transition-all duration-300
                                group-hover:scale-105 group-active:scale-95 group-hover:shadow-xl
                            `}>
                                <app.icon size={24} strokeWidth={2} />
                            </div>
                            <span className="text-[10px] font-semibold text-slate-600 text-center leading-tight">
                                {app.name}
                            </span>
                        </Link>
                    ))}
                </div>

                {/* Battery/Status Line Mock */}
                <div className="mt-6 pt-3 border-t border-slate-100 flex justify-between items-center text-[10px] text-slate-400 font-medium">
                    <span>Mediconvoi Secure</span>
                    <span>100% Connecté</span>
                </div>
            </div>
        </div>
    );
}
