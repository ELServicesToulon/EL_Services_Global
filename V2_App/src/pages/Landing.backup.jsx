import { useNavigate, Link } from 'react-router-dom'
import { useState } from 'react'
import { Truck, Clock, ShieldCheck, MapPin, Phone, ChevronRight, Star, Activity, Thermometer } from 'lucide-react'
import { MobileWidget } from '../components/MobileWidget'
import logo from '../assets/logo.png'
import { BookingModal } from '../components/BookingModal'
import { addDays } from 'date-fns'

export default function Landing() {
    const navigate = useNavigate()
    const [isBookingModalOpen, setIsBookingModalOpen] = useState(false)
    const [bookingDate, setBookingDate] = useState(addDays(new Date(), 1))

    const handleBookingConfirm = (details) => {
        navigate('/login', { state: { booking: details } });
    };

    return (
        <div className="font-sans text-slate-800 bg-slate-50 overflow-x-hidden selection:bg-brand-purple selection:text-white">
            <BookingModal
                isOpen={isBookingModalOpen}
                onClose={() => setIsBookingModalOpen(false)}
                date={bookingDate}
                onConfirm={handleBookingConfirm}
            />
            
            {/* Navbar Floating */}
            <nav className="fixed w-full z-50 transition-all duration-300 top-0 py-4 px-4 sm:px-8">
                <div className="max-w-7xl mx-auto bg-white/80 backdrop-blur-xl border border-white/40 shadow-xl shadow-slate-200/40 rounded-2xl px-6 py-3 flex justify-between items-center">
                    <Link to="/" className="flex items-center space-x-3 group">
                        <div className="relative">
                            <div className="absolute -inset-1 bg-gradient-to-r from-brand-blue to-brand-purple rounded-full blur opacity-25 group-hover:opacity-75 transition duration-500"></div>
                            <img src={logo} alt="Logo" className="h-8 w-auto relative" />
                        </div>
                        <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700">
                            Mediconvoi
                        </span>
                    </Link>
                    
                    <div className="hidden md:flex space-x-8 items-center text-sm font-semibold text-slate-600">
                        <a href="#expertises" className="hover:text-brand-blue transition-colors">Expertises</a>
                        <a href="#solutions" className="hover:text-brand-blue transition-colors">Solutions</a>
                        <a href="#tarifs" className="hover:text-brand-blue transition-colors">Tarifs</a>
                    </div>

                    <button
                        onClick={() => navigate('/login')}
                        className="bg-slate-900 text-white px-6 py-2.5 rounded-xl hover:bg-slate-800 transition-all font-medium shadow-lg shadow-slate-900/20 hover:shadow-slate-900/40 transform hover:-translate-y-0.5"
                    >
                        Espace Pro
                    </button>
                </div>
            </nav>

            {/* HERO SECTION - Immersive Dark */}
            <section className="relative min-h-screen pt-32 pb-20 overflow-hidden bg-slate-900 flex items-center">
                {/* Background Effects */}
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1516549655169-df83a092dd14?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-10 mix-blend-overlay"></div>
                <div className="absolute inset-0 bg-gradient-to-b from-slate-900/80 via-slate-900/95 to-slate-50"></div>
                
                {/* Glowing Blobs */}
                <div className="absolute top-1/4 -left-20 w-[600px] h-[600px] bg-brand-blue/30 rounded-full blur-[128px] animate-pulse"></div>
                <div className="absolute bottom-1/4 -right-20 w-[600px] h-[600px] bg-brand-purple/20 rounded-full blur-[128px]"></div>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full">
                    <div className="grid lg:grid-cols-2 gap-16 items-center">
                        <div className="space-y-8 animate-fade-in-up">
                            <div className="inline-flex items-center space-x-2 bg-slate-800/80 backdrop-blur-md border border-slate-700 rounded-full px-4 py-1.5 shadow-lg">
                                <span className="flex h-2 w-2 relative">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                </span>
                                <span className="text-slate-300 text-xs font-bold tracking-wide uppercase">Leader Logistique Santé PACA</span>
                            </div>

                            <h1 className="text-5xl lg:text-7xl font-extrabold text-white leading-[1.1] tracking-tight">
                                La logistique <br/>
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">médicale de précision.</span>
                            </h1>

                            <p className="text-xl text-slate-400 leading-relaxed max-w-lg border-l-4 border-blue-500 pl-6">
                                Transport sécurisé de produits de santé, sang et prélèvements.
                                <br/>Flotte électrique, traçabilité temps réel, engagement HDS.
                            </p>

                            <div className="flex flex-col sm:flex-row gap-4 pt-4">
                                <button onClick={() => setIsBookingModalOpen(true)} className="group relative px-8 py-4 bg-white text-slate-900 rounded-2xl font-bold overflow-hidden transition-all hover:scale-[1.02] shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)]">
                                    <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-blue-50 to-white opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                    <span className="relative flex items-center justify-center">
                                        Commander une course
                                        <ChevronRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                                    </span>
                                </button>
                                <button className="px-8 py-4 bg-slate-800/50 backdrop-blur border border-slate-700 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all flex items-center justify-center">
                                    Découvrir nos offres
                                </button>
                            </div>
                            
                            {/* Stats */}
                            <div className="grid grid-cols-3 gap-8 pt-8 border-t border-slate-800/50">
                                <div>
                                    <div className="text-3xl font-bold text-white">24/7</div>
                                    <div className="text-sm text-slate-500 font-medium">Disponibilité</div>
                                </div>
                                <div>
                                    <div className="text-3xl font-bold text-white">45min</div>
                                    <div className="text-sm text-slate-500 font-medium">Intervention</div>
                                </div>
                                <div>
                                    <div className="text-3xl font-bold text-white">100%</div>
                                    <div className="text-sm text-slate-500 font-medium">Conforme HDS</div>
                                </div>
                            </div>
                        </div>

                        {/* Interactive UI Mockup */}
                        <div className="relative hidden lg:block perspective-1000">
                            <div className="absolute inset-0 bg-gradient-to-tr from-blue-600/20 to-purple-600/20 rounded-3xl blur-2xl transform rotate-6 scale-90"></div>
                            <div className="relative bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 p-6 rounded-3xl shadow-2xl transform transition-all duration-700 hover:rotate-0 rotate-2 hover:scale-[1.02]">
                                {/* Header Mockup */}
                                <div className="flex items-center justify-between mb-8">
                                    <div className="flex items-center space-x-3">
                                        <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                                            <Activity className="text-white h-6 w-6" />
                                        </div>
                                        <div>
                                            <div className="text-white font-bold text-lg">Suivi Live</div>
                                            <div className="text-blue-400 text-xs font-mono">ID: #TR-8829-X</div>
                                        </div>
                                    </div>
                                    <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
                                </div>

                                {/* Map Visualization (Abstract) */}
                                <div className="h-48 bg-slate-800 rounded-2xl w-full mb-6 relative overflow-hidden group">
                                    <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-500 via-slate-900 to-slate-900"></div>
                                    {/* Path Line */}
                                    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                                        <path d="M10,90 Q50,10 90,50" fill="none" stroke="#3b82f6" strokeWidth="2" strokeDasharray="4 4" className="animate-dash" />
                                        <circle cx="10" cy="90" r="3" fill="#3b82f6" />
                                        <circle cx="90" cy="50" r="3" fill="#ef4444" className="animate-ping" />
                                    </svg>
                                    
                                    {/* Tooltip */}
                                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white/10 backdrop-blur-md border border-white/20 p-3 rounded-xl shadow-xl">
                                        <div className="flex items-center space-x-2 text-white text-xs font-bold">
                                            <Truck className="h-4 w-4 text-blue-400" />
                                            <span>En approche (4 min)</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Status Cards */}
                                <div className="space-y-3">
                                    <div className="bg-slate-800 p-4 rounded-xl flex items-center justify-between border border-slate-700">
                                        <div className="flex items-center space-x-3">
                                            <Thermometer className="text-blue-400 h-5 w-5" />
                                            <span className="text-slate-300 text-sm">Température Caisson</span>
                                        </div>
                                        <span className="text-green-400 font-mono font-bold">+4.2°C</span>
                                    </div>
                                    <div className="bg-slate-800 p-4 rounded-xl flex items-center justify-between border border-slate-700">
                                        <div className="flex items-center space-x-3">
                                            <Clock className="text-blue-400 h-5 w-5" />
                                            <span className="text-slate-300 text-sm">Heure estimée</span>
                                        </div>
                                        <span className="text-white font-mono font-bold">14:52</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* EXPERTISES - Grid Cards */}
            <section id="expertises" className="py-32 relative">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center max-w-3xl mx-auto mb-20 animate-on-scroll">
                        <h2 className="text-sm font-bold text-brand-blue tracking-widest uppercase mb-3">Notre Savoir-Faire</h2>
                        <h3 className="text-4xl font-extrabold text-slate-900 mb-6">L'Excellence Opérationnelle</h3>
                        <p className="text-lg text-slate-600">
                            Chaque aspect de notre service est conçu pour répondre aux normes les plus strictes du milieu hospitalier et pharmaceutique.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {[
                            { 
                                icon: ShieldCheck, title: "Certifié & Sécurisé", 
                                desc: "Protocoles stricts conformes aux BPD (Bonnes Pratiques de Distribution). Traçabilité numérique intégrale.", 
                                color: "blue" 
                            },
                            { 
                                icon: Thermometer, title: "Chaîne du Froid", 
                                desc: "Caissons actifs et passifs monitorés en temps réel. Alertes automatiques en cas d'excursion de température.", 
                                color: "cyan" 
                            },
                            { 
                                icon: Clock, title: "Urgence Vitale", 
                                desc: "Délai d'intervention < 45min pour les produits sanguins (PSL) et prélèvements urgents. Service 24H/24.", 
                                color: "red" 
                            }
                        ].map((item, idx) => (
                            <div key={idx} className="group relative bg-white rounded-[2rem] p-10 shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 hover:-translate-y-2 border border-slate-100">
                                <div className={`h-16 w-16 rounded-2xl bg-${item.color}-50 flex items-center justify-center mb-8 group-hover:bg-${item.color}-500 transition-all duration-500`}>
                                    <item.icon className={`h-8 w-8 text-${item.color}-600 group-hover:text-white transition-colors duration-500`} />
                                </div>
                                <h4 className="text-xl font-bold text-slate-900 mb-4">{item.title}</h4>
                                <p className="text-slate-500 leading-relaxed">
                                    {item.desc}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* PRICING - Clean & Clear */}
            <section id="tarifs" className="py-24 bg-slate-900 text-white relative overflow-hidden">
                {/* Decoration */}
                <div className="absolute top-0 right-0 w-full h-px bg-gradient-to-r from-transparent via-slate-700 to-transparent"></div>
                
                <div className="max-w-7xl mx-auto px-4 relative z-10">
                    <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-8">
                        <div>
                            <h2 className="text-3xl font-bold mb-4">Grille Tarifaire Simplifiée</h2>
                            <p className="text-slate-400 max-w-xl">
                                Pas de frais cachés. Une facturation claire adaptée aux fréquences de nos partenaires.
                            </p>
                        </div>
                        <button className="text-brand-blue font-bold flex items-center hover:text-white transition-colors">
                            Voir la grille complète <ChevronRight className="ml-1 h-5 w-5" />
                        </button>
                    </div>

                    <div className="grid md:grid-cols-4 gap-6">
                        {[
                            { title: 'Standard', price: '15 €', sub: 'Course simple', desc: 'Retrait + Livraison (9km)', highlight: false },
                            { title: 'Express', price: '25 €', sub: 'Urgence < 1h', desc: 'Priorité absolue & Direct', highlight: true },
                            { title: 'Week-end', price: '30 €', sub: 'Samedi / Dim', desc: 'Astreinte incluse', highlight: false },
                            { title: 'Nuit', price: '50 €', sub: '20h - 08h', desc: 'Intervention nuit profonde', highlight: false }
                        ].map((plan, i) => (
                            <button 
                                key={i}
                                onClick={() => setIsBookingModalOpen(true)}
                                className={`relative p-8 rounded-3xl text-left transition-all duration-300 hover:scale-105 ${
                                    plan.highlight 
                                    ? 'bg-gradient-to-b from-blue-600 to-blue-700 shadow-2xl shadow-blue-900/50 border border-blue-500' 
                                    : 'bg-slate-800/50 hover:bg-slate-800 border border-slate-700'
                                }`}
                            >
                                {plan.highlight && (
                                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-white text-blue-600 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                                        Populaire
                                    </div>
                                )}
                                <h3 className={`text-lg font-bold mb-2 ${plan.highlight ? 'text-white' : 'text-slate-300'}`}>{plan.title}</h3>
                                <div className="flex items-baseline mb-1">
                                    <span className="text-4xl font-extrabold">{plan.price}</span>
                                </div>
                                <div className={`text-sm font-medium mb-6 ${plan.highlight ? 'text-blue-200' : 'text-slate-500'}`}>{plan.sub}</div>
                                <p className={`text-sm leading-relaxed ${plan.highlight ? 'text-blue-100' : 'text-slate-400'}`}>
                                    {plan.desc}
                                </p>
                            </button>
                        ))}
                    </div>
                </div>
            </section>

            {/* TRUST / FOOTER CALL */}
            <section className="py-20 bg-white border-t border-slate-100">
                <div className="max-w-4xl mx-auto text-center px-4">
                    <div className="flex justify-center space-x-2 mb-8 text-yellow-500">
                        <Star className="fill-current w-6 h-6" />
                        <Star className="fill-current w-6 h-6" />
                        <Star className="fill-current w-6 h-6" />
                        <Star className="fill-current w-6 h-6" />
                        <Star className="fill-current w-6 h-6" />
                    </div>
                    <h2 className="text-4xl font-bold text-slate-900 mb-6"> "Une fiabilité sans faille." </h2>
                    <p className="text-xl text-slate-600 italic mb-12">
                        "Mediconvoi a transformé notre gestion logistique. La traçabilité de la chaîne du froid est un atout majeur pour notre certification."
                    </p>
                    <div className="flex items-center justify-center space-x-4">
                        <div className="h-12 w-12 bg-slate-200 rounded-full overflow-hidden">
                            <img src="https://ui-avatars.com/api/?name=Dr+Laurent&background=0D8ABC&color=fff" alt="Avatar" />
                        </div>
                        <div className="text-left">
                            <div className="font-bold text-slate-900">Dr. Laurent P.</div>
                            <div className="text-sm text-slate-500">Pharmacien Titulaire, Toulon</div>
                        </div>
                    </div>
                </div>
            </section>
            
            <MobileWidget />

            {/* Footer */}
            <footer className="bg-slate-50 py-12 border-t border-slate-200">
                <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center text-slate-500 text-sm">
                    <div className="flex items-center space-x-2 mb-4 md:mb-0">
                        <img src={logo} alt="Logo" className="h-6 w-auto grayscale opacity-50" />
                        <span>© 2026 Mediconvoi Global Services.</span>
                    </div>
                    <div className="flex space-x-6">
                        <Link to="/legal" className="hover:text-brand-blue transition-colors">Mentions Légales</Link>
                        <Link to="/legal" className="hover:text-brand-blue transition-colors">Confidentialité</Link>
                        <a href="mailto:contact@mediconvoi.fr" className="hover:text-brand-blue transition-colors">Support</a>
                    </div>
                </div>
            </footer>
        </div>
    )
}
