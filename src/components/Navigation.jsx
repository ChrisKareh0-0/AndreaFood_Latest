import { Link, useLocation } from 'react-router-dom'
import { Moon, Sun } from 'lucide-react'
import { loadSiteText } from '@/content/siteText'
import { useDarkMode } from '../context/DarkModeContext'
import './Navigation.css'

function Navigation() {
  const location = useLocation()
  const { isDarkMode, toggleDarkMode } = useDarkMode()

  const siteText = loadSiteText()

  const navItems = [
    { label: siteText.navigation.home, path: '/' },
    { label: siteText.navigation.journey, path: '#journey' },
    { label: siteText.navigation.clients, path: '#clients' },
    { label: siteText.navigation.myWork, path: '#my-work' },
    { label: siteText.navigation.creativeServices, path: '#services' },
    { label: siteText.navigation.letsConnect, path: '#contact' }
  ]

  const handleSmoothScroll = (e, path) => {
    if (path.startsWith('#')) {
      e.preventDefault()
      const element = document.querySelector(path === '#journey' ? '.about-section' :
                                            path === '#clients' ? '.clients-section' :
                                            path === '#my-work' ? '.my-work-section' :
                                            path === '#services' ? '.services-section' :
                                            path === '#contact' ? '.contact-section' : '')
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' })
      }
    }
  }

  return (
    <nav className="navigation">
      <div className="nav-container">
        <ul className="nav-menu">
          {navItems.map((item, index) => (
            <li key={index} className="nav-item">
              {item.path.startsWith('#') ? (
                <a
                  href={item.path}
                  className={`nav-link ${location.hash === item.path ? 'active' : ''}`}
                  onClick={(e) => handleSmoothScroll(e, item.path)}
                >
                  {item.label}
                </a>
              ) : (
                <Link
                  to={item.path}
                  className={`nav-link ${location.pathname === item.path ? 'active' : ''}`}
                >
                  {item.label}
                </Link>
              )}
            </li>
          ))}
        </ul>

        <Link to="/login" className="nav-link login-btn-floating">
          {siteText.navigation.login}
        </Link>

        <button
          className="dark-mode-toggle"
          onClick={toggleDarkMode}
          aria-label="Toggle dark mode"
        >
          {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        <div className="mobile-menu-icon">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
    </nav>
  )
}

export default Navigation
