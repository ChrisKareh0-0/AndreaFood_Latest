import { useState, useEffect } from 'react';
import { defaultSiteText } from '@/content/siteText';
import './Management.css';
import { buildMediaFolder, uploadMediaFile, uploadMediaFiles } from '@/lib/mediaUpload';

const noopToast = () => {};

const emptyBioContent = {
  aboutTitle: '',
  aboutParagraph1: '',
  aboutParagraph2: '',
  aboutImage: '',
  servicesDescription: '',
  servicesImages: [],
  servicesItems: [],
  contactSubtitle: '',
  contactDescription: '',
};

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function normalizeServicesItems(value, fallbackImages = [], fallbackText = '') {
  const fallbackDescription = typeof fallbackText === 'string' ? fallbackText : '';
  const items = Array.isArray(value) ? value : [];
  const normalizedItems = items
    .filter((item) => isPlainObject(item))
    .map((item, index) => {
      const imageUrl = typeof item.imageUrl === 'string'
        ? item.imageUrl
        : (typeof item.url === 'string' ? item.url : '');
      const text = typeof item.text === 'string'
        ? item.text
        : (typeof item.description === 'string' ? item.description : fallbackDescription);

      return {
        id: item.id ?? `service-item-${index}-${imageUrl}`,
        imageUrl,
        text,
      };
    })
    .filter((item) => item.imageUrl || item.text || item.id);

  if (normalizedItems.length > 0) {
    return normalizedItems;
  }

  const images = Array.isArray(fallbackImages) ? fallbackImages.filter(Boolean) : [];

  return images.map((imageUrl, index) => ({
    id: `service-image-${index}-${imageUrl}`,
    imageUrl,
    text: fallbackDescription,
  }));
}

function normalizeBioContent(value) {
  const data = isPlainObject(value) ? value : {};
  const servicesDescription = data.servicesDescription || '';
  const serviceItems = normalizeServicesItems(
    data.servicesItems,
    data.servicesImages,
    servicesDescription
  );

  return {
    ...emptyBioContent,
    ...data,
    aboutTitle: data.aboutTitle || '',
    aboutParagraph1: data.aboutParagraph1 || '',
    aboutParagraph2: data.aboutParagraph2 || '',
    aboutImage: data.aboutImage || '',
    servicesDescription,
    servicesImages: serviceItems.length > 0
      ? serviceItems.map((item) => item.imageUrl).filter(Boolean)
      : (Array.isArray(data.servicesImages) ? data.servicesImages.filter(Boolean) : []),
    servicesItems: serviceItems,
    contactSubtitle: data.contactSubtitle || '',
    contactDescription: data.contactDescription || '',
  };
}

function mergeSiteText(value) {
  const data = isPlainObject(value) ? value : {};

  return Object.keys(defaultSiteText).reduce((result, section) => {
    result[section] = {
      ...defaultSiteText[section],
      ...(isPlainObject(data[section]) ? data[section] : {}),
    };
    return result;
  }, {});
}

function normalizeLatestWorkPosts(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((post) => isPlainObject(post))
    .map((post, index) => ({
      id: typeof post.id === 'number' ? post.id : Date.now() + index,
      title: post.title || '',
      excerpt: post.excerpt || '',
      imageUrl: post.imageUrl || '',
    }));
}

function buildBioFormData(content, siteText, latestWorkPosts) {
  return {
    ...normalizeBioContent(content),
    siteText: mergeSiteText(siteText),
    latestWorkPosts: normalizeLatestWorkPosts(latestWorkPosts),
  };
}

