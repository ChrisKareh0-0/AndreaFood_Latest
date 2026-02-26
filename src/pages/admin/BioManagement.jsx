import { useState } from 'react'
import { defaultSiteText, loadSiteText, saveSiteText } from '@/content/siteText'
import { defaultLatestWorkPosts, loadLatestWorkPosts, saveLatestWorkPosts } from '@/content/latestWork'
import './Management.css'
import { useToast } from '../../hooks/useToast'
import { ToastContainer } from '../../components/Toast'

function BioManagement() {
  const { toasts, showToast, removeToast } = useToast()
  const defaultContent = {
    aboutTitle: 'A Glimpse into the Journey..',
    aboutParagraph1: 'Lorem ipsum dolor sit amet, consectetuer adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat.',
    aboutParagraph2: 'Duis autem vel eum iriure dolor in hendrerit in vulputate velit esse molestie consequat, vel illum dolore eu feugiat nulla facilisis at vero eros et accumsan et iusto odio dignissim qui blandit praesent luptatum zzril delenit augue duis dolore te feugait onummy nibh euismod tincidunt ut laoreet dolore.',
    servicesDescription: 'Lorem ipsum dolor sit amet, consectetuer adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat.',
    contactSubtitle: 'Ready to bring your culinary vision to life?',
    contactDescription: "Let's discuss your next foodstyling project & create something truly mouth-watering."
  }

  const [content, setContent] = useState(() => {
    const saved = localStorage.getItem('bioContent')
    return saved ? JSON.parse(saved) : defaultContent
  })

  const [siteText, setSiteText] = useState(() => loadSiteText())
  const [latestWorkPosts, setLatestWorkPosts] = useState(() => loadLatestWorkPosts())

  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({ ...content, siteText, latestWorkPosts })

  const handleSiteTextChange = (section, field, value) => {
    setFormData((prev) => ({
      ...prev,
      siteText: {
        ...prev.siteText,
        [section]: {
          ...prev.siteText?.[section],
          [field]: value
        }
      }
    }))
  }

  const handleLatestWorkPostChange = (id, field, value) => {
    setFormData((prev) => ({
      ...prev,
      latestWorkPosts: (prev.latestWorkPosts || []).map((p) =>
        p.id === id ? { ...p, [field]: value } : p
      )
    }))
  }

  const handleLatestWorkImageUpload = (e, id) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onloadend = () => {
      const result = typeof reader.result === 'string' ? reader.result : ''
      handleLatestWorkPostChange(id, 'imageUrl', result)
    }
    reader.readAsDataURL(file)
  }

  const handleAddLatestWorkPost = () => {
    const newPost = {
      id: Date.now(),
      title: '',
      excerpt: '',
      imageUrl: ''
    }
    setFormData((prev) => ({
      ...prev,
      latestWorkPosts: [...(prev.latestWorkPosts || []), newPost]
    }))
  }

  const handleDeleteLatestWorkPost = (id) => {
    setFormData((prev) => ({
      ...prev,
      latestWorkPosts: (prev.latestWorkPosts || []).filter((p) => p.id !== id)
    }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()

    try {
      const {
        aboutTitle,
        aboutParagraph1,
        aboutParagraph2,
        servicesDescription,
        contactSubtitle,
        contactDescription,
        siteText: nextSiteText,
        latestWorkPosts: nextLatestWorkPosts
      } = formData

      const nextBio = {
        aboutTitle,
        aboutParagraph1,
        aboutParagraph2,
        servicesDescription,
        contactSubtitle,
        contactDescription
      }

      setContent(nextBio)
      localStorage.setItem('bioContent', JSON.stringify(nextBio))

      const mergedSiteText = nextSiteText ? nextSiteText : defaultSiteText
      setSiteText(mergedSiteText)
      saveSiteText(mergedSiteText)

      const postsToSave = Array.isArray(nextLatestWorkPosts) && nextLatestWorkPosts.length > 0
        ? nextLatestWorkPosts
        : defaultLatestWorkPosts
      setLatestWorkPosts(postsToSave)
      saveLatestWorkPosts(postsToSave)

      showToast('Bio and content saved successfully!', 'success')
      setIsEditing(false)
    } catch (error) {
      showToast('Failed to save content. Please try again.', 'error')
      console.error('Save error:', error)
    }
  }

  const handleCancel = () => {
    setFormData({ ...content, siteText, latestWorkPosts })
    setIsEditing(false)
  }

  return (
    <div className="management-section">
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      <div className="section-header">
        <h2>Bio & Content Management</h2>
        {!isEditing ? (
          <button className="btn-primary" onClick={() => setIsEditing(true)}>
            <span>✏️</span>
            Edit Content
          </button>
        ) : null}
      </div>

      <div className="bio-container">
        {!isEditing ? (
          <div className="bio-display">
            <div className="content-section">
              <h3>About Section</h3>
              <div className="content-preview">
                <h4>{content.aboutTitle}</h4>
                <p>{content.aboutParagraph1}</p>
                <p>{content.aboutParagraph2}</p>
              </div>
            </div>

            <div className="content-section">
              <h3>Services Description</h3>
              <div className="content-preview">
                <p>{content.servicesDescription}</p>
              </div>
            </div>

            <div className="content-section">
              <h3>Contact Section</h3>
              <div className="content-preview">
                <p><strong>Subtitle:</strong> {content.contactSubtitle}</p>
                <p><strong>Description:</strong> {content.contactDescription}</p>
              </div>
            </div>

            <div className="content-section">
              <h3>Front Site Text</h3>
              <div className="content-preview">
                <p><strong>Navigation:</strong> {siteText.navigation.home} / {siteText.navigation.journey} / {siteText.navigation.clients} / {siteText.navigation.myWork} / {siteText.navigation.creativeServices} / {siteText.navigation.letsConnect}</p>
                <p><strong>Clients Gallery:</strong> {siteText.clientsGallery.title}</p>
                <p><strong>Footer:</strong> {siteText.footer.copyrightPrefix} … {siteText.footer.allRightsReservedSuffix}</p>
                <p><strong>Login:</strong> {siteText.login.title}</p>
              </div>
            </div>

            <div className="content-section">
              <h3>Latest Work Posts</h3>
              <div className="content-preview">
                {latestWorkPosts.map((p) => (
                  <p key={p.id}><strong>{p.title || 'Untitled'}:</strong> {p.excerpt || 'No excerpt yet.'}</p>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="bio-edit">
            <form onSubmit={handleSubmit}>
              <div className="form-card">
                <h3>About Section</h3>
                <div className="form-group">
                  <label>Section Title</label>
                  <input
                    type="text"
                    value={formData.aboutTitle}
                    onChange={(e) => setFormData({ ...formData, aboutTitle: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>First Paragraph</label>
                  <textarea
                    value={formData.aboutParagraph1}
                    onChange={(e) => setFormData({ ...formData, aboutParagraph1: e.target.value })}
                    rows="5"
                    required
                  ></textarea>
                </div>
                <div className="form-group">
                  <label>Second Paragraph</label>
                  <textarea
                    value={formData.aboutParagraph2}
                    onChange={(e) => setFormData({ ...formData, aboutParagraph2: e.target.value })}
                    rows="5"
                    required
                  ></textarea>
                </div>
              </div>

              <div className="form-card">
                <h3>Services Section</h3>
                <div className="form-group">
                  <label>Services Description</label>
                  <textarea
                    value={formData.servicesDescription}
                    onChange={(e) => setFormData({ ...formData, servicesDescription: e.target.value })}
                    rows="4"
                    required
                  ></textarea>
                </div>
              </div>

              <div className="form-card">
                <h3>Contact Section</h3>
                <div className="form-group">
                  <label>Contact Subtitle</label>
                  <input
                    type="text"
                    value={formData.contactSubtitle}
                    onChange={(e) => setFormData({ ...formData, contactSubtitle: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Contact Description</label>
                  <textarea
                    value={formData.contactDescription}
                    onChange={(e) => setFormData({ ...formData, contactDescription: e.target.value })}
                    rows="3"
                    required
                  ></textarea>
                </div>
              </div>

              <div className="form-card">
                <h3>Front Site Text</h3>

                <div className="form-group">
                  <label>Navigation - Home</label>
                  <input
                    type="text"
                    value={formData.siteText?.navigation?.home ?? defaultSiteText.navigation.home}
                    onChange={(e) => handleSiteTextChange('navigation', 'home', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Navigation - Journey</label>
                  <input
                    type="text"
                    value={formData.siteText?.navigation?.journey ?? defaultSiteText.navigation.journey}
                    onChange={(e) => handleSiteTextChange('navigation', 'journey', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Navigation - Clients</label>
                  <input
                    type="text"
                    value={formData.siteText?.navigation?.clients ?? defaultSiteText.navigation.clients}
                    onChange={(e) => handleSiteTextChange('navigation', 'clients', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Navigation - My Work</label>
                  <input
                    type="text"
                    value={formData.siteText?.navigation?.myWork ?? defaultSiteText.navigation.myWork}
                    onChange={(e) => handleSiteTextChange('navigation', 'myWork', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Navigation - Creative Services</label>
                  <input
                    type="text"
                    value={formData.siteText?.navigation?.creativeServices ?? defaultSiteText.navigation.creativeServices}
                    onChange={(e) => handleSiteTextChange('navigation', 'creativeServices', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Navigation - Let's Connect</label>
                  <input
                    type="text"
                    value={formData.siteText?.navigation?.letsConnect ?? defaultSiteText.navigation.letsConnect}
                    onChange={(e) => handleSiteTextChange('navigation', 'letsConnect', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Navigation - Login</label>
                  <input
                    type="text"
                    value={formData.siteText?.navigation?.login ?? defaultSiteText.navigation.login}
                    onChange={(e) => handleSiteTextChange('navigation', 'login', e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>Home - Latest Work Title</label>
                  <input
                    type="text"
                    value={formData.siteText?.home?.latestWorkTitle ?? defaultSiteText.home.latestWorkTitle}
                    onChange={(e) => handleSiteTextChange('home', 'latestWorkTitle', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Home - Latest Work Description</label>
                  <textarea
                    value={formData.siteText?.home?.latestWorkDescription ?? defaultSiteText.home.latestWorkDescription}
                    onChange={(e) => handleSiteTextChange('home', 'latestWorkDescription', e.target.value)}
                    rows="3"
                  ></textarea>
                </div>
                <div className="form-group">
                  <label>Home - My Work Title</label>
                  <input
                    type="text"
                    value={formData.siteText?.home?.myWorkTitle ?? defaultSiteText.home.myWorkTitle}
                    onChange={(e) => handleSiteTextChange('home', 'myWorkTitle', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Home - Search Placeholder</label>
                  <input
                    type="text"
                    value={formData.siteText?.home?.searchPlaceholder ?? defaultSiteText.home.searchPlaceholder}
                    onChange={(e) => handleSiteTextChange('home', 'searchPlaceholder', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Home - Contact Title Prefix</label>
                  <input
                    type="text"
                    value={formData.siteText?.home?.contactTitlePrefix ?? defaultSiteText.home.contactTitlePrefix}
                    onChange={(e) => handleSiteTextChange('home', 'contactTitlePrefix', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Home - Contact Title Emphasis</label>
                  <input
                    type="text"
                    value={formData.siteText?.home?.contactTitleEmphasis ?? defaultSiteText.home.contactTitleEmphasis}
                    onChange={(e) => handleSiteTextChange('home', 'contactTitleEmphasis', e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>Clients Gallery - Title</label>
                  <input
                    type="text"
                    value={formData.siteText?.clientsGallery?.title ?? defaultSiteText.clientsGallery.title}
                    onChange={(e) => handleSiteTextChange('clientsGallery', 'title', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Clients Gallery - Description</label>
                  <textarea
                    value={formData.siteText?.clientsGallery?.description ?? defaultSiteText.clientsGallery.description}
                    onChange={(e) => handleSiteTextChange('clientsGallery', 'description', e.target.value)}
                    rows="2"
                  ></textarea>
                </div>

                <div className="form-group">
                  <label>Footer - Copyright Prefix</label>
                  <input
                    type="text"
                    value={formData.siteText?.footer?.copyrightPrefix ?? defaultSiteText.footer.copyrightPrefix}
                    onChange={(e) => handleSiteTextChange('footer', 'copyrightPrefix', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Footer - All Rights Reserved Suffix</label>
                  <input
                    type="text"
                    value={formData.siteText?.footer?.allRightsReservedSuffix ?? defaultSiteText.footer.allRightsReservedSuffix}
                    onChange={(e) => handleSiteTextChange('footer', 'allRightsReservedSuffix', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Footer - Powered By Prefix</label>
                  <input
                    type="text"
                    value={formData.siteText?.footer?.poweredByPrefix ?? defaultSiteText.footer.poweredByPrefix}
                    onChange={(e) => handleSiteTextChange('footer', 'poweredByPrefix', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Footer - Powered By Name</label>
                  <input
                    type="text"
                    value={formData.siteText?.footer?.poweredByName ?? defaultSiteText.footer.poweredByName}
                    onChange={(e) => handleSiteTextChange('footer', 'poweredByName', e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>Login - Title</label>
                  <input
                    type="text"
                    value={formData.siteText?.login?.title ?? defaultSiteText.login.title}
                    onChange={(e) => handleSiteTextChange('login', 'title', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Login - Subtitle</label>
                  <input
                    type="text"
                    value={formData.siteText?.login?.subtitle ?? defaultSiteText.login.subtitle}
                    onChange={(e) => handleSiteTextChange('login', 'subtitle', e.target.value)}
                  />
                </div>
              </div>

              <div className="form-card">
                <h3>Latest Work Posts</h3>
                <div className="form-actions" style={{ justifyContent: 'flex-start' }}>
                  <button type="button" className="btn-primary" onClick={handleAddLatestWorkPost}>
                    <span>➕</span>
                    Add Post
                  </button>
                </div>

                {(formData.latestWorkPosts || []).map((post) => (
                  <div key={post.id} className="data-card" style={{ padding: '1.5rem', marginTop: '1.5rem' }}>
                    <div className="section-header" style={{ marginBottom: '1rem' }}>
                      <h2 style={{ fontSize: '1.2rem', margin: 0 }}>Post</h2>
                      <button
                        type="button"
                        className="btn-delete"
                        onClick={() => handleDeleteLatestWorkPost(post.id)}
                      >
                        🗑️ Delete
                      </button>
                    </div>

                    <div className="form-group">
                      <label>Title</label>
                      <input
                        type="text"
                        value={post.title}
                        onChange={(e) => handleLatestWorkPostChange(post.id, 'title', e.target.value)}
                      />
                    </div>

                    <div className="form-group">
                      <label>Excerpt</label>
                      <textarea
                        value={post.excerpt}
                        onChange={(e) => handleLatestWorkPostChange(post.id, 'excerpt', e.target.value)}
                        rows="3"
                      ></textarea>
                    </div>

                    <div className="form-group">
                      <label>Image URL</label>
                      <input
                        type="text"
                        value={post.imageUrl}
                        onChange={(e) => handleLatestWorkPostChange(post.id, 'imageUrl', e.target.value)}
                        placeholder="Enter image URL"
                      />
                      <div className="file-upload-container">
                        <label className="file-upload-btn">
                          📁 Upload Image
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleLatestWorkImageUpload(e, post.id)}
                            style={{ display: 'none' }}
                          />
                        </label>
                      </div>
                      {post.imageUrl ? (
                        <div className="image-preview image-preview--compact" style={{ marginTop: '1rem' }}>
                          <img src={post.imageUrl} alt={post.title || 'Latest work image'} />
                        </div>
                      ) : null}
                    </div>
                  </div>
                ))}
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

export default BioManagement
