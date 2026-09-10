import { Routes, Route, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
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
        <Route path="/admin" element={<AdminSOS />} />
        <Route path="/admin/sos" element={<AdminSOS />} />
      </Routes>
      {!isChatPage && <FloatingChatButton />}
      {!isChatPage && <ChatOverlay />}
    </div>
  )
}

export default App