function BioManagement({ showToast = noopToast }) {
  const [content, setContent] = useState(null);
  const [siteText, setSiteText] = useState(null);
  const [latestWorkPosts, setLatestWorkPosts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [uploadingPostId, setUploadingPostId] = useState(null);
  const [isUploadingAboutImage, setIsUploadingAboutImage] = useState(false);
  const [isUploadingServicesImages, setIsUploadingServicesImages] = useState(false);
  const [formData, setFormData] = useState({});
  const latestWorkFolder = buildMediaFolder('site-content', 'latest-work');
  const aboutMediaFolder = buildMediaFolder('site-content', 'about');
  const servicesMediaFolder = buildMediaFolder('site-content', 'services');

  useEffect(() => {
    async function fetchAdminData() {
      try {
        const bioRes = await fetch('/api/admin-data/bioContent');
        const siteTextRes = await fetch('/api/admin-data/siteText');
        const latestWorkRes = await fetch('/api/admin-data/latestWorkPosts');
        const bioData = bioRes.ok ? await bioRes.json() : null;
        const siteTextData = siteTextRes.ok ? await siteTextRes.json() : null;
        const latestWorkData = latestWorkRes.ok ? await latestWorkRes.json() : null;
        const nextContent = normalizeBioContent(bioData?.value);
        const nextSiteText = mergeSiteText(siteTextData?.value);
        const nextLatestWorkPosts = normalizeLatestWorkPosts(latestWorkData?.value);

        setContent(nextContent);
        setSiteText(nextSiteText);
        setLatestWorkPosts(nextLatestWorkPosts);
        setFormData(buildBioFormData(nextContent, nextSiteText, nextLatestWorkPosts));
      } catch {
        showToast('Failed to load bio content', 'error');
      } finally {
        setLoading(false);
      }
    }
    fetchAdminData();
  }, [showToast]);

  const handleSiteTextChange = (section, field, value) => {
    setFormData((prev) => ({
      ...prev,
      siteText: {
        ...prev.siteText,
        [section]: {
          ...(prev.siteText?.[section] || {}),
          [field]: value,
        },
      },
    }));
  };

  const handleLatestWorkPostChange = (id, field, value) => {
    setFormData((prev) => ({
      ...prev,
      latestWorkPosts: (prev.latestWorkPosts || []).map((p) =>
        p.id === id ? { ...p, [field]: value } : p
      ),
    }));
  };

  const saveLatestWorkPosts = async (posts) => {
    const response = await fetch('/api/admin-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'latestWorkPosts', value: posts }),
    });

    if (!response.ok) {
      let errorMessage = `Save failed with status ${response.status}`;
      try {
        const payload = await response.json();
        errorMessage = payload?.error || errorMessage;
      } catch {
        // Keep the status-based message.
      }
      throw new Error(errorMessage);
    }
  };

  const handleLatestWorkImageUpload = async (e, id) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      setUploadingPostId(id);
      const result = await uploadMediaFile(file, buildMediaFolder(latestWorkFolder, String(id)));
      const currentPosts = Array.isArray(formData.latestWorkPosts) ? formData.latestWorkPosts : [];
      const nextLatestWorkPosts = currentPosts.map((post) =>
        post.id === id ? { ...post, imageUrl: result.url } : post
      );
      setFormData((prev) => ({ ...prev, latestWorkPosts: nextLatestWorkPosts }));
      setLatestWorkPosts(nextLatestWorkPosts);
      await saveLatestWorkPosts(nextLatestWorkPosts);
      showToast('Latest work image uploaded successfully', 'success');
    } catch (err) {
      console.error('Failed to upload latest work image', err);
      showToast(err.message || 'Failed to upload latest work image', 'error');
    } finally {
      setUploadingPostId(null);
    }
  };

  const handleAboutImageUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      setIsUploadingAboutImage(true);
      const result = await uploadMediaFile(file, aboutMediaFolder);
      setFormData((prev) => ({ ...prev, aboutImage: result.url }));
      showToast('About image uploaded successfully', 'success');
    } catch (err) {
      console.error('Failed to upload about image', err);
      showToast(err.message || 'Failed to upload about image', 'error');
    } finally {
      setIsUploadingAboutImage(false);
    }
  };

  const handleServicesImagesUpload = async (e) => {
    const files = e.target.files;
    e.target.value = '';
    if (!files || files.length === 0) return;
    try {
      setIsUploadingServicesImages(true);
      const results = await uploadMediaFiles(files, servicesMediaFolder);
      setFormData((prev) => {
        const servicesItems = [
          ...normalizeServicesItems(prev.servicesItems, prev.servicesImages, prev.servicesDescription),
          ...results.map((result, index) => ({
            id: `service-upload-${Date.now()}-${index}`,
            imageUrl: result.url,
            text: prev.servicesDescription || '',
          })),
        ];

        return {
          ...prev,
          servicesItems,
          servicesImages: servicesItems.map((item) => item.imageUrl).filter(Boolean),
        };
      });
      showToast(`${results.length} service image${results.length === 1 ? '' : 's'} uploaded successfully`, 'success');
    } catch (err) {
      console.error('Failed to upload services images', err);
      showToast(err.message || 'Failed to upload services images', 'error');
    } finally {
      setIsUploadingServicesImages(false);
    }
  };

  const handleAddServiceSlide = () => {
    setFormData((prev) => {
      const servicesItems = [
        ...normalizeServicesItems(prev.servicesItems, prev.servicesImages, prev.servicesDescription),
        {
          id: `service-manual-${Date.now()}`,
          imageUrl: '',
          text: prev.servicesDescription || '',
        },
      ];

      return {
        ...prev,
        servicesItems,
        servicesImages: servicesItems.map((item) => item.imageUrl).filter(Boolean),
      };
    });
  };

  const handleServiceItemChange = (id, field, value) => {
    setFormData((prev) => {
      const servicesItems = normalizeServicesItems(
        prev.servicesItems,
        prev.servicesImages,
        prev.servicesDescription
      ).map((item) => (
        item.id === id ? { ...item, [field]: value } : item
      ));

      return {
        ...prev,
        servicesItems,
        servicesImages: servicesItems.map((item) => item.imageUrl).filter(Boolean),
      };
    });
  };

  const handleRemoveServicesImage = (id) => {
    setFormData((prev) => {
      const servicesItems = normalizeServicesItems(
        prev.servicesItems,
        prev.servicesImages,
        prev.servicesDescription
      ).filter((item) => item.id !== id);

      return {
        ...prev,
        servicesItems,
        servicesImages: servicesItems.map((item) => item.imageUrl).filter(Boolean),
      };
    });
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
      latestWorkPosts: [...(prev.latestWorkPosts || []), newPost],
    }));
  };

  const handleDeleteLatestWorkPost = (id) => {
    setFormData((prev) => ({
      ...prev,
      latestWorkPosts: (prev.latestWorkPosts || []).filter((p) => p.id !== id),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const {
      aboutTitle,
      aboutParagraph1,
      aboutParagraph2,
      aboutImage,
      servicesDescription,
      servicesImages,
      servicesItems,
      contactSubtitle,
      contactDescription,
      siteText: nextSiteText,
      latestWorkPosts: nextLatestWorkPosts,
    } = formData;
    const normalizedServicesItems = normalizeServicesItems(
      servicesItems,
      servicesImages,
      servicesDescription
    );
    const normalizedServicesDescription = servicesDescription || normalizedServicesItems[0]?.text || '';

    const nextBio = normalizeBioContent({
      aboutTitle,
      aboutParagraph1,
      aboutParagraph2,
      aboutImage,
      servicesDescription: normalizedServicesDescription,
      servicesImages: normalizedServicesItems.map((item) => item.imageUrl).filter(Boolean),
      servicesItems: normalizedServicesItems,
      contactSubtitle,
      contactDescription,
    });
    const normalizedSiteText = mergeSiteText(nextSiteText);
    const normalizedLatestWorkPosts = normalizeLatestWorkPosts(nextLatestWorkPosts);

    setContent(nextBio);
    setSiteText(normalizedSiteText);
    setLatestWorkPosts(normalizedLatestWorkPosts);

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
          body: JSON.stringify({ key: 'siteText', value: normalizedSiteText }),
        }),
        fetch('/api/admin-data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: 'latestWorkPosts', value: normalizedLatestWorkPosts }),
        }),
      ]);

      if (responses.every((response) => response.ok)) {
        setIsEditing(false);
        showToast('Bio content saved successfully', 'success');
      } else {
        console.error('One or more content saves failed');
        showToast('Failed to save all bio content changes', 'error');
      }
    } catch (err) {
      console.error('Failed to save content', err);
      showToast(err.message || 'Failed to save content', 'error');
    }
  };

  const handleCancel = () => {
    setFormData(buildBioFormData(content, siteText, latestWorkPosts));
    setIsEditing(false);
  };

  const handleEdit = () => {
    setFormData(buildBioFormData(content, siteText, latestWorkPosts));
    setIsEditing(true);
  };

  if (loading) {
    return <div className="management-section"><div>Loading bio content...</div></div>;
  }

  const contentServiceItems = normalizeServicesItems(
    content?.servicesItems,
    content?.servicesImages,
    content?.servicesDescription
  );
  const formServiceItems = normalizeServicesItems(
    formData.servicesItems,
    formData.servicesImages,
    formData.servicesDescription
  );

  return (
    <div className="management-section">
      <div className="section-header">
        <h2>Bio & Content Management</h2>
        {!isEditing ? (
          <button className="btn-primary" onClick={handleEdit}>
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
                {content?.aboutImage && (
                  <div className="image-preview image-preview--compact" style={{ marginTop: '1rem' }}>
                    <img src={content.aboutImage} alt="About section preview" />
                  </div>
                )}
              </div>
            </div>
            <div className="content-section">
              <h3>Services Carousel</h3>
              <div className="content-preview">
                <p>{content?.servicesDescription || 'No services description available.'}</p>
                {contentServiceItems.length > 0 ? (
                  <div className="service-slide-preview-list">
                    {contentServiceItems.map((item, idx) => (
                      <div key={item.id} className="service-slide-preview-item">
                        <div className="service-slide-preview-media">
                          {item.imageUrl ? (
                            <img src={item.imageUrl} alt={`Service slide ${idx + 1}`} />
                          ) : (
                            <span>No image</span>
                          )}
                        </div>
                        <div>
                          <h4>Slide {idx + 1}</h4>
                          <p className="service-slide-text">
                            {item.text || content?.servicesDescription || 'No slide text available.'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
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
                <div className="form-group">
                  <label>About Section Image</label>
                  <input
                    type="text"
                    value={formData.aboutImage || ''}
                    onChange={(e) => setFormData({ ...formData, aboutImage: e.target.value })}
                    placeholder="Enter image URL or upload below"
                  />
                  <div className="file-upload-container">
                    <label className="file-upload-btn">
                      📁 Upload About Image
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleAboutImageUpload}
                        style={{ display: 'none' }}
                      />
                    </label>
                    {isUploadingAboutImage ? <span style={{ marginLeft: '0.75rem' }}>Uploading...</span> : null}
                  </div>
                  {formData.aboutImage && (
                    <div className="image-preview image-preview--compact" style={{ marginTop: '1rem' }}>
                      <img src={formData.aboutImage} alt="About section preview" />
                    </div>
                  )}
                </div>
              </div>
              {/* Services Section */}
              <div className="form-card">
                <h3>Services Section</h3>
                <div className="form-group">
                  <label>Default Services Description</label>
                  <textarea
                    value={formData.servicesDescription || ''}
                    onChange={(e) => setFormData({ ...formData, servicesDescription: e.target.value })}
                    rows="4"
                  ></textarea>
                </div>
                <div className="form-group">
                  <label>Services Carousel Slides</label>
                  <div className="file-upload-container">
                    <label className="file-upload-btn">
                      📁 Upload Service Images
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handleServicesImagesUpload}
                        style={{ display: 'none' }}
                      />
                    </label>
                    {isUploadingServicesImages ? <span style={{ marginLeft: '0.75rem' }}>Uploading...</span> : null}
                  </div>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={handleAddServiceSlide}
                    style={{ marginTop: '1rem' }}
                  >
                    Add Slide Manually
                  </button>

                  {formServiceItems.length > 0 ? (
                    <div className="service-slides-list">
                      {formServiceItems.map((item, idx) => (
                        <div key={item.id} className="service-slide-editor">
                          <div className="service-slide-editor__preview">
                            {item.imageUrl ? (
                              <img src={item.imageUrl} alt={`Service slide ${idx + 1}`} />
                            ) : (
                              <span>No image</span>
                            )}
                          </div>
                          <div className="service-slide-editor__body">
                            <div className="form-group">
                              <label>Slide {idx + 1} Image URL</label>
                              <input
                                type="text"
                                value={item.imageUrl || ''}
                                onChange={(e) => handleServiceItemChange(item.id, 'imageUrl', e.target.value)}
                                placeholder="Enter image URL or upload images above"
                              />
                            </div>
                            <div className="form-group">
                              <label>Slide {idx + 1} Text</label>
                              <textarea
                                value={item.text || ''}
                                onChange={(e) => handleServiceItemChange(item.id, 'text', e.target.value)}
                                rows="4"
                                placeholder="Text shown next to this carousel image"
                              ></textarea>
                            </div>
                          </div>
                          <button
                            type="button"
                            className="service-slide-editor__remove"
                            onClick={() => handleRemoveServicesImage(item.id)}
                            aria-label={`Remove service slide ${idx + 1}`}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="service-slides-empty">Upload service images or add a slide manually.</p>
                  )}
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
