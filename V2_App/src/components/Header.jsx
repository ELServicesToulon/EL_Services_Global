import React from 'react';
import { Pill, ShoppingCart } from 'lucide-react';

export function Header() {
    return (
        <header className="bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                {/* Logo Area */}
                <div className="flex items-center gap-2">
                    <img src="/src/assets/logo.png" alt="Mediconvoi Logo" className="h-10 w-auto" />
                    <span className="text-xl font-bold bg-gradient-to-r from-brand-purple to-brand-blue bg-clip-text text-transparent">
                        Mediconvoi
                    </span>
                </div>

                {/* User / Info */}
                <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span>v2.0 (Model-Match)</span>
                </div>
            </div>
        </header>
    );
}
