import React, { useState, useEffect } from 'react';
import { ShieldCheck, X } from 'lucide-react';
import { Link } from 'react-router-dom';

export const CookieBanner = () => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const consent = localStorage.getItem('mediconvoi-cookie-consent');
        if (!consent) {
            const timer = setTimeout(() => setIsVisible(true), 1500);
            return () => clearTimeout(timer);
        }
    }, []);

    const handleAccept = () => {
        localStorage.setItem('mediconvoi-cookie-consent', 'accepted');
        setIsVisible(false);
    };

    const handleDecline = () => {
        localStorage.setItem('mediconvoi-cookie-consent', 'declined');
        setIsVisible(false);
    };

    if (!isVisible) return null;

    return (
        <div className="fixed bottom-6 left-6 right-6 md:left-auto md:right-8 md:max-w-md z-[100] animate-fadeIn">
            <div className="bg-white rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-gray-100 p-6 backdrop-blur-sm bg-white/95">
                <div className="flex items-start gap-4 mb-4">
                    <div className="bg-blue-50 p-2 rounded-xl">
                        <ShieldCheck className="h-6 w-6 text-brand-blue" />
                    </div>
                    <div className="flex-1">
                        <h4 className="text-slate-900 font-bold text-lg mb-1">Protection de la vie privée</h4>
                        <p className="text-gray-500 text-sm leading-relaxed">
                            Nous utilisons uniquement des cookies techniques essentiels pour assurer le bon fonctionnement et la sécurité de notre plateforme. 
                            Consultez notre <Link to="/legal?tab=privacy" className="text-brand-purple hover:underline font-medium">Politique de Confidentialité</Link> pour en savoir plus.
                        </p>
                    </div>
                    <button 
                        onClick={() => setIsVisible(false)}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>
                
                <div className="flex gap-3">
                    <button 
                        onClick={handleAccept}
                        className="flex-1 bg-slate-900 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-slate-800 transition-all text-sm shadow-lg shadow-slate-900/10"
                    >
                        Accepter
                    </button>
                    <button 
                        onClick={handleDecline}
                        className="flex-1 bg-gray-50 text-gray-600 px-6 py-2.5 rounded-xl font-bold hover:bg-gray-100 transition-all text-sm border border-gray-200"
                    >
                        Refuser
                    </button>
                </div>
            </div>
        </div>
    );
};
