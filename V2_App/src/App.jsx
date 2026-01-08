import { Routes, Route } from 'react-router-dom'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import AdminDashboard from './pages/AdminDashboard'
import Landing from './pages/Landing'
import PublicBooking from './pages/PublicBooking'
import DeliveryTour from './pages/DeliveryTour'
import DeliveryStop from './pages/DeliveryStop'
import DeliveryReport from './pages/DeliveryReport'
import Legal from './pages/Legal'
import SuperAdmin from './pages/SuperAdmin'
import Chatbot from './components/Chatbot/Chatbot'
import { CookieBanner } from './components/CookieBanner'


function App() {
  return (
    <>
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/legal" element={<Legal />} />
      <Route path="/login" element={<Login />} />
      <Route path="/booking" element={<PublicBooking />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/admin" element={<AdminDashboard />} />
      <Route path="/supervision" element={<SuperAdmin />} />

      {/* Delivery App Routes */}
      <Route path="/delivery" element={<DeliveryTour />} />
      <Route path="/delivery/:stopId" element={<DeliveryStop />} />
      <Route path="/delivery/report/:tourId" element={<DeliveryReport />} />
    </Routes>
    <Chatbot />
    <CookieBanner />
    </>
  )
}

export default App
