import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import PictureManagement from './PictureManagement'
import PersonalDataManagement from './PersonalDataManagement'
import BioManagement from './BioManagement'
import ClientManagement from './ClientManagement'
import CategoryManagement from './CategoryManagement'
import APITest from './APITest.jsx'
import ClientsAPITest from './ClientsAPITest.jsx'
import DatabaseViewer from './DatabaseViewer'
import './Dashboard.css'

function Dashboard() {
  const [activeSection, setActiveSection] = useState('overview')
  const [overviewStats, setOverviewStats] = useState({
    totalClients: 0,
    clientsWithMedia: 0,
    clientsWithoutMedia: 0,
    totalImages: 0,
    totalVideos: 0,
    totalMedia: 0,
    totalCategories: 0,
  })
  const [statsLoading, setStatsLoading] = useState(true)
  const [statsError, setStatsError] = useState('')
  const [statsUpdatedAt, setStatsUpdatedAt] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    const isAuthenticated = localStorage.getItem('isAuthenticated')
    if (!isAuthenticated) {
      navigate('/login')
    }
  }, [navigate])

  useEffect(() => {
    let cancelled = false

    async function fetchOverviewStats() {
      try {
        if (!cancelled) {
          setStatsLoading(true)
          setStatsError('')
        }

        const res = await fetch('/api/admin/stats')
        if (!res.ok) {
          throw new Error(`Failed to load stats (${res.status})`)
        }

        const data = await res.json()
        const stats = data?.stats || {}

        if (cancelled) return

        setOverviewStats({
          totalClients: Number(stats.totalClients || 0),
          clientsWithMedia: Number(stats.clientsWithMedia || 0),
          clientsWithoutMedia: Number(stats.clientsWithoutMedia || 0),
          totalImages: Number(stats.totalImages || 0),
          totalVideos: Number(stats.totalVideos || 0),
          totalMedia: Number(stats.totalMedia || 0),
          totalCategories: Number(stats.totalCategories || 0),
        })
        setStatsUpdatedAt(typeof data?.timestamp === 'string' ? data.timestamp : '')
      } catch (error) {
        if (!cancelled) {
          setStatsError(error.message || 'Failed to load overview stats')
        }
      } finally {
        if (!cancelled) {
          setStatsLoading(false)
        }
      }
    }

    fetchOverviewStats()
    const interval = setInterval(fetchOverviewStats, 60000)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('isAuthenticated')
    navigate('/login')
  }

  const menuItems = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'pictures', label: 'Pictures', icon: '🖼️' },
    { id: 'personal-data', label: 'Personal Data', icon: '👤' },
    { id: 'bio', label: 'Bio & Content', icon: '📝' },
    { id: 'clients', label: 'Clients', icon: '🤝' },
    { id: 'categories', label: 'Categories', icon: '🏷️' },
    { id: 'database', label: 'Database', icon: '🗄️' },
    { id: 'api-test', label: 'API Test', icon: '🧪' },
    { id: 'clients-api', label: 'Clients API', icon: '🔗' }
  ]

  const statsCards = [
    { key: 'totalClients', icon: '🤝', label: 'Total Clients', value: overviewStats.totalClients },
    { key: 'totalMedia', icon: '🗂️', label: 'Total Media Items', value: overviewStats.totalMedia },
    { key: 'totalImages', icon: '🖼️', label: 'Total Images', value: overviewStats.totalImages },
    { key: 'totalVideos', icon: '🎬', label: 'Total Videos', value: overviewStats.totalVideos },
    { key: 'clientsWithMedia', icon: '✅', label: 'Clients With Media', value: overviewStats.clientsWithMedia },
    { key: 'totalCategories', icon: '🏷️', label: 'Categories', value: overviewStats.totalCategories },
  ]

  const formatNumber = (value) => Number(value || 0).toLocaleString()

  return (
    <div className="admin-dashboard">
      <aside className="admin-sidebar">
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <div className="sidebar-logo-icon">A</div>
            <div className="sidebar-logo-text">
              <span>Andrea</span>
              <small>Admin Panel</small>
            </div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {menuItems.map((item) => (
            <button
              key={item.id}
              className={`nav-btn ${activeSection === item.id ? 'active' : ''}`}
              onClick={() => setActiveSection(item.id)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button className="logout-btn" onClick={handleLogout}>
            <span className="nav-icon">🚪</span>
            <span>Logout</span>
          </button>
        </div>
      </aside>

      <main className="admin-main">
        <header className="admin-header">
          <h1 className="admin-title">
            {menuItems.find(item => item.id === activeSection)?.label || 'Dashboard'}
          </h1>
          <div className="admin-user">
            <div className="user-avatar">A</div>
            <div className="user-info">
              <span className="user-name">Admin</span>
              <span className="user-role">Administrator</span>
            </div>
          </div>
        </header>

        <div className="admin-content">
          {activeSection === 'overview' && (
            <div className="overview-section">
              <h2 className="section-title">Welcome to Andrea's Portfolio Admin</h2>
              {statsError && (
                <p className="stats-error">
                  {statsError}
                </p>
              )}
              <p className="stats-meta">
                {statsLoading
                  ? 'Refreshing live database stats...'
                  : statsUpdatedAt
                    ? `Last updated: ${new Date(statsUpdatedAt).toLocaleString()}`
                    : 'Live database stats loaded'}
              </p>
              <div className="stats-grid">
                {statsCards.map((card) => (
                  <div className="stat-card" key={card.key}>
                    <div className="stat-icon">{card.icon}</div>
                    <div className="stat-info">
                      <h3>{card.label}</h3>
                      <p className="stat-number">{formatNumber(card.value)}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="quick-actions">
                <h3>Quick Actions</h3>
                <div className="action-buttons">
                  <button className="action-btn" onClick={() => setActiveSection('pictures')}>
                    <span>📷</span>
                    Add New Picture
                  </button>
                  <button className="action-btn" onClick={() => setActiveSection('clients')}>
                    <span>➕</span>
                    Add New Client
                  </button>
                  <button className="action-btn" onClick={() => setActiveSection('bio')}>
                    <span>✏️</span>
                    Update Bio
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'pictures' && <PictureManagement />}
          {activeSection === 'personal-data' && <PersonalDataManagement />}
          {activeSection === 'bio' && <BioManagement />}
          {activeSection === 'clients' && <ClientManagement />}
          {activeSection === 'categories' && <CategoryManagement />}
          {activeSection === 'database' && <DatabaseViewer />}
          {activeSection === 'api-test' && <APITest />}
          {activeSection === 'clients-api' && <ClientsAPITest />}
        </div>
      </main>
    </div>
  )
}

export default Dashboard
