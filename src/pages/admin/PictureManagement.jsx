import { useState, useEffect } from 'react'
import './Management.css'
import { useToast } from '../../hooks/useToast'
import { ToastContainer } from '../../components/Toast'

function PictureManagement() {
  const { toasts, showToast, removeToast } = useToast()
  const [pictures, setPictures] = useState([])
  const [loading, setLoading] = useState(true)
  // Fetch pictures from backend on mount
  useEffect(() => {
    const fetchPictures = async () => {
      try {
        const res = await fetch('/api/admin-data/pictures')
        if (res.ok) {
          const data = await res.json()
          setPictures(Array.isArray(data.value) ? data.value : [])
        } else {
          setPictures([])
        }
      } catch (err) {
        showToast('Failed to load pictures', 'error')
      } finally {
        setLoading(false)
      }
    }
    fetchPictures()
  }, [])

  const [showModal, setShowModal] = useState(false)
  const [editingPicture, setEditingPicture] = useState(null)
  const [formData, setFormData] = useState({
    title: '',
    category: 'TVC',
    url: '',
    description: ''
  })

  const handleAdd = () => {
    setEditingPicture(null)
    setFormData({ title: '', category: 'TVC', url: '', description: '' })
    setShowModal(true)
  }

  const handleEdit = (picture) => {
    setEditingPicture(picture)
    setFormData(picture)
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this picture?')) return
    try {
      const newPictures = pictures.filter(p => p.id !== id)
      const res = await fetch('/api/admin-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'pictures', value: newPictures })
      })
      if (res.ok) {
        setPictures(newPictures)
        showToast('Picture deleted successfully', 'success')
      } else {
        showToast('Failed to delete picture', 'error')
      }
    } catch (err) {
      showToast('Failed to delete picture', 'error')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    let newPictures
    if (editingPicture) {
      newPictures = pictures.map(p => p.id === editingPicture.id ? { ...formData, id: p.id } : p)
    } else {
      newPictures = [...pictures, { ...formData, id: Date.now() }]
    }
    try {
      const res = await fetch('/api/admin-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'pictures', value: newPictures })
      })
      if (res.ok) {
        setPictures(newPictures)
        showToast(editingPicture ? 'Picture updated successfully!' : 'Picture added successfully!', 'success')
        setShowModal(false)
      } else {
        showToast('Failed to save picture', 'error')
      }
    } catch (err) {
      showToast('Failed to save picture', 'error')
    }
  }

  return (
    <div className="management-section">
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      <div className="section-header">
        <h2>Picture Management</h2>
        <button className="btn-primary" onClick={handleAdd}>
          <span>➕</span>
          Add New Picture
        </button>
      </div>

      <div className="content-grid">
        {loading ? (
          <div>Loading pictures...</div>
        ) : pictures.length === 0 ? (
          <div>No pictures found.</div>
        ) : (
          pictures.map((picture) => (
            <div key={picture.id} className="content-card picture-card">
              <div className="card-image">
                {picture.url ? (
                  <img src={picture.url} alt={picture.title} />
                ) : (
                  <div className="placeholder">📷</div>
                )}
              </div>
              <div className="card-content">
                <h3>{picture.title}</h3>
                <span className="badge">{picture.category}</span>
                <p>{picture.description}</p>
                <div className="card-actions">
                  <button className="btn-edit" onClick={() => handleEdit(picture)}>
                    ✏️ Edit
                  </button>
                  <button className="btn-delete" onClick={() => handleDelete(picture.id)}>
                    🗑️ Delete
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingPicture ? 'Edit Picture' : 'Add New Picture'}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                >
                  <option value="TVC">TVC</option>
                  <option value="Photoshoot">Photoshoot</option>
                </select>
              </div>
              <div className="form-group">
                <label>Image URL</label>
                <input
                  type="text"
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  placeholder="Enter image URL or upload"
                />
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
                  {editingPicture ? 'Update' : 'Add'} Picture
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default PictureManagement
