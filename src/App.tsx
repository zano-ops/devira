import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Onboarding from './pages/Onboarding'
import Dashboard from './pages/Dashboard'
import NouveauDevis from './pages/NouveauDevis'
import DevisDetail from './pages/DevisDetail'
import Parametres from './pages/Parametres'
import Clients from './pages/Clients'
import Factures from './pages/Factures'
import Catalogue from './pages/Catalogue'
import PublicDevis from './pages/PublicDevis'

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#1E3A5F' }}>
        <div className="flex flex-col items-center gap-4">
          <span className="text-5xl">📋</span>
          <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin" />
        </div>
      </div>
    )
  }
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

function AppRoutes() {
  return (
    <Routes>
      {/* Routes publiques (sans auth) */}
      <Route path="/sign/:id" element={<PublicDevis />} />

      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/onboarding" element={<PrivateRoute><Onboarding /></PrivateRoute>} />
      <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
      <Route path="/nouveau-devis" element={<PrivateRoute><NouveauDevis /></PrivateRoute>} />
      <Route path="/devis/:id" element={<PrivateRoute><DevisDetail /></PrivateRoute>} />
      <Route path="/clients" element={<PrivateRoute><Clients /></PrivateRoute>} />
      <Route path="/factures" element={<PrivateRoute><Factures /></PrivateRoute>} />
      <Route path="/parametres" element={<PrivateRoute><Parametres /></PrivateRoute>} />
      <Route path="/catalogue" element={<PrivateRoute><Catalogue /></PrivateRoute>} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
