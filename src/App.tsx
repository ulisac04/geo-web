import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import AppLayout from './components/AppLayout'
import ProtectedRoute from './components/ProtectedRoute'
import CitiesPage from './pages/CitiesPage'
import CostsPage from './pages/CostsPage'
import DashboardPage from './pages/DashboardPage'
import DriversPage from './pages/DriversPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import LoginPage from './pages/LoginPage'
import ServicesPage from './pages/ServicesPage'
import SettingsPage from './pages/SettingsPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/ciudades" element={<CitiesPage />} />
          <Route path="/conductores" element={<DriversPage />} />
          <Route path="/servicios" element={<ServicesPage />} />
          <Route path="/costos" element={<CostsPage />} />
          <Route path="/configuracion" element={<SettingsPage />} />
        </Route>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
