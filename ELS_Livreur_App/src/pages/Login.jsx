import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useNavigate } from 'react-router-dom'
import { Truck } from 'lucide-react'

export default function Login() {
    const [email, setEmail] = useState('')
    const [loading, setLoading] = useState(false)
    const navigate = useNavigate()

    const handleLogin = async (e) => {
        e.preventDefault()
        setLoading(true)
        const { error } = await supabase.auth.signInWithOtp({ email })
        if (error) {
            alert(error.error_description || error.message)
        } else {
            alert('Lien de connexion envoyé !')
        }
        setLoading(false)
    }

    const handleDevLogin = () => {
        navigate('/app/tournees')
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 px-4">
            <div className="mb-8 flex flex-col items-center">
                <div className="bg-brand-600 p-4 rounded-full shadow-lg mb-4">
                    <Truck className="h-10 w-10 text-white" />
                </div>
                <h1 className="text-2xl font-bold text-slate-900">ELS Delivery</h1>
                <p className="text-slate-500">Application Chauffeur V2</p>
            </div>

            <div className="w-full max-w-sm bg-white p-8 rounded-xl shadow-lg border border-slate-100">
                <h2 className="text-xl font-semibold mb-6 text-slate-800">Connexion</h2>
                <form onSubmit={handleLogin} className="space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Email professionnel</label>
                        <input
                            type="email"
                            placeholder="chauffeur@els-group.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="block w-full rounded-lg border-slate-300 border p-3 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition"
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-brand-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-brand-700 disabled:opacity-50 transition-all shadow-md active:scale-95"
                    >
                        {loading ? 'Envoi du lien...' : 'Recevoir le lien magique'}
                    </button>
                </form>

                <div className="mt-8 pt-6 border-t border-slate-100 text-center">
                    <p className="text-xs text-slate-400 mb-4">Mode Développement</p>
                    <button
                        onClick={handleDevLogin}
                        className="text-sm font-medium text-slate-600 hover:text-brand-600 transition-colors"
                    >
                        Entrer sans authentification &rarr;
                    </button>
                </div>
            </div>
        </div>
    )
}
