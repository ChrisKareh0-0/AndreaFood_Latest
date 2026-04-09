import { useState, useEffect } from 'react';
import { defaultSiteText } from '@/content/siteText';
import './Management.css';
import { buildMediaFolder, uploadMediaFile } from '@/lib/mediaUpload';

function BioManagement() {
  const [content, setContent] = useState(null);
  const [siteText, setSiteText] = useState(null);
  const [latestWorkPosts, setLatestWorkPosts] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [uploadingPostId, setUploadingPostId] = useState(null);
  const [formData, setFormData] = useState({});
  const latestWorkFolder = buildMediaFolder('site-content', 'latest-work');

  useEffect(() => {
    async function fetchAdminData() {
      try {
        const bioRes = await fetch('/api/admin-data/bioContent');
        const siteTextRes = await fetch('/api/admin-data/siteText');
        const latestWorkRes = await fetch('/api/admin-data/latestWorkPosts');
        const bioData = bioRes.ok ? await bioRes.json() : null;
        const siteTextData = siteTextRes.ok ? await siteTextRes.json() : null;
        const latestWorkData = latestWorkRes.ok ? await latestWorkRes.json() : null;
        setContent(bioData?.value || {});
        setSiteText(siteTextData?.value || {});
        setLatestWorkPosts(latestWorkData?.value || []);
        setFormData({
          ...(bioData?.value || {}),
          siteText: siteTextData?.value || {},
          latestWorkPosts: latestWorkData?.value || [],
        });
      } catch {
        // show error or keep empty
      }
    }
    fetchAdminData();
  }, []);

  const handleSiteTextChange = (section, field, value) => {
    setFormData((prev) => ({
      ...prev,
      siteText: {
        ...prev.siteText,
        [section]: {
          ...prev.siteText[section],
          [field]: value,
        },
      },
    }));
  };

  const handleLatestWorkPostChange = (id, field, value) => {
    setFormData((prev) => ({
      ...prev,
      latestWorkPosts: prev.latestWorkPosts.map((p) =>
        p.id === id ? { ...p, [field]: value } : p
      ),
    }));
  };

  const handleLatestWorkImageUpload = async (e, id) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      setUploadingPostId(id);
      const result = await uploadMediaFile(file, buildMediaFolder(latestWorkFolder, String(id)));
      handleLatestWorkPostChange(id, 'imageUrl', result.url);
    } catch (err) {
      console.error('Failed to upload latest work image', err);
    } finally {
      setUploadingPostId(null);
    }
  };

  const handleAddLatestWorkPost = () => {
    const newPost = {
      id: Date.now(),
      title: '',
      excerpt: '',
      imageUrl: '',
    };
    setFormData((prev) => ({
      ...prev,
      latestWorkPosts: [...prev.latestWorkPosts, newPost],
    }));
  };

  const handleDeleteLatestWorkPost = (id) => {
    setFormData((prev) => ({
      ...prev,
      latestWorkPosts: prev.latestWorkPosts.filter((p) => p.id !== id),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const {
      aboutTitle,
      aboutParagraph1,
      aboutParagraph2,
      servicesDescription,
      contactSubtitle,
      contactDescription,
      siteText: nextSiteText,
      latestWorkPosts: nextLatestWorkPosts,
    } = formData;

    const nextBio = {
      aboutTitle,
      aboutParagraph1,
      aboutParagraph2,
      servicesDescription,
      contactSubtitle,
      contactDescription,
    };

    setContent(nextBio);
    setSiteText(nextSiteText);
    setLatestWorkPosts(nextLatestWorkPosts);

    try {
      const responses = await Promise.all([
        fetch('/api/admin-data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: 'bioContent', value: nextBio }),
        }),
        fetch('/api/admin-data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: 'siteText', value: nextSiteText }),
        }),
        fetch('/api/admin-data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: 'latestWorkPosts', value: nextLatestWorkPosts }),
        }),
      ]);

      if (responses.every((response) => response.ok)) {
        setIsEditing(false);
      } else {
        console.error('One or more content saves failed');
      }
    } catch (err) {
      console.error('Failed to save content', err);
    }
  };

  const handleCancel = () => {
    setFormData({ ...content, siteText, latestWorkPosts });
    setIsEditing(false);
  };

  return (
    <div className="management-section">
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
                <h4>{content?.aboutTitle || 'No title available'}</h4>
                <p>{content?.aboutParagraph1 || 'No first paragraph available.'}</p>
                <p>{content?.aboutParagraph2 || 'No second paragraph available.'}</p>
              </div>
            </div>
            <div className="content-section">
              <h3>Services Description</h3>
              <div className="content-preview">
                <p>{content?.servicesDescription || 'No services description available.'}</p>
              </div>
            </div>
            <div className="content-section">
              <h3>Contact Section</h3>
              <div className="content-preview">
                <p><strong>Subtitle:</strong> {content?.contactSubtitle || 'No contact subtitle.'}</p>
                <p><strong>Description:</strong> {content?.contactDescription || 'No contact description.'}</p>
              </div>
            </div>
            <div className="content-section">
              <h3>Front Site Text</h3>
              <div className="content-preview">
                <p><strong>Navigation:</strong> {siteText?.navigation?.home || 'Home'} / {siteText?.navigation?.journey || 'Journey'} / {siteText?.navigation?.clients || 'Clients'} / {siteText?.navigation?.myWork || 'My Work'} / {siteText?.navigation?.creativeServices || 'Creative Services'} / {siteText?.navigation?.letsConnect || 'Lets Connect'}</p>
                <p><strong>Clients Gallery:</strong> {siteText?.clientsGallery?.title || 'No gallery title.'}</p>
                <p><strong>Footer:</strong> {siteText?.footer?.copyrightPrefix || ''} … {siteText?.footer?.allRightsReservedSuffix || ''}</p>
                <p><strong>Login:</strong> {siteText?.login?.title || 'Login'}</p>
              </div>
            </div>
            <div className="content-section">
              <h3>Latest Work Posts</h3>
              <div className="content-preview">
                {(latestWorkPosts && latestWorkPosts.length > 0) ? latestWorkPosts.map((p) => (
                  <p key={p.id}><strong>{p.title || 'Untitled'}:</strong> {p.excerpt || 'No excerpt yet.'}</p>
                )) : <p>No work posts available.</p>}
              </div>
            </div>
          </div>
        ) : (
          <div className="bio-edit">
            <form onSubmit={handleSubmit}>
              {/* About Section */}
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
              {/* Services Section */}
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
              {/* Contact Section */}
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
              {/* Site Text Section */}
              <div className="form-card">
                <h3>Front Site Text</h3>
                {/* Navigation fields */}
                {Object.keys(defaultSiteText.navigation).map((navKey) => (
                  <div className="form-group" key={navKey}>
                    <label>Navigation - {navKey.charAt(0).toUpperCase() + navKey.slice(1)}</label>
                    <input
                      type="text"
                      value={formData.siteText?.navigation?.[navKey] ?? defaultSiteText.navigation[navKey]}
                      onChange={(e) => handleSiteTextChange('navigation', navKey, e.target.value)}
                    />
                  </div>
                ))}
                {/* Home fields */}
                {Object.keys(defaultSiteText.home).map((homeKey) => (
                  <div className="form-group" key={homeKey}>
                    <label>Home - {homeKey.charAt(0).toUpperCase() + homeKey.slice(1)}</label>
                    <input
                      type="text"
                      value={formData.siteText?.home?.[homeKey] ?? defaultSiteText.home[homeKey]}
                      onChange={(e) => handleSiteTextChange('home', homeKey, e.target.value)}
                    />
                  </div>
                ))}
                {/* Clients Gallery fields */}
                {Object.keys(defaultSiteText.clientsGallery).map((cgKey) => (
                  <div className="form-group" key={cgKey}>
                    <label>Clients Gallery - {cgKey.charAt(0).toUpperCase() + cgKey.slice(1)}</label>
                    <input
                      type="text"
                      value={formData.siteText?.clientsGallery?.[cgKey] ?? defaultSiteText.clientsGallery[cgKey]}
                      onChange={(e) => handleSiteTextChange('clientsGallery', cgKey, e.target.value)}
                    />
                  </div>
                ))}
                {/* Footer fields */}
                {Object.keys(defaultSiteText.footer).map((footerKey) => (
                  <div className="form-group" key={footerKey}>
                    <label>Footer - {footerKey.charAt(0).toUpperCase() + footerKey.slice(1)}</label>
                    <input
                      type="text"
                      value={formData.siteText?.footer?.[footerKey] ?? defaultSiteText.footer[footerKey]}
                      onChange={(e) => handleSiteTextChange('footer', footerKey, e.target.value)}
                    />
                  </div>
                ))}
                {/* Login fields */}
                {Object.keys(defaultSiteText.login).map((loginKey) => (
                  <div className="form-group" key={loginKey}>
                    <label>Login - {loginKey.charAt(0).toUpperCase() + loginKey.slice(1)}</label>
                    <input
                      type="text"
                      value={formData.siteText?.login?.[loginKey] ?? defaultSiteText.login[loginKey]}
                      onChange={(e) => handleSiteTextChange('login', loginKey, e.target.value)}
                    />
                  </div>
                ))}
              </div>
              {/* Latest Work Posts Section */}
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
                        {uploadingPostId === post.id ? <span style={{ marginLeft: '0.75rem' }}>Uploading...</span> : null}
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
  );
}

export default BioManagement;
