import { useState } from 'react'
import './Management.css'
import { useToast } from '../../hooks/useToast'
import { ToastContainer } from '../../components/Toast'

function PictureManagement() {
  const { toasts, showToast, removeToast } = useToast()
  const [pictures, setPictures] = useState([
    { id: 1, title: 'Food Photography 1', category: 'TVC', url: '', description: 'Sample description' },
    { id: 2, title: 'Food Photography 2', category: 'Photoshoot', url: '', description: 'Sample description' }
  ])

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

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this picture?')) {
      setPictures(pictures.filter(p => p.id !== id))
      showToast('Picture deleted successfully', 'success')
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (editingPicture) {
      setPictures(pictures.map(p => p.id === editingPicture.id ? { ...formData, id: p.id } : p))
      showToast('Picture updated successfully!', 'success')
    } else {
      setPictures([...pictures, { ...formData, id: Date.now() }])
      showToast('Picture added successfully!', 'success')
    }
    setShowModal(false)
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
        {pictures.map((picture) => (
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
        ))}
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
