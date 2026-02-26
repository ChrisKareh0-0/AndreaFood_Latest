import { useState, useEffect } from 'react'
import './Management.css'
import { useToast } from '../../hooks/useToast'
import { ToastContainer } from '../../components/Toast'
import ImageUploader from '../../components/ImageUploader'

function PersonalDataManagement() {
  const { toasts, showToast, removeToast } = useToast()

  const [personalData, setPersonalData] = useState(() => {
    const saved = localStorage.getItem('personalData')
    return saved ? JSON.parse(saved) : {
      fullName: 'Andrea Abi Khalil',
      title: 'Food Stylist',
      email: 'andreaabikhalil@gmail.com',
      phone: '03 56 16 58',
      instagram: '@andreafoodstyle',
      facebook: 'Andrea Food Style',
      heroImage: '',
      profileImage: ''
    }
  })

  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState(personalData)

  const handleSubmit = (e) => {
    e.preventDefault()

    try {
      setPersonalData(formData)
      localStorage.setItem('personalData', JSON.stringify(formData))
      showToast('Personal data saved successfully!', 'success')
      setIsEditing(false)
    } catch (error) {
      if (error.name === 'QuotaExceededError') {
        showToast('Storage quota exceeded. Please use smaller images or URLs.', 'error')
      } else {
        showToast('Failed to save data. Please try again.', 'error')
      }
      console.error('Save error:', error)
    }
  }

  const handleCancel = () => {
    setFormData(personalData)
    setIsEditing(false)
  }

  return (
    <div className="management-section">
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      <div className="section-header">
        <h2>Personal Data</h2>
        {!isEditing ? (
          <button className="btn-primary" onClick={() => setIsEditing(true)}>
            <span>✏️</span>
            Edit Information
          </button>
        ) : null}
      </div>

      <div className="personal-data-container">
        {!isEditing ? (
          <div className="data-display">
            <div className="data-card">
              <h3>Basic Information</h3>
              <div className="data-item">
                <span className="data-label">Full Name:</span>
                <span className="data-value">{personalData.fullName}</span>
              </div>
              <div className="data-item">
                <span className="data-label">Title:</span>
                <span className="data-value">{personalData.title}</span>
              </div>
            </div>

            <div className="data-card">
              <h3>Contact Information</h3>
              <div className="data-item">
                <span className="data-label">Email:</span>
                <span className="data-value">{personalData.email}</span>
              </div>
              <div className="data-item">
                <span className="data-label">Phone:</span>
                <span className="data-value">{personalData.phone}</span>
              </div>
            </div>

            <div className="data-card">
              <h3>Social Media</h3>
              <div className="data-item">
                <span className="data-label">Instagram:</span>
                <span className="data-value">{personalData.instagram}</span>
              </div>
              <div className="data-item">
                <span className="data-label">Facebook:</span>
                <span className="data-value">{personalData.facebook}</span>
              </div>
            </div>

            <div className="data-card">
              <h3>Images</h3>
              <div className="data-item">
                <span className="data-label">Hero Image:</span>
                <div className="data-value">
                  {personalData.heroImage ? (
                    <div className="image-preview image-preview--compact">
                      <img src={personalData.heroImage} alt="Hero preview" />
                    </div>
                  ) : (
                    'Not set'
                  )}
                </div>
              </div>
              <div className="data-item">
                <span className="data-label">Profile Image:</span>
                <div className="data-value">
                  {personalData.profileImage ? (
                    <div className="image-preview image-preview--compact">
                      <img src={personalData.profileImage} alt="Profile preview" />
                    </div>
                  ) : (
                    'Not set'
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="data-edit">
            <form onSubmit={handleSubmit}>
              <div className="form-card">
                <h3>Basic Information</h3>
                <div className="form-group">
                  <label>Full Name</label>
                  <input
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Title</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="form-card">
                <h3>Contact Information</h3>
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Phone</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="form-card">
                <h3>Social Media</h3>
                <div className="form-group">
                  <label>Instagram</label>
                  <input
                    type="text"
                    value={formData.instagram}
                    onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Facebook</label>
                  <input
                    type="text"
                    value={formData.facebook}
                    onChange={(e) => setFormData({ ...formData, facebook: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-card">
                <h3>Images</h3>
                <div className="form-group">
                  <label>Hero Image URL</label>
                  <input
                    type="text"
                    value={formData.heroImage}
                    onChange={(e) => setFormData({ ...formData, heroImage: e.target.value })}
                    placeholder="Enter image URL (e.g., https://example.com/image.jpg)"
                  />
                  <ImageUploader
                    label="Upload & Compress Image"
                    maxSizeKB={500}
                    onUploadComplete={(base64) => {
                      setFormData({ ...formData, heroImage: base64 })
                      showToast('Image compressed and uploaded successfully!', 'success')
                    }}
                  />
                  {formData.heroImage && (
                    <div className="image-preview">
                      <img src={formData.heroImage} alt="Hero preview" onError={(e) => e.target.src = 'https://via.placeholder.com/400x200?text=Invalid+URL'} />
                    </div>
                  )}
                </div>
                <div className="form-group">
                  <label>Profile Image URL (Meet the Artist)</label>
                  <input
                    type="text"
                    value={formData.profileImage}
                    onChange={(e) => setFormData({ ...formData, profileImage: e.target.value })}
                    placeholder="Enter image URL (e.g., https://example.com/profile.jpg)"
                  />
                  <ImageUploader
                    label="Upload & Compress Image"
                    maxSizeKB={500}
                    onUploadComplete={(base64) => {
                      setFormData({ ...formData, profileImage: base64 })
                      showToast('Image compressed and uploaded successfully!', 'success')
                    }}
                  />
                  {formData.profileImage && (
                    <div className="image-preview">
                      <img src={formData.profileImage} alt="Profile preview" onError={(e) => e.target.src = 'https://via.placeholder.com/400x200?text=Invalid+URL'} />
                    </div>
                  )}
                </div>
              </div>

              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={handleCancel}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}

export default PersonalDataManagement
