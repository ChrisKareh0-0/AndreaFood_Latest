import { useEffect, useState } from 'react'
import { defaultCategories, normalizeCategories } from '@/content/categories'
import './Management.css'

const noopToast = () => {}

function CategoryManagement({ showToast = noopToast }) {
  const [categories, setCategories] = useState(() => normalizeCategories(defaultCategories))
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#4a7ba7'
  })

  useEffect(() => {
    let cancelled = false

    async function fetchCategories() {
      try {
        setLoading(true)
        const res = await fetch('/api/admin-data/categories', { cache: 'no-store' })

        if (res.status === 404) {
          if (!cancelled) {
            setCategories(normalizeCategories(defaultCategories))
          }
          return
        }

        if (!res.ok) {
          throw new Error(`Failed to load categories (${res.status})`)
        }

        const data = await res.json()
        if (!cancelled) {
          setCategories(normalizeCategories(data?.value))
        }
      } catch (err) {
        if (!cancelled) {
          setCategories(normalizeCategories(defaultCategories))
          showToast(err.message || 'Failed to load categories', 'error')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    fetchCategories()

    return () => {
      cancelled = true
    }
  }, [showToast])

  const saveCategories = async (nextCategories, successMessage) => {
    const normalizedCategories = normalizeCategories(nextCategories)
    setSaving(true)

    try {
      const res = await fetch('/api/admin-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'categories', value: normalizedCategories }),
      })

      if (!res.ok) {
        let errorMessage = `Save failed with status ${res.status}`
        try {
          const payload = await res.json()
          errorMessage = payload?.error || errorMessage
        } catch {
          // Keep the status-based message.
        }
        throw new Error(errorMessage)
      }

      setCategories(normalizedCategories)
      showToast(successMessage, 'success')
      return true
    } catch (err) {
      showToast(err.message || 'Failed to save categories', 'error')
      return false
    } finally {
      setSaving(false)
    }
  }

  const handleAdd = () => {
    setEditingCategory(null)
    setFormData({ name: '', description: '', color: '#4a7ba7' })
    setShowModal(true)
  }

  const handleEdit = (category) => {
    setEditingCategory(category)
    setFormData({
      name: category.name || '',
      description: category.description || '',
      color: category.color || '#4a7ba7',
    })
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this category? This will affect category options across the admin panel and website filters.')) {
      return
    }

    const didSave = await saveCategories(
      categories.filter(c => c.id !== id),
      'Category deleted successfully'
    )

    if (didSave) {
      setShowModal(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    const nextCategory = {
      id: editingCategory?.id ?? Date.now(),
      name: formData.name.trim(),
      description: formData.description.trim(),
      color: formData.color || '#4a7ba7',
    }

    if (!nextCategory.name) {
      showToast('Category name is required', 'error')
      return
    }

    const duplicate = categories.some((category) => (
      category.id !== editingCategory?.id
      && category.name.toLowerCase() === nextCategory.name.toLowerCase()
    ))

    if (duplicate) {
      showToast('A category with that name already exists', 'error')
      return
    }

    const nextCategories = editingCategory
      ? categories.map(c => c.id === editingCategory.id ? nextCategory : c)
      : [...categories, nextCategory]

    const didSave = await saveCategories(
      nextCategories,
      editingCategory ? 'Category updated successfully!' : 'Category added successfully!'
    )

    if (didSave) {
      setShowModal(false)
      setEditingCategory(null)
    }
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
      <div className="section-header">
        <h2>Category Management</h2>
        <button className="btn-primary" onClick={handleAdd} disabled={saving}>
          <span>➕</span>
          Add New Category
        </button>
      </div>

      {loading ? (
        <div>Loading categories...</div>
      ) : (
        <div className="categories-grid">
          {categories.map((category) => (
            <div key={category.id} className="category-card">
              <div className="category-header" style={{ background: category.color }}>
                <h3>{category.name}</h3>
              </div>
              <div className="category-body">
                <p>{category.description || 'No description yet.'}</p>
                <div className="category-meta">
                  <span className="color-indicator" style={{ background: category.color }}></span>
                  <span className="color-code">{category.color}</span>
                </div>
              </div>
              <div className="category-actions">
                <button className="btn-edit" onClick={() => handleEdit(category)} disabled={saving}>
                  ✏️ Edit
                </button>
                <button className="btn-delete" onClick={() => handleDelete(category.id)} disabled={saving}>
                  🗑️ Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

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
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)} disabled={saving}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : `${editingCategory ? 'Update' : 'Add'} Category`}
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
