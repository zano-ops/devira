import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Suspense, lazy } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import ErrorBoundary from './components/ErrorBoundary'

const Login = lazy(() => import('./pages/Login'))
const Signup = lazy(() => import('./pages/Signup'))
const Onboarding = lazy(() => import('./pages/Onboarding'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const NouveauDevis = lazy(() => import('./pages/NouveauDevis'))
const DevisDetail = lazy(() => import('./pages/DevisDetail'))
const Parametres = lazy(() => import('./pages/Parametres'))
const Clients = lazy(() => import('./pages/Clients'))
const Factures = lazy(() => import('./pages/Factures'))
const Catalogue = lazy(() => import('./pages/Catalogue'))
const PublicDevis = lazy(() => import('./pages/PublicDevis'))
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'))
const ResetPassword = lazy(() => import('./pages/ResetPassword'))
const Landing = lazy(() => import('./pages/Landing'))
const CGV = lazy(() => import('./pages/CGV'))
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'))
const NotFound = lazy(() => import('./pages/NotFound'))
const AuthCallback = lazy(() => import('./pages/AuthCallback'))

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#1E3A5F' }}>
      <div className="flex flex-col items-center gap-4">
        <span className="text-5xl">📋</span>
        <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    </div>
  )
}

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

function SmartHome() {
  const { user, loading } = useAuth()
  if (loading) return null
  if (user) return <Navigate to="/dashboard" replace />
  return <Landing />
}

function AppRoutes() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
        <Route path="/" element={<SmartHome />} />

        <Route path="/sign/:id" element={<PublicDevis />} />
        <Route path="/signer/:quoteNumber" element={<PublicDevis />} />

        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/cgv" element={<CGV />} />
        <Route path="/confidentialite" element={<PrivacyPolicy />} />

        <Route path="/onboarding" element={<PrivateRoute><Onboarding /></PrivateRoute>} />
        <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/nouveau-devis" element={<PrivateRoute><NouveauDevis /></PrivateRoute>} />
        <Route path="/devis/:id" element={<PrivateRoute><DevisDetail /></PrivateRoute>} />
        <Route path="/clients" element={<PrivateRoute><Clients /></PrivateRoute>} />
        <Route path="/factures" element={<PrivateRoute><Factures /></PrivateRoute>} />
        <Route path="/parametres" element={<PrivateRoute><Parametres /></PrivateRoute>} />
        <Route path="/catalogue" element={<PrivateRoute><Catalogue /></PrivateRoute>} />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  )
}

function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </ErrorBoundary>
    </BrowserRouter>
  )
}

export default App
