import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { Mail, ArrowRight, CheckCircle, Loader2 } from 'lucide-react'

export default function Login() {
    const [email, setEmail] = useState('')
    const [loading, setLoading] = useState(false)
    const [sent, setSent] = useState(false)
    const [error, setError] = useState(null)

    const handleLogin = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        try {
            // Magic Link Login
            const { error } = await supabase.auth.signInWithOtp({
                email,
                options: {
                    emailRedirectTo: window.location.origin + '/dashboard',
                },
            })
            if (error) throw error
            setSent(true)
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    if (sent) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4 font-sans">
                <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-gray-100 animate-fade-in-up">
                    <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
                        <CheckCircle size={32} />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Vérifiez vos emails !</h2>
                    <p className="text-gray-600 mb-6">
                        Nous avons envoyé un lien magique à <strong>{email}</strong>.
                        <br />
                        Cliquez dessus pour vous connecter instantanément.
                    </p>
                    <button
                        onClick={() => setSent(false)}
                        className="text-primary font-medium hover:underline text-sm"
                    >
                        Recommencer avec une autre adresse
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50 p-4 font-sans">
            <div className="bg-white p-10 rounded-3xl shadow-2xl max-w-md w-full border border-white/50 backdrop-blur-sm transition-all duration-300 hover:shadow-3xl">
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary mb-2 tracking-tight">
                        EL Services
                    </h1>
                    <p className="text-gray-500 font-medium tracking-wide text-sm uppercase">Espace Client</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-6">
                    <div>
                        <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2 pl-1">
                            Adresse Email
                        </label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-primary transition-colors duration-200">
                                <Mail size={20} />
                            </div>
                            <input
                                id="email"
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="block w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all duration-200 placeholder-gray-400 font-medium text-gray-800"
                                placeholder="nom@exemple.com"
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="p-4 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100 flex items-center animate-pulse">
                            <p>{error}</p>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-primary to-secondary hover:opacity-95 text-white font-bold py-4 rounded-xl shadow-lg hover:shadow-primary/30 transition-all duration-300 flex items-center justify-center gap-2 transform active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <Loader2 className="animate-spin" size={24} />
                        ) : (
                            <>
                                Recevoir mon lien d'accès <ArrowRight size={20} />
                            </>
                        )}
                    </button>
                </form>

                <div className="mt-8 text-center text-xs text-gray-400">
                    <p>© {new Date().getFullYear()} EL Services Global</p>
                </div>
            </div>
        </div>
    )
}
