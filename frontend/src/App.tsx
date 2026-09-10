import { Routes, Route } from 'react-router-dom'
import { useEffect } from 'react'
import Landing from './pages/Landing'
import MapDashboard from './pages/MapDashboard'
import Chat from './pages/Chat'
import Navbar from './components/common/Navbar'
import FloatingChatButton from './components/common/FloatingChatButton'
import ChatOverlay from './components/chatbot/ChatOverlay'
import { useHealthStore } from './store/healthStore'

function App() {
  const fetchHealth = useHealthStore((s) => s.fetchHealth)

  useEffect(() => {
    fetchHealth()
    const interval = setInterval(fetchHealth, 30000)
    return () => clearInterval(interval)
  }, [fetchHealth])

  return (
    <div className="min-h-screen bg-cream-100">
      <Navbar />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/map" element={<MapDashboard />} />
        <Route path="/chat" element={<Chat />} />
      </Routes>
      <FloatingChatButton />
      <ChatOverlay />
    </div>
  )
}

export default App
