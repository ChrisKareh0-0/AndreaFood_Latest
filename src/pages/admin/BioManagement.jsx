import { useState, useEffect } from 'react';
import { defaultSiteText } from '@/content/siteText';
import { defaultLatestWorkPosts } from '@/content/latestWork';
import './Management.css';

function BioManagement() {
  const defaultContent = {
    aboutTitle: 'A Glimpse into the Journey..',
    aboutParagraph1: 'Lorem ipsum dolor sit amet, consectetuer adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat.',
    aboutParagraph2: 'Duis autem vel eum iriure dolor in hendrerit in vulputate velit esse molestie consequat, vel illum dolore eu feugiat nulla facilisis at vero eros et accumsan et iusto odio dignissim qui blandit praesent luptatum zzril delenit augue duis dolore te feugait onummy nibh euismod tincidunt ut laoreet dolore.',
    servicesDescription: 'Lorem ipsum dolor sit amet, consectetuer adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat.',
    contactSubtitle: 'Ready to bring your culinary vision to life?',
    contactDescription: "Let's discuss your next foodstyling project & create something truly mouth-watering."
  };

  const [content, setContent] = useState(defaultContent);
  const [siteText, setSiteText] = useState(defaultSiteText);
  const [latestWorkPosts, setLatestWorkPosts] = useState(defaultLatestWorkPosts);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({ ...defaultContent, siteText: defaultSiteText, latestWorkPosts: defaultLatestWorkPosts });

  useEffect(() => {
    async function fetchAdminData() {
      try {
        const bioRes = await fetch('/api/admin-data/bioContent');
        if (bioRes.ok) {
          const bioData = await bioRes.json();
          setContent(bioData.value);
          setFormData((prev) => ({ ...prev, ...bioData.value }));
        }
        const siteTextRes = await fetch('/api/admin-data/siteText');
        if (siteTextRes.ok) {
          const siteTextData = await siteTextRes.json();
          setSiteText(siteTextData.value);
          setFormData((prev) => ({ ...prev, siteText: siteTextData.value }));
        }
        const latestWorkRes = await fetch('/api/admin-data/latestWorkPosts');
        if (latestWorkRes.ok) {
          const latestWorkData = await latestWorkRes.json();
          setLatestWorkPosts(latestWorkData.value);
          setFormData((prev) => ({ ...prev, latestWorkPosts: latestWorkData.value }));
        }
      } catch (err) {
        // fallback to defaults
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

  const handleLatestWorkImageUpload = (e, id) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      handleLatestWorkPostChange(id, 'imageUrl', result);
    };
    reader.readAsDataURL(file);
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

  const handleSubmit = (e) => {
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

    Promise.all([
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
    ]).then(() => setIsEditing(false));
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
