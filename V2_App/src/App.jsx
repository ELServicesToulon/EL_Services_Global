import { Routes, Route } from 'react-router-dom'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import AdminDashboard from './pages/AdminDashboard'
import Landing from './pages/Landing'
import PublicBooking from './pages/PublicBooking'
import DeliveryTour from './pages/DeliveryTour'
import DeliveryStop from './pages/DeliveryStop'
import DeliveryReport from './pages/DeliveryReport'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/booking" element={<PublicBooking />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/admin" element={<AdminDashboard />} />

      {/* Delivery App Routes */}
      <Route path="/delivery" element={<DeliveryTour />} />
      <Route path="/delivery/:stopId" element={<DeliveryStop />} />
      <Route path="/delivery/report/:tourId" element={<DeliveryReport />} />
    </Routes>
  )
}

export default App
