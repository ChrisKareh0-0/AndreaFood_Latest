import { useState, useEffect } from 'react'
import './Management.css'
import { useToast } from '../../hooks/useToast'
import { ToastContainer } from '../../components/Toast'
import { buildMediaFolder, extractMediaFolderFromUrl, uploadMediaFile, uploadMediaFiles } from '@/lib/mediaUpload'
import { isVideoUrl } from '@/lib/mediaPreview'

function ClientManagement() {
  const { toasts, showToast, removeToast } = useToast()
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  // Fetch clients from backend on mount
  useEffect(() => {
    const fetchClients = async () => {
      try {
        const res = await fetch('/api/clients?includeMedia=true')
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
    images: [],
    categories: [],
    description: ''
  })

  const handleAdd = () => {
    setEditingClient(null)
    setFormData({ name: '', logo: '', images: [], categories: [], description: '' })
    setShowModal(true)
  }

  const handleEdit = (client) => {
    setEditingClient(client)
    setFormData({
      name: client.name || '',
      logo: client.logo || '',
      images: client.images || [],
      categories: client.categories || [],
      description: client.description || ''
    })
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

  const getClientFolder = () => {
    const existingFolder = [
      formData.logo,
      ...(Array.isArray(formData.images) ? formData.images : []),
      editingClient?.thumbnailUrl,
      editingClient?.logo,
      ...(Array.isArray(editingClient?.images) ? editingClient.images : [])
    ]
      .map((value) => extractMediaFolderFromUrl(value))
      .find(Boolean)

    if (existingFolder) {
      return existingFolder
    }

    const folder = buildMediaFolder(formData.name || editingClient?.name)
    return folder === 'unknown' ? '' : folder
  }

  const handleFileUpload = async (e, field) => {
    const file = e.target.files[0]
    e.target.value = ''

    if (!file) {
      return
    }

    const clientFolder = getClientFolder()
    if (!clientFolder) {
      showToast('Enter a client name before uploading media.', 'error')
      return
    }

    try {
      const result = await uploadMediaFile(file, clientFolder)
      setFormData(prev => ({ ...prev, [field]: result.url }))
    } catch (err) {
      showToast(err.message || 'Failed to upload media', 'error')
    }
  }

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files || [])
    e.target.value = ''

    if (files.length === 0) {
      return
    }

    const clientFolder = getClientFolder()
    if (!clientFolder) {
      showToast('Enter a client name before uploading gallery media.', 'error')
      return
    }

    try {
      const uploadedFiles = await uploadMediaFiles(files, clientFolder)
      setFormData(prev => ({
        ...prev,
        images: [...prev.images, ...uploadedFiles.map(file => file.url)]
      }))
    } catch (err) {
      showToast(err.message || 'Failed to upload gallery media', 'error')
    }
  }

  const handleRemoveImage = (index) => {
    setFormData({ ...formData, images: formData.images.filter((_, i) => i !== index) })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const payload = {
      ...formData,
      images: Array.isArray(formData.images) ? formData.images.filter(Boolean) : []
    }

    if (editingClient) {
      // Update existing client using PUT endpoint
      try {
        const res = await fetch(`/api/clients/${editingClient.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
        const data = await res.json()
        if (data.success) {
          setClients(clients.map(c => c.id === editingClient.id ? data.client : c))
          showToast('Client updated successfully!', 'success')
        } else {
          showToast(data.error || 'Failed to update client', 'error')
        }
      } catch (err) {
        showToast('Failed to update client', 'error')
      }
    } else {
      // Add new client
      try {
        const res = await fetch('/api/clients/add', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
        const data = await res.json()
        if (data.success) {
          setClients([...clients, data.client])
          showToast('Client added successfully!', 'success')
        } else {
          showToast(data.error || 'Failed to add client', 'error')
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
                <label>Logo (for MyWork section)</label>
                <input
                  type="text"
                  value={formData.logo}
                  onChange={(e) => setFormData({ ...formData, logo: e.target.value })}
                  placeholder="Enter logo image URL"
                />
                <div className="file-upload-container" style={{ marginTop: '0.5rem' }}>
                  <label className="file-upload-btn" style={{ fontSize: '0.875rem', padding: '0.5rem 0.75rem' }}>
                    📁 Upload Logo Image
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e, 'logo')}
                      style={{ display: 'none' }}
                    />
                  </label>
                  {formData.logo && (
                    <div className="image-preview" style={{ marginTop: '0.5rem', maxWidth: '200px' }}>
                      <img src={formData.logo} alt="Logo preview" style={{ width: '100%', borderRadius: '8px' }} />
                    </div>
                  )}
                </div>
              </div>
              <div className="form-group">
                <label>Gallery Media (Images & Videos for Gallery section, multiple allowed)</label>
                <p style={{ fontSize: '0.75rem', color: '#666', marginBottom: '0.5rem' }}>
                  Upload multiple images and/or videos for this client to appear in the gallery section. Supports: .jpg, .png, .gif, .mp4, .webm, .mov
                </p>
                <div className="file-upload-container" style={{ marginTop: '0.5rem' }}>
                  <label className="file-upload-btn" style={{ fontSize: '0.875rem', padding: '0.5rem 0.75rem' }}>
                    📁 Upload Gallery Media
                    <input
                      type="file"
                      accept="image/*,video/*"
                      multiple
                      onChange={handleImageUpload}
                      style={{ display: 'none' }}
                    />
                  </label>
                </div>
                {formData.images && formData.images.length > 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginTop: '0.75rem' }}>
                    {formData.images.map((img, idx) => (
                      <div key={idx} style={{ position: 'relative' }}>
                        {isVideoUrl(img) ? (
                          <video src={img} style={{ width: '100%', borderRadius: '8px' }} controls />
                        ) : (
                          <img src={img} alt={`Gallery ${idx + 1}`} style={{ width: '100%', borderRadius: '8px' }} />
                        )}
                        <span style={{
                          position: 'absolute',
                          top: '4px',
                          left: '4px',
                          background: 'rgba(0,0,0,0.7)',
                          color: 'white',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontSize: '10px'
                        }}>
                          {isVideoUrl(img) ? '🎥' : '🖼️'}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(idx)}
                          style={{
                            position: 'absolute',
                            top: '2px',
                            right: '2px',
                            background: 'rgba(255,0,0,0.8)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '50%',
                            width: '20px',
                            height: '20px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
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
