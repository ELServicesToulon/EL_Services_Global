import React from 'react';
import { ShoppingBasket } from 'lucide-react';

export function Cart() {
    return (
        <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white h-fit sticky top-24">

            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-brand-purple/10 rounded-full">
                    {/* Custom stylized 'e' icon or basket */}
                    <ShoppingBasket className="text-brand-purple" size={24} />
                </div>
                <h2 className="text-xl font-bold text-gray-800">Panier de réservation</h2>
            </div>

            <div className="flex flex-col items-center justify-center py-12 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
                <span className="text-gray-400 font-medium">Votre panier est vide.</span>
            </div>

            <button className="w-full mt-6 py-3 bg-gray-100 text-gray-600 font-semibold rounded-xl hover:bg-gray-200 transition-colors">
                Se connecter
            </button>

        </div>
    );
}
