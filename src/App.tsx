import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { Suspense, lazy } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import ErrorBoundary from './components/ErrorBoundary'
import { CookieBanner } from './components/CookieBanner'

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
const Admin = lazy(() => import('./pages/Admin'))

function LoadingScreen() {
  return (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{ background: 'linear-gradient(160deg, #1E3A5F 0%, #142943 100%)' }}
    >
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
          maskImage: 'radial-gradient(ellipse at center, black 40%, transparent 75%)',
          WebkitMaskImage: 'radial-gradient(ellipse at center, black 40%, transparent 75%)',
        }}
      />
      <div className="flex flex-col items-center gap-6 relative">
        <span
          style={{
            fontFamily: "'Fraunces', Georgia, serif",
            fontWeight: 600,
            fontSize: 36,
            color: 'white',
            letterSpacing: '-0.02em',
          }}
        >
          devira
        </span>
        <div style={{ width: 96, height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.15)', overflow: 'hidden' }}>
          <div className="devira-loading-bar" style={{ height: '100%', width: '35%', borderRadius: 2, background: '#E87722' }} />
        </div>
      </div>
    </div>
  )
}

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <LoadingScreen />
  if (!user) return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} replace />
  return <>{children}</>
}

function SmartHome() {
  const { user, loading } = useAuth()
  if (loading) return <LoadingScreen />
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

        <Route path="/home" element={<Landing />} />

        <Route path="/onboarding" element={<PrivateRoute><Onboarding /></PrivateRoute>} />
        <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/nouveau-devis" element={<PrivateRoute><NouveauDevis /></PrivateRoute>} />
        <Route path="/devis/:id" element={<PrivateRoute><DevisDetail /></PrivateRoute>} />
        <Route path="/clients" element={<PrivateRoute><Clients /></PrivateRoute>} />
        <Route path="/factures" element={<PrivateRoute><Factures /></PrivateRoute>} />
        <Route path="/parametres" element={<PrivateRoute><Parametres /></PrivateRoute>} />
        <Route path="/catalogue" element={<PrivateRoute><Catalogue /></PrivateRoute>} />
        <Route path="/admin" element={<PrivateRoute><Admin /></PrivateRoute>} />

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
          <CookieBanner />
        </AuthProvider>
      </ErrorBoundary>
    </BrowserRouter>
  )
}

export default App
