import React, { useState } from 'react';
import { Header } from '../components/Header';
import { Calendar } from '../components/Calendar';
import { Cart } from '../components/Cart';
import { BookingModal } from '../components/BookingModal';

export function Home() {
    const [selectedDate, setSelectedDate] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const handleDateSelect = (date) => {
        setSelectedDate(date);
        setIsModalOpen(true);
    };

    return (
        <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
            <Header />

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

                {/* Info Banner imitating the 'created by Google Apps Script user' banner but nicer */}
                <button 
                    onClick={() => window.open('https://github.com/mediconvoi/v2-changelog', '_blank')}
                    className="w-full bg-blue-50 text-blue-700 px-4 py-2 rounded-lg mb-8 flex items-center gap-2 text-sm border border-blue-100 hover:bg-blue-100 transition-colors text-left"
                >
                    <span className="bg-blue-200 text-blue-800 text-xs font-bold px-2 py-0.5 rounded">INFO</span>
                    <span>Application Mediconvoi V2 - Optimisée pour la rapidité et la simplicité. Cliquez pour voir les nouveautés.</span>
                </button>

                <div className="flex flex-col lg:flex-row gap-8 items-start">

                    {/* Left Column: Calendar & Content */}
                    <div className="flex-1 w-full space-y-8">
                        <section>
                            <Calendar onSelectDate={handleDateSelect} />
                        </section>

                        {/* Pricing Table Section - Mimicking the card layout */}
                        <section>
                            <h3 className="text-xl font-bold text-gray-800 mb-4">Nos Tarifs</h3>
                            <div className="grid md:grid-cols-2 gap-4">
                                {[
                                    { title: 'Normal', price: '15,00 €', desc: '1 retrait + 1 livraison + 30 mn + 9 km' },
                                    { title: 'Samedi', price: '25,00 €', desc: '1 retrait + 1 livraison + 30 mn + 9 km' },
                                    { title: 'Pré-collecte', price: '30,00 €', desc: 'Retrait veille + livraison lendemain' },
                                    { title: 'Urgence', price: '50,00 €', desc: 'Retrait & livraison immédiate PUI/Site' }
                                ].map((item, i) => (
                                    <button 
                                        key={i} 
                                        onClick={() => handleDateSelect(new Date())}
                                        className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between hover:shadow-md transition-shadow text-left group"
                                    >
                                        <div className="flex justify-between items-start mb-4 w-full">
                                            <h4 className="font-bold text-lg text-gray-800 group-hover:text-brand-purple transition-colors">{item.title}</h4>
                                            <span className="bg-purple-50 text-brand-purple font-bold px-3 py-1 rounded-full group-hover:bg-brand-purple group-hover:text-white transition-all">{item.price}</span>
                                        </div>
                                        <p className="text-sm text-gray-500">{item.desc}</p>
                                    </button>
                                ))}
                            </div>
                        </section>
                    </div>

                    {/* Right Column: Cart (Sticky) */}
                    <div className="hidden lg:block w-96 shrink-0">
                        <Cart />
                    </div>

                </div>
            </main>

            {/* Booking Modal */}
            <BookingModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                date={selectedDate}
            />

        </div>
    );
}
