import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './context/AuthContext'
import { ProtectedRoute, AdminRoute } from './components/ProtectedRoute'
import { DashboardLayout, AdminLayout } from './components/DashboardLayout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import ServantList from './pages/ServantList'
import AppRegistrationList from './pages/AppRegistrationList'
import OnboardServant from './pages/OnboardServant'
import ServantDetail from './pages/ServantDetail'
import EditServant from './pages/EditServant'
import AgentProfile from './pages/AgentProfile'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminUsers from './pages/admin/AdminUsers'
import AdminBookings from './pages/admin/AdminBookings'
import AdminServants from './pages/admin/AdminServants'
import AdminSkills from './pages/admin/AdminSkills'
import AdminAgents from './pages/admin/AdminAgents'

const qc = new QueryClient()

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/"
              element={
                <ProtectedRoute roles={['COORDINATOR', 'ADMIN']}>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="registrations" element={<AppRegistrationList />} />
              <Route path="caregivers" element={<ServantList />} />
              <Route path="caregivers/new" element={<OnboardServant />} />
              <Route path="caregivers/:id" element={<ServantDetail />} />
              <Route path="caregivers/:id/edit" element={<EditServant />} />
              <Route path="profile" element={<AgentProfile />} />
            </Route>
            <Route
              path="/admin"
              element={
                <AdminRoute>
                  <AdminLayout />
                </AdminRoute>
              }
            >
              <Route index element={<AdminDashboard />} />
              <Route path="agents" element={<AdminAgents />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="bookings" element={<AdminBookings />} />
              <Route path="caregivers" element={<AdminServants />} />
              <Route path="skills" element={<AdminSkills />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}
