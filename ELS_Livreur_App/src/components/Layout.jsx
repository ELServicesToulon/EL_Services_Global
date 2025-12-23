import { Outlet } from 'react-router-dom'

export default function Layout() {
    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            <header className="bg-white shadow-sm p-4 sticky top-0 z-10 flex justify-between items-center">
                <h1 className="text-xl font-bold text-slate-800 tracking-tight">ELS <span className="text-brand-600">Livreur</span></h1>
                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" title="Online"></div>
            </header>
            <main className="flex-1 p-4 max-w-md mx-auto w-full pb-20">
                <Outlet />
            </main>
        </div>
    )
}
