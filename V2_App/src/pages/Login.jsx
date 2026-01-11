import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useNavigate } from 'react-router-dom'
import { Truck, Mail, Lock, Loader2, ArrowRight } from 'lucide-react'
import logo from '../assets/logo.png'

export default function Login() {
    const [loading, setLoading] = useState(false)
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('') // We might use Magic Link, but let's prep for password too or just Magic Link.
    // User asked for "Login (Email + Magic Link)" in the plan.
    const [passwordMode, setPasswordMode] = useState(false)
    const [message, setMessage] = useState(null)
    const navigate = useNavigate()

    useEffect(() => {
        // Check if user is already logged in
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) navigate('/dashboard')
        })
    }, [navigate])

    const handleLogin = async (e) => {
        e.preventDefault()
        setLoading(true)
        setMessage(null)

        if (passwordMode) {
            // Password Login
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            })

            if (error) {
                setMessage({ type: 'error', text: error.message })
                setLoading(false)
            } else {
                // Success leads to redirect via onAuthStateChange or just manual check,
                // but usually the useEffect above will catch the session change or the promise resolves with data.
                // We can manually navigate or wait for the listener.
                navigate('/dashboard')
            }
        } else {
            // Magic Link Login
            const { error } = await supabase.auth.signInWithOtp({
                email,
                options: {
                    emailRedirectTo: window.location.origin + '/dashboard',
                },
            })

            if (error) {
                console.error("Supabase Error:", error);
                setMessage({ type: 'error', text: error.message || "Une erreur est survenue." })
            } else {
                setMessage({ type: 'success', text: 'Lien de connexion envoyé ! Vérifiez votre boîte mail.' })
            }
            setLoading(false)
        }
    }

    return (
        <div className="flex min-h-screen w-full bg-[#0f172a] text-white font-sans overflow-hidden relative">
            {/* Background Elements */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[120px] pointer-events-none"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/20 rounded-full blur-[120px] pointer-events-none"></div>

            <div className="flex flex-col items-center justify-center w-full px-4 z-10">

                <div className="w-full max-w-md bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl animate-fade-in-up">

                    <div className="flex flex-col items-center mb-8">
                        <img src={logo} alt="Mediconvoi" className="h-20 w-auto mb-4" />
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                            Mediconvoi
                        </h1>
                        <p className="text-gray-400 text-sm mt-2">Accédez à votre espace livraison</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-300 ml-1">Email Professionnel</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Mail className="h-5 w-5 text-gray-500 group-focus-within:text-blue-500 transition-colors" />
                                </div>
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="block w-full pl-10 pr-3 py-3 border border-gray-700 rounded-xl leading-5 bg-gray-900/50 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                                    placeholder="nom@entreprise.com"
                                />
                            </div>
                        </div>

                        {passwordMode && (
                            <div className="space-y-2 animate-fade-in">
                                <label className="text-sm font-medium text-gray-300 ml-1">Mot de passe</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Lock className="h-5 w-5 text-gray-500 group-focus-within:text-blue-500 transition-colors" />
                                    </div>
                                    <input
                                        type="password"
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="block w-full pl-10 pr-3 py-3 border border-gray-700 rounded-xl leading-5 bg-gray-900/50 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-full text-sm font-bold text-white bg-gradient-to-r from-brand-purple to-brand-blue hover:from-brand-purple hover:to-brand-blue/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-purple shadow-lg shadow-brand-purple/40 transform transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <Loader2 className="animate-spin h-5 w-5" />
                            ) : (
                                <>
                                    {passwordMode ? 'Se connecter' : 'Recevoir mon lien magique'} <ArrowRight className="ml-2 h-4 w-4" />
                                </>
                            )}
                        </button>

                        <div className="flex justify-center">
                            <button
                                type="button"
                                onClick={() => {
                                    setPasswordMode(!passwordMode)
                                    setMessage(null)
                                }}
                                className="text-xs text-gray-400 hover:text-white underline underline-offset-2 transition-colors"
                            >
                                {passwordMode ? 'Utiliser un lien magique (sans mot de passe)' : 'Je préfère utiliser mon mot de passe'}
                            </button>
                        </div>
                    </form>

                    {message && (
                        <div className={`mt-6 p-4 rounded-xl flex items-start space-x-3 text-sm animate-fade-in ${message.type === 'error' ? 'bg-red-500/10 border border-red-500/20 text-red-200' : 'bg-green-500/10 border border-green-500/20 text-green-200'}`}>
                            <span>{message.text}</span>
                        </div>
                    )}

                    <div className="mt-8 text-center">
                        <p className="text-xs text-gray-500">
                            En vous connectant, vous acceptez nos <a href="#" className="underline hover:text-gray-300">CGU</a> et notre <a href="#" className="underline hover:text-gray-300">Politique de confidentialité</a>.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
