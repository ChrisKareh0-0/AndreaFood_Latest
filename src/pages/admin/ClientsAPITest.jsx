import { useState } from 'react'
import './Management.css'

function ClientsAPITest() {
  const [response, setResponse] = useState(null)
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Form for adding a client
  const [newName, setNewName] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [newLogo, setNewLogo] = useState('')
  const [newCategories, setNewCategories] = useState([])
  const [deleteId, setDeleteId] = useState('')

  const allCategories = ['TVC', 'Photoshoot', 'Commercial', 'Editorial', 'Social Media']

  const sendRequest = async (url, method, body) => {
    setLoading(true)
    setError('')
    setResponse(null)
    setStatus(null)
    try {
      const options = { method, headers: { 'Content-Type': 'application/json' } }
      if (body) options.body = JSON.stringify(body)
      const res = await fetch(url, options)
      setStatus(res.status)
      const json = await res.json()
      setResponse(JSON.stringify(json, null, 2))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleGetAll = () => sendRequest('/api/clients', 'GET')

  const handleAddClient = () => {
    if (!newName.trim()) { setError('Client name is required'); return }
    sendRequest('/api/clients/add', 'POST', {
      name: newName,
      description: newDescription,
      logo: newLogo,
      categories: newCategories
    })
    setNewName('')
    setNewDescription('')
    setNewLogo('')
    setNewCategories([])
  }

  const handleDeleteClient = () => {
    if (!deleteId.trim()) { setError('Enter a client ID to delete'); return }
    sendRequest(`/api/clients/${deleteId}`, 'DELETE')
    setDeleteId('')
  }

  const toggleCategory = (cat) => {
    setNewCategories(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    )
  }

  const cardStyle = {
    background: 'white',
    border: '1px solid #e0e0e0',
    borderRadius: '12px',
    padding: '1.5rem',
    marginBottom: '1.5rem',
  }

  const btnStyle = (bg) => ({
    padding: '0.6rem 1.5rem',
    background: bg,
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: '0.85rem',
  })

  const inputStyle = {
    width: '100%',
    padding: '0.5rem 0.75rem',
    borderRadius: '8px',
    border: '1px solid #d1d5db',
    fontSize: '0.85rem',
    boxSizing: 'border-box',
    marginBottom: '0.75rem',
  }

  return (
    <div style={{ padding: 0 }}>
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ margin: '0 0 0.5rem 0' }}>🧪 Clients API Test</h2>
        <p style={{ color: '#6b7b8c', margin: 0 }}>
          Test all client-related API endpoints. Data is stored in the Railway PostgreSQL database.
        </p>
      </div>

      {/* GET All Clients */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <div>
            <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1rem' }}>📥 Get All Clients</h3>
            <code style={{ fontSize: '0.75rem', color: '#6b7b8c' }}>GET /api/clients</code>
          </div>
          <button onClick={handleGetAll} disabled={loading} style={btnStyle('#4a7ba7')}>
            {loading ? '⏳...' : 'Fetch Clients'}
          </button>
        </div>
      </div>

      {/* Add Client */}
      <div style={cardStyle}>
        <h3 style={{ margin: '0 0 0.75rem 0', fontSize: '1rem' }}>➕ Add New Client</h3>
        <code style={{ fontSize: '0.75rem', color: '#6b7b8c', display: 'block', marginBottom: '1rem' }}>POST /api/clients/add</code>

        <label style={{ fontWeight: 600, fontSize: '0.8rem', display: 'block', marginBottom: '0.25rem' }}>Name *</label>
        <input
          type="text"
          value={newName}
          onChange={e => setNewName(e.target.value)}
          placeholder="Client name"
          style={inputStyle}
        />

        <label style={{ fontWeight: 600, fontSize: '0.8rem', display: 'block', marginBottom: '0.25rem' }}>Description</label>
        <input
          type="text"
          value={newDescription}
          onChange={e => setNewDescription(e.target.value)}
          placeholder="Client description"
          style={inputStyle}
        />

        <label style={{ fontWeight: 600, fontSize: '0.8rem', display: 'block', marginBottom: '0.25rem' }}>Logo URL</label>
        <input
          type="text"
          value={newLogo}
          onChange={e => setNewLogo(e.target.value)}
          placeholder="https://example.com/logo.png"
          style={inputStyle}
        />

        <label style={{ fontWeight: 600, fontSize: '0.8rem', display: 'block', marginBottom: '0.5rem' }}>Categories</label>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          {allCategories.map(cat => (
            <button
              key={cat}
              onClick={() => toggleCategory(cat)}
              style={{
                padding: '0.35rem 0.8rem',
                borderRadius: '999px',
                border: newCategories.includes(cat) ? '2px solid #4a7ba7' : '1px solid #d1d5db',
                background: newCategories.includes(cat) ? '#eef4fb' : 'white',
                color: newCategories.includes(cat) ? '#4a7ba7' : '#6b7b8c',
                fontWeight: 600,
                fontSize: '0.75rem',
                cursor: 'pointer',
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        <button onClick={handleAddClient} disabled={loading} style={btnStyle('#16a34a')}>
          {loading ? '⏳...' : '➕ Add Client'}
        </button>
      </div>

      {/* Delete Client */}
      <div style={cardStyle}>
        <h3 style={{ margin: '0 0 0.75rem 0', fontSize: '1rem' }}>🗑️ Delete Client</h3>
        <code style={{ fontSize: '0.75rem', color: '#6b7b8c', display: 'block', marginBottom: '1rem' }}>DELETE /api/clients/:id</code>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <input
            type="text"
            value={deleteId}
            onChange={e => setDeleteId(e.target.value)}
            placeholder="Client ID (from fetch results)"
            style={{ ...inputStyle, marginBottom: 0, flex: 1 }}
          />
          <button onClick={handleDeleteClient} disabled={loading} style={btnStyle('#dc2626')}>
            {loading ? '⏳...' : '🗑️ Delete'}
          </button>
        </div>
      </div>

      {/* Response */}
      {(response || error) && (
        <div style={{
          background: error ? '#fef2f2' : '#f0fdf4',
          border: `1px solid ${error ? '#fecaca' : '#bbf7d0'}`,
          borderRadius: '12px',
          padding: '1.5rem',
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
                color: status >= 200 && status < 300 ? '#065f46' : status >= 400 ? '#991b1b' : '#92400e',
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
              margin: 0,
            }}>{response}</pre>
          )}
        </div>
      )}
    </div>
  )
}

export default ClientsAPITest
