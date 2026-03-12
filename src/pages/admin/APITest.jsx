import { useState } from 'react'
import './Management.css'

const API_KEYS = [
  { key: 'health', label: 'Health Check', description: 'Check if the backend and database are reachable', endpoint: '/api/health' },
  { key: 'all', label: 'All Admin Data', description: 'Fetch all keys and values stored in the database', endpoint: '/api/admin-data' },
  { key: 'bioContent', label: 'Bio Content', description: 'About title, paragraphs, services description, contact info' },
  { key: 'siteText', label: 'Site Text', description: 'All UI strings — navigation, home page, footer, login' },
  { key: 'latestWorkPosts', label: 'Latest Work Posts', description: 'Array of work posts with id, title, excerpt, imageUrl' },
  { key: 'personalData', label: 'Personal Data (localStorage)', description: 'Name, email, phone, social links, hero/profile images', localStorage: true },
]

function APITest() {
  const [endpoint, setEndpoint] = useState('/api/admin-data/bioContent')
  const [method, setMethod] = useState('GET')
  const [body, setBody] = useState('')
  const [response, setResponse] = useState(null)
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [activeKey, setActiveKey] = useState('bioContent')

  const sendRequest = async (url, reqMethod, reqBody) => {
    setLoading(true)
    setError('')
    setResponse(null)
    setStatus(null)
    try {
      const options = {
        method: reqMethod,
        headers: { 'Content-Type': 'application/json' },
      }
      if (reqMethod !== 'GET' && reqBody) {
        options.body = reqBody
      }
      const res = await fetch(url, options)
      setStatus(res.status)
      const text = await res.text()
      try {
        const json = JSON.parse(text)
        setResponse(JSON.stringify(json, null, 2))
      } catch {
        setResponse(text)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleTest = () => sendRequest(endpoint, method, body)

  const handleQuickGet = (key) => {
    const apiDef = API_KEYS.find(a => a.key === key)
    setActiveKey(key)
    if (apiDef?.localStorage) {
      setLoading(true)
      setError('')
      setStatus(null)
      const data = localStorage.getItem(key)
      if (data) {
        try {
          setResponse(JSON.stringify(JSON.parse(data), null, 2))
        } catch {
          setResponse(data)
        }
        setStatus(200)
      } else {
        setResponse(null)
        setError(`No data found in localStorage for key "${key}"`)
      }
      setLoading(false)
      return
    }
    const url = apiDef?.endpoint || `/api/admin-data/${key}`
    setEndpoint(url)
    setMethod('GET')
    setBody('')
    sendRequest(url, 'GET', '')
  }

  const handleQuickPost = (key) => {
    const apiDef = API_KEYS.find(a => a.key === key)
    setActiveKey(key)
    if (apiDef?.localStorage) {
      setError('POST not supported for localStorage-only keys. Use the admin panel to update.')
      return
    }
    const url = '/api/admin-data'
    setEndpoint(url)
    setMethod('POST')
    const sampleBody = JSON.stringify({ key, value: {} }, null, 2)
    setBody(sampleBody)
    setResponse(null)
    setStatus(null)
    setError('')
  }

  return (
    <div className="api-test-container" style={{ padding: '0' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ margin: '0 0 0.5rem 0' }}>🧪 API Test Tool</h2>
        <p style={{ color: '#6b7b8c', margin: 0 }}>
          Test all backend API endpoints and inspect JSON responses from the Railway database.
        </p>
      </div>

      {/* Quick Access Buttons */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: '1rem',
        marginBottom: '2rem'
      }}>
        {API_KEYS.map((api) => (
          <div key={api.key} style={{
            background: activeKey === api.key ? '#eef4fb' : 'white',
            border: activeKey === api.key ? '2px solid #4a7ba7' : '1px solid #e0e0e0',
            borderRadius: '12px',
            padding: '1.25rem',
            transition: 'all 0.2s ease'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <strong style={{ fontSize: '0.95rem' }}>{api.label}</strong>
              {api.localStorage && (
                <span style={{
                  background: '#fef3c7',
                  color: '#92400e',
                  fontSize: '0.7rem',
                  padding: '2px 8px',
                  borderRadius: '999px',
                  fontWeight: 600
                }}>localStorage</span>
              )}
              {api.endpoint && (
                <span style={{
                  background: '#ede9fe',
                  color: '#5b21b6',
                  fontSize: '0.7rem',
                  padding: '2px 8px',
                  borderRadius: '999px',
                  fontWeight: 600
                }}>System</span>
              )}
              {!api.localStorage && !api.endpoint && (
                <span style={{
                  background: '#d1fae5',
                  color: '#065f46',
                  fontSize: '0.7rem',
                  padding: '2px 8px',
                  borderRadius: '999px',
                  fontWeight: 600
                }}>Database</span>
              )}
            </div>
            <p style={{ color: '#6b7b8c', fontSize: '0.8rem', margin: '0 0 0.75rem 0' }}>{api.description}</p>
            <code style={{
              display: 'block',
              background: '#f3f4f6',
              padding: '0.4rem 0.6rem',
              borderRadius: '6px',
              fontSize: '0.75rem',
              color: '#374151',
              marginBottom: '0.75rem',
              wordBreak: 'break-all'
            }}>
              {api.localStorage ? `localStorage.getItem("${api.key}")` : api.endpoint || `GET /api/admin-data/${api.key}`}
            </code>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={() => handleQuickGet(api.key)}
                disabled={loading}
                style={{
                  flex: 1,
                  padding: '0.5rem',
                  background: '#4a7ba7',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.8rem'
                }}
              >
                📥 GET
              </button>
              {!api.localStorage && (
                <button
                  onClick={() => handleQuickPost(api.key)}
                  disabled={loading}
                  style={{
                    flex: 1,
                    padding: '0.5rem',
                    background: '#d97706',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '0.8rem'
                  }}
                >
                  📤 POST
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Custom Request */}
      <div style={{
        background: 'white',
        border: '1px solid #e0e0e0',
        borderRadius: '12px',
        padding: '1.5rem',
        marginBottom: '1.5rem'
      }}>
        <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem' }}>Custom Request</h3>
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
          <select
            value={method}
            onChange={e => setMethod(e.target.value)}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              border: '1px solid #d1d5db',
              fontWeight: 600,
              fontSize: '0.85rem',
              background: method === 'GET' ? '#d1fae5' : method === 'POST' ? '#fef3c7' : '#fee2e2',
              minWidth: '100px'
            }}
          >
            <option value="GET">GET</option>
            <option value="POST">POST</option>
            <option value="PUT">PUT</option>
            <option value="DELETE">DELETE</option>
          </select>
          <input
            type="text"
            value={endpoint}
            onChange={e => setEndpoint(e.target.value)}
            placeholder="/api/admin-data/key"
            style={{
              flex: 1,
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              border: '1px solid #d1d5db',
              fontSize: '0.85rem',
              fontFamily: 'monospace',
              minWidth: '200px'
            }}
          />
          <button
            onClick={handleTest}
            disabled={loading}
            style={{
              padding: '0.5rem 1.5rem',
              background: '#4a7ba7',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.85rem'
            }}
          >
            {loading ? '⏳ Sending...' : '🚀 Send'}
          </button>
        </div>
        {method !== 'GET' && (
          <div>
            <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600, fontSize: '0.85rem' }}>
              Request Body (JSON):
            </label>
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              rows={6}
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '8px',
                border: '1px solid #d1d5db',
                fontFamily: 'monospace',
                fontSize: '0.8rem',
                resize: 'vertical',
                boxSizing: 'border-box'
              }}
            />
          </div>
        )}
      </div>

      {/* Response */}
      {(response || error) && (
        <div style={{
          background: error ? '#fef2f2' : '#f0fdf4',
          border: `1px solid ${error ? '#fecaca' : '#bbf7d0'}`,
          borderRadius: '12px',
          padding: '1.5rem',
          marginBottom: '1.5rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <h3 style={{ margin: 0, fontSize: '1rem' }}>
              {error ? '❌ Error' : '✅ Response'}
            </h3>
            {status && (
              <span style={{
                padding: '4px 12px',
                borderRadius: '999px',
                fontSize: '0.75rem',
                fontWeight: 700,
                background: status >= 200 && status < 300 ? '#d1fae5' : status >= 400 ? '#fee2e2' : '#fef3c7',
                color: status >= 200 && status < 300 ? '#065f46' : status >= 400 ? '#991b1b' : '#92400e'
              }}>
                Status: {status}
              </span>
            )}
          </div>
          {error && <p style={{ color: '#dc2626', margin: 0, fontFamily: 'monospace', fontSize: '0.85rem' }}>{error}</p>}
          {response && (
            <pre style={{
              background: '#1e293b',
              color: '#e2e8f0',
              padding: '1rem',
              borderRadius: '8px',
              overflow: 'auto',
              maxHeight: '500px',
              fontSize: '0.8rem',
              lineHeight: '1.5',
              margin: 0
            }}>{response}</pre>
          )}
        </div>
      )}
    </div>
  )
}

export default APITest
