import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './Login.css'
import { loadSiteText } from '@/content/siteText'

function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const siteText = loadSiteText()

  const handleSubmit = (e) => {
    e.preventDefault()

    // Simple authentication - in production, this should be handled by a backend
    if (username === 'admin' && password === 'admin123') {
      localStorage.setItem('isAuthenticated', 'true')
      navigate('/admin')
    } else {
      setError(siteText.login.invalidCredentials)
      setTimeout(() => setError(''), 3000)
    }
  }

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-card">
          <div className="login-header">
            <div className="login-logo">
              <div className="login-logo-icon">A</div>
            </div>
            <h1 className="login-title">{siteText.login.title}</h1>
            <p className="login-subtitle">{siteText.login.subtitle}</p>
          </div>

          <form className="login-form" onSubmit={handleSubmit}>
            {error && (
              <div className="login-error">
                <span>{error}</span>
              </div>
            )}

            <div className="form-group">
              <label htmlFor="username">{siteText.login.usernameLabel}</label>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={siteText.login.usernamePlaceholder}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">{siteText.login.passwordLabel}</label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={siteText.login.passwordPlaceholder}
                required
              />
            </div>

            <button type="submit" className="login-btn">
              {siteText.login.submitLabel}
            </button>

            <div className="login-footer">
              <p>{siteText.login.defaultCredentialsNote}</p>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default Login
