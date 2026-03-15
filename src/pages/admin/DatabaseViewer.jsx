import { useState, useEffect } from 'react'
import './Management.css'

function DatabaseViewer() {
  const [databaseData, setDatabaseData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [expandedKeys, setExpandedKeys] = useState({})

  useEffect(() => {
    fetchDatabaseData()
  }, [])

  const fetchDatabaseData = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch('/api/admin-data/all')
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`)
      }
      const data = await res.json()
      setDatabaseData(data.rows || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const toggleExpand = (key) => {
    setExpandedKeys(prev => ({
      ...prev,
      [key]: !prev[key]
    }))
  }

  const formatValue = (value) => {
    try {
      const parsed = JSON.parse(value)
      return JSON.stringify(parsed, null, 2)
    } catch {
      return value
    }
  }

  const getValuePreview = (value) => {
    try {
      const parsed = JSON.parse(value)
      const str = JSON.stringify(parsed)
      return str.length > 100 ? str.substring(0, 100) + '...' : str
    } catch {
      return value.length > 100 ? value.substring(0, 100) + '...' : value
    }
  }

  const getDataType = (key) => {
    const typeMap = {
      'bioContent': 'Bio Content',
      'latestWorkPosts': 'Latest Work Posts',
      'siteText': 'Site Text',
      'personalData': 'Personal Data',
      'clients': 'Clients',
      'categories': 'Categories'
    }
    return typeMap[key] || key
  }

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
    alert('Copied to clipboard!')
  }

  const downloadData = (key, value) => {
    const blob = new Blob([value], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${key}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="management-section">
      <div className="section-header">
        <h2>🗄️ Database Viewer</h2>
        <button className="btn-primary" onClick={fetchDatabaseData}>
          🔄 Refresh Data
        </button>
      </div>

      {loading && (
        <div className="loading-state">Loading database data...</div>
      )}

      {error && (
        <div className="error-state" style={{
          padding: '1rem',
          background: '#fee',
          border: '1px solid #fcc',
          borderRadius: '8px',
          marginBottom: '1rem',
          color: '#c00'
        }}>
          <strong>Error:</strong> {error}
          <p style={{ marginTop: '0.5rem', fontSize: '0.875rem' }}>
            Make sure the server is running and the database is accessible.
          </p>
        </div>
      )}

      {!loading && !error && databaseData.length === 0 && (
        <div className="empty-state" style={{
          padding: '2rem',
          textAlign: 'center',
          color: '#666'
        }}>
          <p>No data found in database.</p>
        </div>
      )}

      {!loading && !error && databaseData.length > 0 && (
        <div className="database-table" style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem'
        }}>
          {databaseData.map((row, index) => {
            const isExpanded = expandedKeys[row.key]
            const formattedValue = formatValue(row.value)
            const isJSON = !isNaN(formattedValue.length)

            return (
              <div
                key={index}
                className="database-row"
                style={{
                  background: '#fff',
                  border: '1px solid #e0e0e0',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                }}
              >
                <div
                  className="database-row-header"
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '1rem',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    cursor: 'pointer'
                  }}
                  onClick={() => toggleExpand(row.key)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{
                      fontSize: '1.25rem',
                      transition: 'transform 0.2s',
                      transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)'
                    }}>
                      ▶
                    </span>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 600 }}>
                        {getDataType(row.key)}
                      </h3>
                      <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.75rem', opacity: 0.9 }}>
                        Key: <code>{row.key}</code>
                      </p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        copyToClipboard(row.value)
                      }}
                      style={{
                        padding: '0.5rem 0.75rem',
                        background: 'rgba(255,255,255,0.2)',
                        border: '1px solid rgba(255,255,255,0.3)',
                        borderRadius: '4px',
                        color: 'white',
                        cursor: 'pointer',
                        fontSize: '0.75rem',
                        backdropFilter: 'blur(4px)'
                      }}
                    >
                      📋 Copy
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        downloadData(row.key, row.value)
                      }}
                      style={{
                        padding: '0.5rem 0.75rem',
                        background: 'rgba(255,255,255,0.2)',
                        border: '1px solid rgba(255,255,255,0.3)',
                        borderRadius: '4px',
                        color: 'white',
                        cursor: 'pointer',
                        fontSize: '0.75rem',
                        backdropFilter: 'blur(4px)'
                      }}
                    >
                      ⬇️ Download
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div
                    className="database-row-content"
                    style={{
                      padding: '1rem',
                      background: '#f8f9fa',
                      borderTop: '1px solid #e0e0e0'
                    }}
                  >
                    <div style={{
                      marginBottom: '0.75rem',
                      fontSize: '0.875rem',
                      color: '#666'
                    }}>
                      <strong>Preview:</strong> {getValuePreview(row.value)}
                    </div>
                    <pre
                      style={{
                        background: '#1e1e1e',
                        color: '#d4d4d4',
                        padding: '1rem',
                        borderRadius: '6px',
                        overflow: 'auto',
                        fontSize: '0.8125rem',
                        lineHeight: '1.5',
                        maxHeight: '500px',
                        margin: 0
                      }}
                    >
                      {isJSON ? formattedValue : row.value}
                    </pre>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Connection Info */}
      <div className="connection-info" style={{
        marginTop: '2rem',
        padding: '1rem',
        background: '#f0f4f8',
        borderRadius: '8px',
        fontSize: '0.875rem'
      }}>
        <h4 style={{ margin: '0 0 0.5rem 0', color: '#333' }}>📡 Database Connection</h4>
        <p style={{ margin: 0, color: '#666' }}>
          Viewing data from: <strong>{window.location.hostname === 'localhost' ? 'Local Development' : 'Production'}</strong>
        </p>
        <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.75rem', color: '#888' }}>
          Data is stored in the PostgreSQL database and persists across sessions.
        </p>
      </div>
    </div>
  )
}

export default DatabaseViewer
