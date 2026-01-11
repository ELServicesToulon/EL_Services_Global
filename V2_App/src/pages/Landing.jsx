import { useNavigate, Link } from 'react-router-dom'
import { useState } from 'react'
import { Truck, Clock, ShieldCheck, MapPin, Phone, ChevronRight, Star, Activity, Thermometer, Cpu, Zap, Radio } from 'lucide-react'
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
        <div className="font-sans text-brand-bg bg-brand-bg min-h-screen overflow-x-hidden selection:bg-brand-neon-purple selection:text-white">
            <BookingModal
                isOpen={isBookingModalOpen}
                onClose={() => setIsBookingModalOpen(false)}
                date={bookingDate}
                onConfirm={handleBookingConfirm}
            />
            
            {/* Navbar Floating - Glassmorphism */}
            <nav className="fixed w-full z-50 transition-all duration-300 top-0 py-4 px-4 sm:px-8">
                <div className="max-w-7xl mx-auto bg-brand-dark/60 backdrop-blur-xl border border-white/10 shadow-[0_0_15px_rgba(0,243,255,0.1)] rounded-2xl px-6 py-3 flex justify-between items-center">
                    <Link to="/" className="flex items-center space-x-3 group">
                        <div className="relative">
                            <div className="absolute -inset-1 bg-brand-neon-blue rounded-full blur opacity-25 group-hover:opacity-75 transition duration-500 animate-pulse"></div>
                            <img src={logo} alt="Logo" className="h-8 w-auto relative brightness-125" />
                        </div>
                        <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-brand-neon-blue font-mono tracking-tighter">
                            MEDICONVOI<span className="text-brand-neon-pink">.AI</span>
                        </span>
                    </Link>
                    
                    <div className="hidden md:flex space-x-8 items-center text-sm font-bold text-slate-300 font-mono tracking-wide">
                        <a href="#expertises" className="hover:text-brand-neon-blue transition-colors hover:shadow-[0_0_10px_#00f3ff] duration-300">SYSTEMS</a>
                        <a href="#solutions" className="hover:text-brand-neon-blue transition-colors hover:shadow-[0_0_10px_#00f3ff] duration-300">NETWORKS</a>
                        <a href="#tarifs" className="hover:text-brand-neon-green transition-colors hover:shadow-[0_0_10px_#0aff0a] duration-300">CREDITS</a>
                    </div>

                    <button
                        onClick={() => navigate('/login')}
                        className="bg-brand-neon-blue/10 border border-brand-neon-blue/50 text-brand-neon-blue px-6 py-2 rounded-xl hover:bg-brand-neon-blue hover:text-black transition-all font-bold shadow-[0_0_10px_rgba(0,243,255,0.2)] hover:shadow-[0_0_20px_rgba(0,243,255,0.6)] backdrop-blur-md uppercase tracking-widest text-xs"
                    >
                        Pro Access //
                    </button>
                </div>
            </nav>

            {/* HERO SECTION - Cyberpunk / Space */}
            <section className="relative min-h-screen pt-32 pb-20 overflow-hidden bg-brand-bg flex items-center">
                {/* Background Grid & Effects */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(0,243,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,243,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_70%)]"></div>
                <div className="absolute inset-0 bg-gradient-to-b from-brand-bg via-transparent to-brand-bg"></div>
                
                {/* Neon Orbs */}
                <div className="absolute top-1/4 -left-20 w-[600px] h-[600px] bg-brand-neon-blue/20 rounded-full blur-[128px] animate-pulse"></div>
                <div className="absolute bottom-1/4 -right-20 w-[600px] h-[600px] bg-brand-neon-purple/20 rounded-full blur-[128px] animate-pulse-slow"></div>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full">
                    <div className="grid lg:grid-cols-2 gap-16 items-center">
                        <div className="space-y-8 animate-fade-in-up">
                            <div className="inline-flex items-center space-x-2 bg-brand-dark/80 backdrop-blur-md border border-brand-neon-green/30 rounded-full px-4 py-1.5 shadow-[0_0_15px_rgba(10,255,10,0.1)]">
                                <span className="flex h-2 w-2 relative">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-neon-green opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-neon-green shadow-[0_0_10px_#0aff0a]"></span>
                                </span>
                                <span className="text-brand-neon-green text-xs font-bold tracking-[0.2em] font-mono uppercase">System Online V3.2</span>
                            </div>

                            <h1 className="text-6xl lg:text-8xl font-black text-white leading-[0.9] tracking-tighter mix-blend-screen">
                                FUTURE <br/>
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-neon-blue via-brand-neon-purple to-brand-neon-pink animate-gradient-x">LOGISTICS</span>
                            </h1>

                            <p className="text-xl text-slate-400 leading-relaxed max-w-lg border-l-2 border-brand-neon-blue pl-6 font-mono">
                                <span className="text-brand-neon-blue">&gt;</span> Secure Medical Transport.<br/>
                                <span className="text-brand-neon-blue">&gt;</span> AI-Powered Routing.<br/>
                                <span className="text-brand-neon-blue">&gt;</span> Zero Emission Fleet.
                            </p>

                            <div className="flex flex-col sm:flex-row gap-4 pt-4">
                                <button onClick={() => setIsBookingModalOpen(true)} className="group relative px-8 py-4 bg-brand-neon-blue text-black rounded-sm font-bold skew-x-[-10deg] overflow-hidden transition-all hover:scale-[1.05] hover:shadow-[0_0_30px_#00f3ff] border border-transparent hover:border-white">
                                    <div className="absolute inset-0 w-full h-full bg-white opacity-0 group-hover:opacity-20 transition-opacity"></div>
                                    <span className="relative flex items-center justify-center skew-x-[10deg] tracking-widest uppercase">
                                        Initialize Order
                                        <ChevronRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                                    </span>
                                </button>
                                <button className="px-8 py-4 bg-transparent border border-white/20 text-white rounded-sm font-bold skew-x-[-10deg] hover:bg-white/5 hover:border-brand-neon-pink hover:text-brand-neon-pink transition-all flex items-center justify-center hover:shadow-[0_0_15px_rgba(255,0,255,0.4)]">
                                    <span className="skew-x-[10deg] tracking-widest uppercase">Explore Protocol</span>
                                </button>
                            </div>
                            
                            {/* HUD Stats */}
                            <div className="grid grid-cols-3 gap-8 pt-8 border-t border-white/10 font-mono">
                                <div>
                                    <div className="text-3xl font-bold text-white flex items-center"><Zap className="w-5 h-5 text-brand-neon-yellow mr-2" /> 24/7</div>
                                    <div className="text-xs text-brand-neon-blue uppercase tracking-wider">Uptime</div>
                                </div>
                                <div>
                                    <div className="text-3xl font-bold text-white">45m</div>
                                    <div className="text-xs text-brand-neon-blue uppercase tracking-wider">Latency</div>
                                </div>
                                <div>
                                    <div className="text-3xl font-bold text-white">100%</div>
                                    <div className="text-xs text-brand-neon-blue uppercase tracking-wider">Secure</div>
                                </div>
                            </div>
                        </div>

                        {/* Interactive UI Mockup - Holographic */}
                        <div className="relative hidden lg:block perspective-1000">
                             
                             {/* Hologram Base */}
                             <div className="absolute inset-x-10 bottom-0 h-4 bg-brand-neon-blue blur-xl opacity-50"></div>

                            <div className="relative bg-brand-dark/40 backdrop-blur-md border border-brand-neon-blue/30 p-6 rounded-none shadow-[0_0_50px_rgba(0,243,255,0.1)] transform transition-all duration-700 hover:rotate-0 rotate-1 hover:scale-[1.02] clip-path-polygon-[0_0,100%_0,100%_80%,90%_100%,0_100%] animate-hologram">
                                {/* Header Mockup */}
                                <div className="flex items-center justify-between mb-8 border-b border-brand-neon-blue/20 pb-4">
                                    <div className="flex items-center space-x-3">
                                        <Activity className="text-brand-neon-blue h-6 w-6 animate-pulse" />
                                        <div>
                                            <div className="text-white font-bold text-lg font-mono tracking-widest">LIVE_FEED</div>
                                            <div className="text-brand-neon-blue/60 text-xs font-mono">ID: #TR-8829-X</div>
                                        </div>
                                    </div>
                                    <div className="text-brand-neon-green font-mono text-xs animate-pulse">● CONNECTED</div>
                                </div>

                                {/* Map Visualization (Abstract) */}
                                <div className="h-48 bg-black/60 rounded-sm w-full mb-6 relative overflow-hidden group border border-white/5">
                                    <div className="absolute inset-0 bg-[linear-gradient(transparent_2px,rgba(0,243,255,0.1)_2px),linear-gradient(90deg,transparent_2px,rgba(0,243,255,0.1)_2px)] bg-[size:20px_20px]"></div>
                                    
                                    {/* HUD Elements */}
                                    <div className="absolute top-2 left-2 text-[10px] text-brand-neon-blue font-mono">LAT: 43.1235</div>
                                    <div className="absolute top-2 right-2 text-[10px] text-brand-neon-blue font-mono">LON: 5.9283</div>

                                    {/* Path Line */}
                                    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                                        <path d="M10,90 Q50,10 90,50" fill="none" stroke="#00f3ff" strokeWidth="1" strokeDasharray="2 2" className="animate-dash" />
                                        <circle cx="90" cy="50" r="2" fill="#ff00ff" className="animate-ping" />
                                    </svg>
                                    
                                    {/* Tooltip */}
                                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-black/80 backdrop-blur border border-brand-neon-blue/50 p-2 shadow-xl skew-x-[-10deg]">
                                        <div className="flex items-center space-x-2 text-brand-neon-blue text-xs font-mono skew-x-[10deg]">
                                            <Cpu className="h-3 w-3" />
                                            <span>TARGET_ACQUIRED</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Status Cards */}
                                <div className="space-y-3 font-mono text-xs">
                                    <div className="bg-white/5 p-3 flex items-center justify-between border-l-2 border-brand-neon-purple">
                                        <div className="flex items-center space-x-3">
                                            <Thermometer className="text-brand-neon-purple h-4 w-4" />
                                            <span className="text-slate-300">BIO_TEMP</span>
                                        </div>
                                        <span className="text-brand-neon-purple font-bold glow-text">+4.2°C</span>
                                    </div>
                                    <div className="bg-white/5 p-3 flex items-center justify-between border-l-2 border-brand-neon-blue">
                                        <div className="flex items-center space-x-3">
                                            <Clock className="text-brand-neon-blue h-4 w-4" />
                                            <span className="text-slate-300">ETA</span>
                                        </div>
                                        <span className="text-brand-neon-blue font-bold glow-text">14:52</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* EXPERTISES - Grid Cards */}
            <section id="expertises" className="py-32 relative bg-black/40">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center max-w-3xl mx-auto mb-20 animate-on-scroll">
                        <h2 className="text-xs font-bold text-brand-neon-blue tracking-[0.3em] font-mono uppercase mb-3">Core Modules</h2>
                        <h3 className="text-4xl font-black text-white mb-6 uppercase tracking-tight">System Capabilities</h3>
                        <p className="text-lg text-slate-400 font-light">
                            Advanced protocols designed for the most demanding medical environments.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {[
                            { 
                                icon: ShieldCheck, title: "DATA_SECURE", 
                                desc: "HDS Protocol active. End-to-end encryption and BPD compliance.", 
                                color: "neon-blue" 
                            },
                            { 
                                icon: Thermometer, title: "CRYO_STASIS", 
                                desc: "Active cooling monitoring. Real-time telemetry for temperature excursions.", 
                                color: "neon-purple" 
                            },
                            { 
                                icon: Radio, title: "RAPID_RESPONSE", 
                                desc: "Emergency vectoring < 45min for PSL and critical bio-assets.", 
                                color: "neon-pink" 
                            }
                        ].map((item, idx) => (
                            <div key={idx} className="group relative bg-[#0a0a1f] p-8 hover:bg-[#0f0f2d] transition-all duration-300 border border-white/5 hover:border-brand-neon-blue/50 overflow-hidden">
                                {/* Hover Effect */}
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-brand-neon-blue to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                
                                <div className={`h-12 w-12 bg-white/5 flex items-center justify-center mb-6 group-hover:bg-brand-${item.color} transition-all duration-300`}>
                                    <item.icon className={`h-6 w-6 text-brand-${item.color} group-hover:text-black transition-colors duration-300`} />
                                </div>
                                <h4 className="text-xl font-bold text-white mb-4 font-mono">{item.title}</h4>
                                <p className="text-slate-400 text-sm leading-relaxed">
                                    {item.desc}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* PRICING - Terminal Style */}
            <section id="tarifs" className="py-24 bg-brand-bg relative overflow-hidden">
                 <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent,rgba(0,243,255,0.05))]"></div>
                
                <div className="max-w-7xl mx-auto px-4 relative z-10">
                    <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-8 border-b border-white/10 pb-8">
                        <div>
                            <h2 className="text-3xl font-black text-white uppercase tracking-tighter mb-2"><span className="text-brand-neon-green">&gt;&gt;</span> Service_Credits</h2>
                            <p className="text-slate-500 font-mono">
                                Transparent pricing matrix. Optimized for efficiency.
                            </p>
                        </div>
                        <button className="text-brand-neon-green font-mono text-sm border border-brand-neon-green/30 px-4 py-2 hover:bg-brand-neon-green/10 transition-colors">
                            VIEW_FULL_MATRIX
                        </button>
                    </div>

                    <div className="grid md:grid-cols-4 gap-6">
                        {[
                            { title: 'STD_VECTOR', price: '15 €', sub: 'Single Run', desc: 'Pickup + Delivery (9km)', highlight: false },
                            { title: 'HYPER_LINK', price: '25 €', sub: 'Priority < 1h', desc: 'Direct Routing. Zero Latency.', highlight: true },
                            { title: 'WEEK_END', price: '30 €', sub: 'Sat / Sun', desc: 'Standby Unit Included', highlight: false },
                            { title: 'NIGHT_OPS', price: '50 €', sub: '20h - 08h', desc: 'Deep Night Intervention', highlight: false }
                        ].map((plan, i) => (
                            <button 
                                key={i}
                                onClick={() => setIsBookingModalOpen(true)}
                                className={`relative p-8 text-left transition-all duration-300 hover:transform hover:scale-105 group ${
                                    plan.highlight 
                                    ? 'bg-brand-neon-blue/10 border border-brand-neon-blue shadow-[0_0_20px_rgba(0,243,255,0.1)]' 
                                    : 'bg-white/2 border border-white/5 hover:border-white/20'
                                }`}
                            >
                                {plan.highlight && (
                                    <div className="absolute top-0 right-0 bg-brand-neon-blue text-black text-[10px] font-bold px-2 py-1 font-mono uppercase">
                                        Recommended
                                    </div>
                                )}
                                <h3 className={`text-lg font-bold mb-2 font-mono ${plan.highlight ? 'text-brand-neon-blue' : 'text-slate-300'}`}>{plan.title}</h3>
                                <div className="flex items-baseline mb-1">
                                    <span className={`text-4xl font-black ${plan.highlight ? 'text-white' : 'text-slate-200'}`}>{plan.price}</span>
                                </div>
                                <div className={`text-xs font-mono uppercase tracking-widest mb-6 ${plan.highlight ? 'text-brand-neon-blue/80' : 'text-slate-500'}`}>{plan.sub}</div>
                                <p className={`text-sm leading-relaxed ${plan.highlight ? 'text-slate-300' : 'text-slate-500'}`}>
                                    {plan.desc}
                                </p>
                                
                                <div className={`mt-4 w-full h-[1px] ${plan.highlight ? 'bg-brand-neon-blue/50' : 'bg-white/10'} group-hover:w-1/2 transition-all duration-500`}></div>
                            </button>
                        ))}
                    </div>
                </div>
            </section>

            {/* FOOTER - System Info */}
            <footer className="bg-black py-12 border-t border-white/10 font-mono text-xs">
                <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center text-slate-600">
                    <div className="flex items-center space-x-2 mb-4 md:mb-0">
                         <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span>SYSTEM STATUS: OPERATIONAL</span>
                    </div>
                    <div className="flex space-x-8">
                        <span className="cursor-pointer hover:text-brand-neon-blue">LEGAL_PROTOCOLS</span>
                        <span className="cursor-pointer hover:text-brand-neon-blue">PRIVACY_CORE</span>
                        <span className="cursor-pointer hover:text-brand-neon-blue">COMMS_LINK</span>
                    </div>
                    <div className="mt-4 md:mt-0 opacity-50">
                        MEDICONVOI V3.1.2 // 2026
                    </div>
                </div>
            </footer>
        </div>
    )
}
