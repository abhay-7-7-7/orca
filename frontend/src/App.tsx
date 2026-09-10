import { Routes, Route, useLocation, Navigate, Link } from 'react-router-dom'
import { useEffect } from 'react'
import { ShieldAlert } from 'lucide-react'
import Landing from './pages/Landing'
import MapDashboard from './pages/MapDashboard'
import Chat from './pages/Chat'
import AdminSOS from './pages/AdminSOS'
import Auth from './pages/Auth'
import Profile from './pages/Profile'
import Navbar from './components/common/Navbar'
import FloatingChatButton from './components/common/FloatingChatButton'
import ChatOverlay from './components/chatbot/ChatOverlay'
import { useHealthStore } from './store/healthStore'
import { useAuthStore } from './store/authStore'

function AdminGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, profile } = useAuthStore()

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: { pathname: '/admin/sos' } }} replace />
  }

  if (profile?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-cream-100 flex items-center justify-center p-4 font-sans pt-20">
        <div className="max-w-md w-full bg-white p-8 rounded-2xl border border-cream-300 text-center shadow-xs space-y-4">
          <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h2 className="font-serif font-bold text-xl text-charcoal-900">
            Access Restricted
          </h2>
          <p className="text-xs text-charcoal-600 leading-relaxed">
            The Maritime Distress Response Queue and SAR Dispatch terminal is strictly restricted to Coast Guard Watchstanders and System Administrators.
          </p>
          <div className="p-2.5 bg-cream-100 rounded-xl text-[11px] text-charcoal-700">
            Current role: <strong className="text-charcoal-950 capitalize">{profile?.role || 'skipper'}</strong>
          </div>
          <div className="flex gap-2 pt-1">
            <Link
              to="/"
              className="flex-1 py-2 px-3 rounded-lg border border-cream-300 text-charcoal-700 text-xs font-semibold hover:bg-cream-100 no-underline"
            >
              Return to Home
            </Link>
            <Link
              to="/login"
              className="flex-1 py-2 px-3 rounded-lg bg-charcoal-900 text-cream-50 text-xs font-semibold hover:bg-charcoal-800 no-underline"
            >
              Admin Sign In
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

function App() {
  const fetchHealth = useHealthStore((s) => s.fetchHealth)
  const initSession = useAuthStore((s) => s.initSession)
  const location = useLocation()
  const isChatPage = location.pathname === '/chat'

  useEffect(() => {
    fetchHealth()
    initSession()
    const interval = setInterval(fetchHealth, 30000)
    return () => clearInterval(interval)
  }, [fetchHealth, initSession])

  return (
    <div className="min-h-screen bg-cream-100">
      <Navbar />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/map" element={<MapDashboard />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/login" element={<Auth />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/profile" element={<Profile />} />
        <Route
          path="/admin"
          element={
            <AdminGuard>
              <AdminSOS />
            </AdminGuard>
          }
        />
        <Route
          path="/admin/sos"
          element={
            <AdminGuard>
              <AdminSOS />
            </AdminGuard>
          }
        />
      </Routes>
      {!isChatPage && <FloatingChatButton />}
      {!isChatPage && <ChatOverlay />}
    </div>
  )
}


export default App


