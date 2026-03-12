import { useState, useEffect } from 'react'
import './Management.css'
import { useToast } from '../../hooks/useToast'
import { ToastContainer } from '../../components/Toast'

function ClientManagement() {
  const { toasts, showToast, removeToast } = useToast()
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  // Fetch clients from backend on mount
  useEffect(() => {
    const fetchClients = async () => {
      try {
        const res = await fetch('/api/clients')
        const data = await res.json()
        setClients(data.clients || [])
      } catch (err) {
        showToast('Failed to load clients', 'error')
      } finally {
        setLoading(false)
      }
    }
    fetchClients()
  }, [])

  const [categories] = useState(['TVC', 'Photoshoot', 'Commercial', 'Editorial', 'Social Media'])
  const [showModal, setShowModal] = useState(false)
  const [editingClient, setEditingClient] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    logo: '',
    categories: [],
    description: ''
  })

  const handleAdd = () => {
    setEditingClient(null)
    setFormData({ name: '', logo: '', categories: [], description: '' })
    setShowModal(true)
  }

  const handleEdit = (client) => {
    setEditingClient(client)
    setFormData(client)
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this client?')) return
    try {
      const res = await fetch(`/api/clients/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        setClients(clients.filter(c => c.id !== id))
        showToast('Client deleted successfully', 'success')
      } else {
        showToast('Failed to delete client', 'error')
      }
    } catch (err) {
      showToast('Failed to delete client', 'error')
    }
  }

  const handleCategoryToggle = (category) => {
    const newCategories = formData.categories.includes(category)
      ? formData.categories.filter(c => c !== category)
      : [...formData.categories, category]
    setFormData({ ...formData, categories: newCategories })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (editingClient) {
      // For now, treat as delete+add (no PATCH endpoint)
      try {
        // Delete old client
        await fetch(`/api/clients/${editingClient.id}`, { method: 'DELETE' })
        // Add new client
        const res = await fetch('/api/clients/add', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        })
        const data = await res.json()
        if (data.success) {
          setClients(clients.map(c => c.id === editingClient.id ? data.client : c))
          showToast('Client updated successfully!', 'success')
        } else {
          showToast('Failed to update client', 'error')
        }
      } catch (err) {
        showToast('Failed to update client', 'error')
      }
    } else {
      try {
        const res = await fetch('/api/clients/add', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        })
        const data = await res.json()
        if (data.success) {
          setClients([...clients, data.client])
          showToast('Client added successfully!', 'success')
        } else {
          showToast('Failed to add client', 'error')
        }
      } catch (err) {
        showToast('Failed to add client', 'error')
      }
    }
    setShowModal(false)
  }

  return (
    <div className="management-section">
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      <div className="section-header">
        <h2>Client Management</h2>
        <button className="btn-primary" onClick={handleAdd}>
          <span>➕</span>
          Add New Client
        </button>
      </div>

      <div className="clients-list">
        {loading ? (
          <div>Loading clients...</div>
        ) : clients.length === 0 ? (
          <div>No clients found.</div>
        ) : (
          clients.map((client) => (
            <div key={client.id} className="client-item">
              <div className="client-logo">
                {client.logo ? (
                  <img src={client.logo} alt={client.name} />
                ) : (
                  <div className="placeholder">👤</div>
                )}
              </div>
              <div className="client-info">
                <h3>{client.name}</h3>
                <div className="client-categories">
                  {client.categories.map((cat, idx) => (
                    <span key={idx} className="badge">{cat}</span>
                  ))}
                </div>
                <p>{client.description}</p>
              </div>
              <div className="client-actions">
                <button className="btn-edit" onClick={() => handleEdit(client)}>
                  ✏️ Edit
                </button>
                <button className="btn-delete" onClick={() => handleDelete(client.id)}>
                  🗑️ Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingClient ? 'Edit Client' : 'Add New Client'}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Client Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Logo URL</label>
                <input
                  type="text"
                  value={formData.logo}
                  onChange={(e) => setFormData({ ...formData, logo: e.target.value })}
                  placeholder="Enter logo URL"
                />
              </div>
              <div className="form-group">
                <label>Categories</label>
                <div className="checkbox-group">
                  {categories.map((category) => (
                    <label key={category} className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={formData.categories.includes(category)}
                        onChange={() => handleCategoryToggle(category)}
                      />
                      <span>{category}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows="4"
                ></textarea>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {editingClient ? 'Update' : 'Add'} Client
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default ClientManagement
