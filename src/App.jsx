import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom'
import Navigation from './components/Navigation'
import Home from './pages/Home'
import Login from './pages/Login'
import Dashboard from './pages/admin/Dashboard'
import { DarkModeProvider } from './context/DarkModeContext'
import './App.css'

function AppContent() {
  const location = useLocation()
  const hideNav = location.pathname.startsWith('/admin') || location.pathname === '/login'

  return (
    <>
      {!hideNav && <Navigation />}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/admin" element={<Dashboard />} />
      </Routes>
    </>
  )
}

function App() {
  return (
    <Router>
      <DarkModeProvider>
        <div className="App">
          <AppContent />
        </div>
      </DarkModeProvider>
    </Router>
  )
}

export default App
