import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import AdminLayout from './components/AdminLayout'
import AppLayout from './components/AppLayout'
import ProtectedRoute from './components/ProtectedRoute'
import AdminTenantDetailPage from './pages/AdminTenantDetailPage'
import AdminTenantNewPage from './pages/AdminTenantNewPage'
import AdminTenantsPage from './pages/AdminTenantsPage'
import CitiesPage from './pages/CitiesPage'
import CostsPage from './pages/CostsPage'
import DashboardPage from './pages/DashboardPage'
import DriversPage from './pages/DriversPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import LoginPage from './pages/LoginPage'
import ServicesPage from './pages/ServicesPage'
import SettingsPage from './pages/SettingsPage'
import TrackServicePage from './pages/TrackServicePage'
import { getSession, homePath } from './lib/auth'

function DefaultRedirect() {
  const session = getSession()
  return <Navigate to={session ? homePath(session) : '/login'} replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/s/:token" element={<TrackServicePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route
          element={
            <ProtectedRoute role="platform_admin">
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/admin" element={<AdminTenantsPage />} />
          <Route path="/admin/nuevo" element={<AdminTenantNewPage />} />
          <Route path="/admin/:tenantId" element={<AdminTenantDetailPage />} />
        </Route>
        <Route
          element={
            <ProtectedRoute role="operator">
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
        <Route path="/" element={<DefaultRedirect />} />
        <Route path="*" element={<DefaultRedirect />} />
      </Routes>
    </BrowserRouter>
  )
}
