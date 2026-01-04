import { useNavigate } from 'react-router-dom'
import { Truck, Clock, ShieldCheck, MapPin, Phone, ChevronRight, UserCircle, Mail } from 'lucide-react'
import { MobileWidget } from '../components/MobileWidget'

export default function Landing() {
    const navigate = useNavigate()

    return (
        <div className="font-sans text-gray-800 bg-white">
            {/* Navigation */}
            <nav className="fixed w-full bg-white/90 backdrop-blur-md z-50 border-b border-gray-100">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-20 items-center">
                        <div className="flex items-center space-x-2">
                            <img src="/logo.png" alt="Mediconvoi" className="h-10 w-auto" />
                            <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-blue-500">
                                Mediconvoi
                            </span>
                        </div>
                        <div className="hidden md:flex space-x-8 items-center">
                            <a href="#services" className="text-gray-600 hover:text-blue-600 transition-colors font-medium">Services</a>
                            <a href="#about" className="text-gray-600 hover:text-blue-600 transition-colors font-medium">À Propos</a>
                            <a href="#contact" className="text-gray-600 hover:text-blue-600 transition-colors font-medium">Contact</a>
                        </div>
                        <div>
                            <button
                                onClick={() => navigate('/login')}
                                className="flex items-center space-x-2 bg-slate-900 text-white px-5 py-2.5 rounded-full hover:bg-slate-800 transition-all font-medium shadow-lg shadow-slate-900/20"
                            >
                                <UserCircle className="h-5 w-5" />
                                <span>Espace Pro</span>
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
                <div className="absolute inset-0 bg-blue-50/50 -z-10"></div>
                <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-blue-100/50 to-transparent -z-10"></div>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
                    <div className="grid lg:grid-cols-2 gap-12 items-center">
                        <div className="space-y-8">
                            <div className="inline-flex items-center space-x-2 bg-blue-100 text-blue-700 px-4 py-1.5 rounded-full text-sm font-semibold">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                                </span>
                                <span>Service Logistique VIP & Sur Mesure</span>
                            </div>

                            <h1 className="text-5xl lg:text-7xl font-extrabold text-slate-900 leading-tight">
                                Transport Exclusif <br />
                                <span className="text-blue-600">Pharmacies & EHPAD</span>
                            </h1>

                            <p className="text-xl text-gray-600 leading-relaxed max-w-lg">
                                Une logistique d'élite limitée à <strong>10 Pharmacies Partenaires</strong>.
                                Flotte 100% électrique incluant les nouvelles <strong>Tesla Juniper 2025</strong> pour une capacité de chargement inédite.
                            </p>

                            <div className="flex flex-col sm:flex-row gap-4">
                                <button onClick={() => navigate('/booking')} className="px-8 py-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/30 flex items-center justify-center">
                                    Commander une course
                                    <ChevronRight className="ml-2 h-5 w-5" />
                                </button>
                                <button className="px-8 py-4 bg-white text-slate-700 border border-slate-200 rounded-xl font-bold hover:bg-gray-50 transition-all flex items-center justify-center">
                                    Nous Contacter
                                </button>
                            </div>

                            {/* Mobile Quick Access Widget */}
                            <MobileWidget />

                            <div className="flex items-center gap-6 pt-4 text-sm font-medium text-gray-500">
                                <div className="flex items-center">
                                    <ShieldCheck className="h-5 w-5 text-green-500 mr-2" />
                                    Certifié HDS
                                </div>
                                <div className="flex items-center">
                                    <Clock className="h-5 w-5 text-blue-500 mr-2" />
                                    24/7 Disponible
                                </div>
                            </div>
                        </div>

                        <div className="relative hidden lg:block">
                            {/* Abstract decorative shapes representing map/logistics */}
                            <div className="absolute top-10 right-10 w-72 h-72 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
                            <div className="absolute -bottom-10 -left-10 w-72 h-72 bg-cyan-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>

                            <div className="relative bg-white p-8 rounded-3xl shadow-2xl border border-gray-100 rotate-2 hover:rotate-0 transition-all duration-500 hover:scale-[1.02]">
                                <div className="space-y-6">
                                    {/* Mock UI Elements */}
                                    <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                                        <div className="flex items-center space-x-3">
                                            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                                                <Truck className="h-5 w-5 text-blue-600" />
                                            </div>
                                            <div>
                                                <div className="font-bold text-slate-800">Livraison en cours</div>
                                                <div className="text-xs text-green-500 font-medium">Arrivée estimée : 14h30</div>
                                            </div>
                                        </div>
                                        <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold">En Route</span>
                                    </div>

                                    <div className="space-y-3">
                                        <div className="flex items-center space-x-3 text-sm">
                                            <div className="h-2 w-2 rounded-full bg-gray-300"></div>
                                            <div className="text-gray-500">Pharmacie Centrale</div>
                                        </div>
                                        <div className="h-8 border-l-2 border-dashed border-gray-200 ml-1"></div>
                                        <div className="flex items-center space-x-3 text-sm">
                                            <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                                            <div className="font-semibold text-slate-900">EHPAD Les Magnolias</div>
                                        </div>
                                    </div>

                                    <div className="bg-gray-50 p-4 rounded-xl">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-xs font-bold text-gray-400">STATUS GLACIERE</span>
                                            <span className="text-xs font-bold text-blue-600">OK</span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-2">
                                            <div className="bg-blue-500 h-2 rounded-full w-3/4"></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Services Grid */}
            <section id="services" className="py-24 bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center max-w-3xl mx-auto mb-16">
                        <h2 className="text-3xl font-bold text-slate-900 mb-4">Service Premium Limité</h2>
                        <div className="flex justify-center mb-6">
                            <span className="bg-slate-900 text-white px-4 py-1 rounded-full text-sm font-bold">
                                Disponibilité Actuelle : 6 places restantes
                            </span>
                        </div>
                        <p className="text-lg text-gray-600">
                            Nous limitons volontairement notre partenariat à 10 Pharmacies pour garantir une qualité de service irréprochable.
                            Notre flotte exclusive de 10 Navettes Bleues (Tesla Juniper) assure vos rotations.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        <div className="group p-8 rounded-2xl bg-white border border-gray-100 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
                            <div className="w-14 h-14 bg-blue-50 rounded-xl flex items-center justify-center mb-6 group-hover:bg-blue-600 transition-colors">
                                <Truck className="h-7 w-7 text-blue-600 group-hover:text-white transition-colors" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-3">Tournées Programmées</h3>
                            <p className="text-gray-500 leading-relaxed">
                                Optimisation des flux réguliers pour EHPAD et officines. Gestion automatisée des rotations quotidiennes.
                            </p>
                        </div>

                        <div className="group p-8 rounded-2xl bg-white border border-gray-100 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
                            <div className="w-14 h-14 bg-red-50 rounded-xl flex items-center justify-center mb-6 group-hover:bg-red-500 transition-colors">
                                <Clock className="h-7 w-7 text-red-500 group-hover:text-white transition-colors" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-3">Courses Urgentes</h3>
                            <p className="text-gray-500 leading-relaxed">
                                Intervention rapide en moins de 2h pour les produits vitaux (Sang, O2, Stat). Disponibilité 24/7.
                            </p>
                        </div>

                        <div className="group p-8 rounded-2xl bg-white border border-gray-100 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
                            <div className="w-14 h-14 bg-green-50 rounded-xl flex items-center justify-center mb-6 group-hover:bg-green-600 transition-colors">
                                <ShieldCheck className="h-7 w-7 text-green-600 group-hover:text-white transition-colors" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-3">Chaîne du Froid</h3>
                            <p className="text-gray-500 leading-relaxed">
                                Respect strict des températures (2-8°C). Véhicules équipés et remontée de données en temps réel.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Bottom */}
            <section className="py-20 bg-slate-900 text-white relative overflow-hidden">
                <div className="absolute inset-0 bg-blue-600/10 pattern-dots"></div>
                <div className="max-w-4xl mx-auto px-4 text-center relative z-10">
                    <h2 className="text-4xl font-bold mb-6">Prêt à optimiser votre logistique ?</h2>
                    <p className="text-xl text-slate-300 mb-10">Rejoignez plus de 50 établissements de santé qui nous font confiance.</p>
                    <div className="flex flex-col sm:flex-row justify-center gap-4">
                        <button onClick={() => navigate('/login')} className="px-8 py-4 bg-white text-slate-900 rounded-xl font-bold hover:bg-blue-50 transition-all">
                            Créer un compte Pro
                        </button>
                        <button className="px-8 py-4 bg-transparent border border-slate-600 text-white rounded-xl font-bold hover:bg-slate-800 transition-all">
                            Demander un devis
                        </button>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-slate-950 text-slate-400 py-12 border-t border-slate-900">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid md:grid-cols-4 gap-8">
                    <div className="col-span-1 md:col-span-2">
                        <div className="flex items-center space-x-2 mb-4">
                            <img src="/logo.png" alt="Mediconvoi" className="h-8 w-auto" />
                            <span className="text-xl font-bold text-white">Mediconvoi</span>
                        </div>
                        <p className="max-w-xs text-sm">
                            La référence du transport médical sécurisé. Nous connectons les acteurs de santé pour une meilleure prise en charge des patients.
                        </p>
                    </div>
                    <div>
                        <h4 className="text-white font-bold mb-4">Services</h4>
                        <ul className="space-y-2 text-sm">
                            <li>Transport BIO</li>
                            <li>Livraison Domicile</li>
                            <li>Navettes Inter-Hôpitaux</li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="text-white font-bold mb-4">Contact</h4>
                        <div className="space-y-2 text-sm">
                            <div className="flex items-center">
                                <MapPin className="h-4 w-4 mr-2" />
                                255 B Avenue Marcel Castié, 83000 Toulon
                            </div>
                            <div className="flex items-center">
                                <Phone className="h-4 w-4 mr-2" />
                                07 68 59 18 88
                            </div>
                            <div className="flex items-center">
                                <Mail className="h-4 w-4 mr-2" />
                                contact@mediconvoi.fr
                            </div>
                        </div>
                    </div>
                </div>
                <div className="max-w-7xl mx-auto px-4 mt-12 pt-8 border-t border-slate-900 text-center text-xs">
                    © 2025 Mediconvoi. Tous droits réservés.
                </div>
            </footer>
        </div>
    )
}
