import { useState } from 'react'
import './Management.css'
import { useToast } from '../../hooks/useToast'
import { ToastContainer } from '../../components/Toast'

function CategoryManagement() {
  const { toasts, showToast, removeToast } = useToast()
  const [categories, setCategories] = useState([
    { id: 1, name: 'TVC', description: 'Television Commercial projects', color: '#4a7ba7' },
    { id: 2, name: 'Photoshoot', description: 'Professional food photography', color: '#e89a3c' },
    { id: 3, name: 'Commercial', description: 'Commercial food styling', color: '#2ecc71' },
    { id: 4, name: 'Editorial', description: 'Editorial food photography', color: '#e74c3c' }
  ])

  const [showModal, setShowModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#4a7ba7'
  })

  const handleAdd = () => {
    setEditingCategory(null)
    setFormData({ name: '', description: '', color: '#4a7ba7' })
    setShowModal(true)
  }

  const handleEdit = (category) => {
    setEditingCategory(category)
    setFormData(category)
    setShowModal(true)
  }

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this category? This will affect all associated items.')) {
      setCategories(categories.filter(c => c.id !== id))
      showToast('Category deleted successfully', 'success')
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (editingCategory) {
      setCategories(categories.map(c => c.id === editingCategory.id ? { ...formData, id: c.id } : c))
      showToast('Category updated successfully!', 'success')
    } else {
      setCategories([...categories, { ...formData, id: Date.now() }])
      showToast('Category added successfully!', 'success')
    }
    setShowModal(false)
  }

  const colorOptions = [
    { value: '#4a7ba7', name: 'Blue' },
    { value: '#e89a3c', name: 'Orange' },
    { value: '#2ecc71', name: 'Green' },
    { value: '#e74c3c', name: 'Red' },
    { value: '#9b59b6', name: 'Purple' },
    { value: '#1abc9c', name: 'Teal' },
    { value: '#f39c12', name: 'Yellow' },
    { value: '#34495e', name: 'Dark' }
  ]

  return (
    <div className="management-section">
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      <div className="section-header">
        <h2>Category Management</h2>
        <button className="btn-primary" onClick={handleAdd}>
          <span>➕</span>
          Add New Category
        </button>
      </div>

      <div className="categories-grid">
        {categories.map((category) => (
          <div key={category.id} className="category-card">
            <div className="category-header" style={{ background: category.color }}>
              <h3>{category.name}</h3>
            </div>
            <div className="category-body">
              <p>{category.description}</p>
              <div className="category-meta">
                <span className="color-indicator" style={{ background: category.color }}></span>
                <span className="color-code">{category.color}</span>
              </div>
            </div>
            <div className="category-actions">
              <button className="btn-edit" onClick={() => handleEdit(category)}>
                ✏️ Edit
              </button>
              <button className="btn-delete" onClick={() => handleDelete(category.id)}>
                🗑️ Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingCategory ? 'Edit Category' : 'Add New Category'}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Category Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows="4"
                  required
                ></textarea>
              </div>
              <div className="form-group">
                <label>Color</label>
                <div className="color-picker">
                  {colorOptions.map((color) => (
                    <label key={color.value} className="color-option">
                      <input
                        type="radio"
                        name="color"
                        value={color.value}
                        checked={formData.color === color.value}
                        onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      />
                      <span
                        className="color-swatch"
                        style={{ background: color.value }}
                        title={color.name}
                      ></span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {editingCategory ? 'Update' : 'Add'} Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default CategoryManagement
