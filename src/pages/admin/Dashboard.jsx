import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import PictureManagement from './PictureManagement'
import PersonalDataManagement from './PersonalDataManagement'
import BioManagement from './BioManagement'
import ClientManagement from './ClientManagement'
import CategoryManagement from './CategoryManagement'
import APITest from './APITest.jsx'
import ClientsAPITest from './ClientsAPITest.jsx'
import './Dashboard.css'

function Dashboard() {
  const [activeSection, setActiveSection] = useState('overview')
  const navigate = useNavigate()

  useEffect(() => {
    const isAuthenticated = localStorage.getItem('isAuthenticated')
    if (!isAuthenticated) {
      navigate('/login')
    }
  }, [navigate])

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
    { id: 'api-test', label: 'API Test', icon: '🧪' },
    { id: 'clients-api', label: 'Clients API', icon: '🔗' }
  ]

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
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-icon">🖼️</div>
                  <div className="stat-info">
                    <h3>Total Pictures</h3>
                    <p className="stat-number">24</p>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">🤝</div>
                  <div className="stat-info">
                    <h3>Total Clients</h3>
                    <p className="stat-number">15</p>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">🏷️</div>
                  <div className="stat-info">
                    <h3>Categories</h3>
                    <p className="stat-number">8</p>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">📊</div>
                  <div className="stat-info">
                    <h3>Total Projects</h3>
                    <p className="stat-number">32</p>
                  </div>
                </div>
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
          {activeSection === 'api-test' && <APITest />}
          {activeSection === 'clients-api' && <ClientsAPITest />}
        </div>
      </main>
    </div>
  )
}

export default Dashboard
