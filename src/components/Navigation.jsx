import { Link, useLocation } from 'react-router-dom'
import { loadSiteText } from '@/content/siteText'
import { useDarkMode } from '../context/DarkModeContext'
import { Sun, Moon } from 'lucide-react'
import './Navigation.css'

function Navigation() {
  const location = useLocation()
  const { isDark, toggleDarkMode } = useDarkMode()

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

        {/* Dark Mode Toggle */}
        <button
          className="dark-mode-toggle"
          onClick={toggleDarkMode}
          title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          aria-label="Toggle dark mode"
        >
          {isDark ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        {/* Login button hidden as requested */}

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
