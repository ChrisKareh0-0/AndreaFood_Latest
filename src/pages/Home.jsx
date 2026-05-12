import { useState, useEffect } from 'react'
import './Home.css'
import { ClientsGallery } from '../components/ClientsGallery'
import { getCategoryNames } from '@/content/categories'
import { loadSiteText } from '@/content/siteText'
import { loadLatestWorkPosts } from '@/content/latestWork'
import { buildMediaPreviewUrl, isVideoUrl } from '@/lib/mediaPreview'
import { Filter, Instagram, Facebook, Mail, Phone } from 'lucide-react'

const FOOTER_LOGO_SRC = '/andrea-foodstyle-monogram.png'
const DEFAULT_SERVICE_IMAGES = ['/clients/site-content/services/services.jpg']
const DEFAULT_SERVICES_DESCRIPTION = 'Lorem ipsum dolor sit amet, consectetuer adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat.'

const buildImageSource = (sourceUrl, options) => {
  const source = typeof sourceUrl === 'string' ? sourceUrl.trim() : ''
  if (!source) return { src: '', fallbackSrc: '' }

  const preview = buildMediaPreviewUrl(source, options)
  return {
    src: preview || source,
    fallbackSrc: preview && preview !== source ? source : '',
  }
}

function ImageWithFallback({ src, fallbackSrc = '', fallbackSrcs = [], placeholder = null, ...props }) {
  const [failedUrls, setFailedUrls] = useState([])
  const candidates = [
    src,
    fallbackSrc,
    ...(Array.isArray(fallbackSrcs) ? fallbackSrcs : [fallbackSrcs]),
  ].filter(Boolean)
  const currentSrc = candidates.find((candidate) => !failedUrls.includes(candidate)) || ''

  if (!currentSrc) return placeholder

  return (
    <img
      {...props}
      src={currentSrc}
      onError={() => {
        setFailedUrls((prev) => (
          prev.includes(currentSrc) ? prev : [...prev, currentSrc]
        ))
      }}
    />
  )
}

const normalizeServiceSlides = (bioContent, fallbackDescription) => {
  const data = bioContent && typeof bioContent === 'object' ? bioContent : {}
  const servicesItems = Array.isArray(data.servicesItems) ? data.servicesItems : []
  const slidesFromItems = servicesItems
    .filter((item) => item && typeof item === 'object')
    .map((item, index) => {
      const imageUrl = typeof item.imageUrl === 'string'
        ? item.imageUrl
        : (typeof item.url === 'string' ? item.url : '')
      const text = typeof item.text === 'string'
        ? item.text
        : (typeof item.description === 'string' ? item.description : fallbackDescription)

      return {
        id: item.id ?? `service-item-${index}`,
        imageUrl,
        text,
      }
    })
    .filter((item) => item.imageUrl || item.text)

  if (slidesFromItems.length > 0) {
    return slidesFromItems
  }

  const configuredImages = Array.isArray(data.servicesImages)
    ? data.servicesImages.filter(Boolean)
    : []
  const imageUrls = configuredImages.length > 0 ? configuredImages : DEFAULT_SERVICE_IMAGES

  return imageUrls.map((imageUrl, index) => ({
    id: `service-image-${index}-${imageUrl}`,
    imageUrl,
    text: fallbackDescription,
  }))
}

const mergeSiteText = (incoming) => {
  const defaults = loadSiteText()

  if (!incoming || typeof incoming !== 'object') {
    return defaults
  }

  return {
    ...defaults,
    ...incoming,
    home: {
      ...defaults.home,
      ...(incoming.home || {}),
    },
    footer: {
      ...defaults.footer,
      ...(incoming.footer || {}),
    },
  }
}

function Home() {
  const [personalData, setPersonalData] = useState(null)
  const [bioContent, setBioContent] = useState(null)
  const [siteText, setSiteText] = useState(() => mergeSiteText())
  const [latestWorkPosts, setLatestWorkPosts] = useState(() => loadLatestWorkPosts())
  const [clients, setClients] = useState([])
  const [categories, setCategories] = useState(() => getCategoryNames(undefined, { includeAll: true }))
  const [searchTerm, setSearchTerm] = useState('')
  const [activeFilter, setActiveFilter] = useState('All')
  const [showFilterDropdown, setShowFilterDropdown] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [currentServiceImageIndex, setCurrentServiceImageIndex] = useState(0)
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth <= 768 : false)
  const itemsPerPage = 12

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const getClientCardImage = (client) => {
    const candidates = [
      client?.logo,
      client?.thumbnailUrl,
      ...(Array.isArray(client?.images) ? client.images : []),
    ].filter(Boolean)
    const sourceUrl = candidates.find((url) => !isVideoUrl(url)) || ''
    return buildMediaPreviewUrl(sourceUrl, { width: 640, height: 640, quality: 68 }) || sourceUrl
  }

  const getLatestWorkBackupImage = (index) => {
    const clientImages = clients
      .flatMap((client) => [
        client?.thumbnailUrl,
        client?.logo,
        ...(Array.isArray(client?.images) ? client.images : []),
      ])
      .filter((url) => url && !isVideoUrl(url))

    return clientImages[index % clientImages.length]
      || DEFAULT_SERVICE_IMAGES[index % DEFAULT_SERVICE_IMAGES.length]
      || ''
  }

  const filteredClients = clients.filter(client => {
    const matchesCategory = activeFilter === 'All' || (client.categories && client.categories.includes(activeFilter));
    const matchesSearch = (client.name || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Pagination calculations
  const totalPages = Math.ceil(filteredClients.length / itemsPerPage);
  const paginatedClients = filteredClients.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset to page 1 when filter or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeFilter, searchTerm]);

  useEffect(() => {
    async function fetchAll() {
      try {
        const res = await fetch('/api/home-data', { cache: 'no-store' })
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`)
        }

        const data = await res.json()
        setPersonalData(data?.personalData || null)
        setBioContent(data?.bioContent || null)
        setSiteText(mergeSiteText(data?.siteText))
        setLatestWorkPosts(Array.isArray(data?.latestWorkPosts) ? data.latestWorkPosts : loadLatestWorkPosts())
        let categoryData = data?.categories
        if (categoryData === undefined) {
          try {
            const categoriesRes = await fetch('/api/admin-data/categories', { cache: 'no-store' })
            if (categoriesRes.ok) {
              const categoriesPayload = await categoriesRes.json()
              categoryData = categoriesPayload?.value
            }
          } catch {
            // Keep default categories when the optional categories key is unavailable.
          }
        }
        setCategories(getCategoryNames(categoryData, { includeAll: true }))
        setClients(Array.isArray(data?.clients) ? data.clients : [])
      } catch (err) {
        console.error('Failed to load API data', err)
      }
    }
    fetchAll()
  }, [])

  useEffect(() => {
    if (!categories.includes(activeFilter)) {
      setActiveFilter('All')
    }
  }, [activeFilter, categories])

  const aboutTitle = bioContent?.aboutTitle || 'A Glimpse into the Journey..'
  const aboutParagraph1 = bioContent?.aboutParagraph1 ||
    'Lorem ipsum dolor sit amet, consectetuer adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat.'
  const aboutParagraph2 = bioContent?.aboutParagraph2 ||
    'Duis autem vel eum iriure dolor in hendrerit in vulputate velit esse molestie consequat, vel illum dolore eu feugiat nulla facilisis at vero eros et accumsan et iusto odio dignissim qui blandit praesent luptatum zzril delenit augue duis dolore te feugait onummy nibh euismod tincidunt ut laoreet dolore.'
  const servicesDescription = bioContent?.servicesDescription || DEFAULT_SERVICES_DESCRIPTION
  const contactSubtitle = bioContent?.contactSubtitle || 'Ready to bring your culinary vision to life?'
  const contactDescription = bioContent?.contactDescription || "Let's discuss your next foodstyling project & create something truly mouth-watering."

  const renderMultilineTitle = (text) =>
    String(text)
      .split('\n')
      .map((line, idx, arr) => (
        <span key={`${idx}-${line}`}>
          {line}
          {idx < arr.length - 1 ? <br /> : null}
        </span>
      ))

  const renderWithOrangeFirstLetter = (text) => {
    const safe = String(text || '')
    if (!safe) return null
    return (
      <>
        <span className="orange-letter">{safe[0]}</span>
        {safe.slice(1)}
      </>
    )
  }

  const renderWithCircleAccentOnFirstO = (text) => {
    const safe = String(text || '')
    const idx = safe.toLowerCase().indexOf('o')
    if (idx === -1) return safe

    return (
      <>
        {safe.slice(0, idx)}
        <span className="circle-accent">{safe[idx]}</span>
        {safe.slice(idx + 1)}
      </>
    )
  }

  const email = personalData?.email || 'andreaabikhalil@gmail.com'
  const phone = personalData?.phone || '03 56 16 58'
  const fullName = personalData?.fullName || 'Andrea Abi Khalil'
  const desktopHeroImageUrl = buildMediaPreviewUrl(personalData?.heroImage, { width: 1800, height: 1200, quality: 74 }) || personalData?.heroImage
  const mobileHeroImageUrl = buildMediaPreviewUrl(personalData?.mobileHeroImage, { width: 800, height: 1200, quality: 74 }) || personalData?.mobileHeroImage
  const activeHeroImageUrl = (isMobile && personalData?.mobileHeroImage) ? mobileHeroImageUrl : desktopHeroImageUrl

  const aboutSectionImage = buildImageSource(bioContent?.aboutImage, { width: 900, height: 900, quality: 72 })

  const serviceSlides = normalizeServiceSlides(bioContent, servicesDescription)
  const currentServiceSlideIndex = serviceSlides.length > 0
    ? ((currentServiceImageIndex % serviceSlides.length) + serviceSlides.length) % serviceSlides.length
    : 0
  const currentServiceSlide = serviceSlides[currentServiceSlideIndex] || { imageUrl: '', text: servicesDescription }
  const activeServicesDescription = currentServiceSlide.text || servicesDescription
  const currentServiceImage = currentServiceSlide.imageUrl
    ? buildImageSource(currentServiceSlide.imageUrl, { width: 1200, height: 800, quality: 72 })
    : { src: '', fallbackSrc: '' }

  const handleNextServiceImage = () => {
    if (serviceSlides.length === 0) return
    setCurrentServiceImageIndex((prev) => (prev + 1) % serviceSlides.length)
  }

  const handlePrevServiceImage = () => {
    if (serviceSlides.length === 0) return
    setCurrentServiceImageIndex((prev) => (prev - 1 + serviceSlides.length) % serviceSlides.length)
  }

  return (
    <div className="home-page">
      {/* Hero Section */}
      <section className="hero-section" style={activeHeroImageUrl ? {
        backgroundImage: `url(${activeHeroImageUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      } : {}}>
        {/* <div className="hero-content">
          <h1 className="hero-title">Andrea<span className="hero-subtitle">FoodStyle</span></h1>
          <p className="hero-tagline">I'm a FoodStylist</p>
        </div> */}
      </section>

      {/* About Section - Meet the Artist */}
      <section className="about-section">
        <div className="about-container">
          <div className="about-text">
            <h2 className="about-title">{aboutTitle}</h2>
            <p className="about-paragraph">
              {aboutParagraph1}
            </p>
            <p className="about-paragraph">
              {aboutParagraph2}
            </p>
          </div>
          <div className="about-image-container">
            <h2 className="about-image-title">{renderMultilineTitle(siteText.home.meetArtistTitle)}</h2>
            <div className="about-image">
              {aboutSectionImage.src ? (
                <ImageWithFallback
                  src={aboutSectionImage.src}
                  fallbackSrc={aboutSectionImage.fallbackSrc}
                  alt="Andrea Abi Khalil"
                  className="profile-image"
                  loading="lazy"
                  decoding="async"
                  placeholder={<div className="placeholder-image">{siteText.home.placeholderArtistPhoto}</div>}
                />
              ) : (
                <div className="placeholder-image">{siteText.home.placeholderArtistPhoto}</div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Latest Work Section */}
      <section className="latest-work-section">
        <div className="latest-work-container">
          <div className="latest-work-header">
            <h2 className="latest-work-title">{renderWithOrangeFirstLetter(siteText.home.latestWorkTitle)}</h2>
            <p className="latest-work-description">
              {siteText.home.latestWorkDescription}
            </p>
          </div>
          <div className="latest-work-grid">
            {latestWorkPosts.map((post, index) => {
              const postImage = buildImageSource(post.imageUrl, { width: 960, height: 540, quality: 72 })
              const backupImage = buildImageSource(getLatestWorkBackupImage(index), { width: 960, height: 540, quality: 72 })
              const imageSrc = postImage.src || backupImage.src
              const fallbackSrcs = [
                postImage.fallbackSrc,
                backupImage.src,
                backupImage.fallbackSrc,
              ].filter(Boolean)

              return (
                <article key={post.id} className="work-card">
                  <div className="work-image">
                    {imageSrc ? (
                      <ImageWithFallback
                        className="work-image-img"
                        src={imageSrc}
                        fallbackSrcs={fallbackSrcs}
                        alt={post.title}
                        loading="lazy"
                        decoding="async"
                        placeholder={<div className="placeholder-image">{siteText.home.placeholderPicture}</div>}
                      />
                    ) : (
                      <div className="placeholder-image">{siteText.home.placeholderPicture}</div>
                    )}
                  </div>
                  <div className="work-content">
                    <h3 className="work-title">{post.title}</h3>
                    <p className="work-excerpt">{post.excerpt}</p>
                  </div>
                </article>
              )
            })}
          </div>
        </div>
      </section>

      {/* My Work Section */}
      <section className="my-work-section">
        <div className="my-work-content-wrapper">
          <div className="my-work-header">
            <h2 className="my-work-title">{renderWithCircleAccentOnFirstO(siteText.home.myWorkTitle)}</h2>
            <div className="my-work-controls">
              <div className="filter-dropdown-wrapper">
                <button
                  className="filter-icon-btn"
                  onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                >
                  <Filter size={20} />
                  <span className="filter-label">{activeFilter}</span>
                </button>
                {showFilterDropdown && (
                  <div className="filter-dropdown">
                    {categories.map((category) => (
                      <button
                        key={category}
                        className={`filter-dropdown-item ${activeFilter === category ? 'active' : ''}`}
                        onClick={() => {
                          setActiveFilter(category)
                          setShowFilterDropdown(false)
                        }}
                      >
                        {category}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="search-container">
            <input
              type="text"
              id="client-search"
              name="clientSearch"
              placeholder={siteText.home.searchPlaceholder}
              className="search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="work-grid">
            {paginatedClients.length > 0 ? (
              paginatedClients.map((client) => (
                <div key={client.id} className="work-card-item">
                  <div className="work-card-logo">
                    {getClientCardImage(client) ? (
                      <img src={getClientCardImage(client)} alt={client.name || 'Client'} className="client-logo-img" loading="lazy" decoding="async" />
                    ) : (
                      <div className="logo-circle">{typeof client.name === 'string' && client.name.length > 0 ? client.name.charAt(0) : '?'}</div>
                    )}
                  </div>
                  <h3 className="work-card-name">{client.name}</h3>
                  <p className="work-card-description">{client.description}</p>
                  <div className="work-card-categories">
                    {Array.isArray(client.categories) && client.categories.length > 0 ? (
                      client.categories.map((cat, idx) => (
                        <span key={idx} className="category-badge">{cat}</span>
                      ))
                    ) : (
                      <span className="category-badge">No categories</span>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="no-results">No clients found matching your criteria</div>
            )}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="pagination-controls">
              <button
                className="pagination-btn"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                ← Previous
              </button>
              
              <div className="pagination-numbers">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    className={`pagination-number ${currentPage === page ? 'active' : ''}`}
                    onClick={() => setCurrentPage(page)}
                  >
                    {page}
                  </button>
                ))}
              </div>
              
              <button
                className="pagination-btn"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                Next →
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Clients Gallery Section */}
      <ClientsGallery />

      {/* Creative Services Section */}
      <section className="services-section">
        <div className="services-container">
          <div className="services-text">
            <h2 className="services-title">
              {String(siteText.home.servicesTitle || '').includes(' ')
                ? (
                  <>
                    {String(siteText.home.servicesTitle).split(' ').slice(0, -1).join(' ')}
                    <br />
                    {renderWithOrangeFirstLetter(String(siteText.home.servicesTitle).split(' ').slice(-1)[0])}
                  </>
                )
                : renderWithOrangeFirstLetter(siteText.home.servicesTitle)}
            </h2>
            <p className="services-description">
              {activeServicesDescription}
            </p>
          </div>
          <div className="services-carousel">
            <button
              type="button"
              className="carousel-btn prev"
              onClick={handlePrevServiceImage}
              disabled={serviceSlides.length === 0}
              aria-label="Previous service image"
            >
              &lt;
            </button>
            <div className="services-image-container">
              <div className="services-image">
                {currentServiceImage.src ? (
                  <ImageWithFallback
                    src={currentServiceImage.src}
                    fallbackSrc={currentServiceImage.fallbackSrc}
                    alt={`Service ${currentServiceSlideIndex + 1}`}
                    className="service-carousel-img"
                    loading="lazy"
                    decoding="async"
                    placeholder={<div className="placeholder-image large">{siteText.home.placeholderPicture}</div>}
                  />
                ) : (
                  <div className="placeholder-image large">{siteText.home.placeholderPicture}</div>
                )}
              </div>
              {serviceSlides.length > 1 ? (
                <div className="services-carousel-meta" aria-live="polite">
                  <span className="services-carousel-count">
                    {currentServiceSlideIndex + 1} / {serviceSlides.length}
                  </span>
                  <div className="services-carousel-dots" aria-label="Service slide selector">
                    {serviceSlides.map((slide, index) => (
                      <button
                        key={slide.id}
                        type="button"
                        className={`services-carousel-dot${index === currentServiceSlideIndex ? ' active' : ''}`}
                        onClick={() => setCurrentServiceImageIndex(index)}
                        aria-label={`Show service image ${index + 1}`}
                        aria-current={index === currentServiceSlideIndex}
                      />
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
            <button
              type="button"
              className="carousel-btn next"
              onClick={handleNextServiceImage}
              disabled={serviceSlides.length === 0}
              aria-label="Next service image"
            >
              &gt;
            </button>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="contact-section">
        <div className="contact-container">
          <h2 className="contact-title">
            {siteText.home.contactTitlePrefix}{' '}
            <span className="connect-text">{siteText.home.contactTitleEmphasis}</span>
          </h2>
          <p className="contact-subtitle">{contactSubtitle}</p>
          <p className="contact-description">{contactDescription}</p>

          <form className="contact-form">
            <div className="form-row">
              <input id="contact-name" name="name" type="text" placeholder={siteText.home.contactNamePlaceholder} className="form-input" />
              <input id="contact-email" name="email" type="email" placeholder={siteText.home.contactEmailPlaceholder} className="form-input" />
            </div>
            <input id="contact-subject" name="subject" type="text" placeholder={siteText.home.contactSubjectPlaceholder} className="form-input full-width" />
            <textarea id="contact-message" name="message" placeholder={siteText.home.contactMessagePlaceholder} className="form-textarea"></textarea>
            <button type="submit" className="form-submit">{siteText.home.contactSendLabel}</button>
          </form>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-container">
          <div className="footer-logo">
            <div className="logo-icon">
              <img src={FOOTER_LOGO_SRC} alt="Andrea FoodStyle monogram" className="footer-logo-mark" />
            </div>
            <div className="logo-text">
              <span className="logo-andrea">{siteText.footer.logoPrimary}</span>
              <span className="logo-foodstyle">{siteText.footer.logoSecondary}</span>
            </div>
          </div>

          <div className="footer-contact">
            <div className="footer-social">
              <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="social-icon" title="Instagram">
                <Instagram size={20} />
              </a>
              <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="social-icon" title="Facebook">
                <Facebook size={20} />
              </a>
            </div>
            <a href={`mailto:${email}`} className="footer-email" title="Email">
              <Mail size={18} />
              <span>{email}</span>
            </a>
            <div className="footer-phone" title="Phone">
              <Phone size={18} />
              <span>{phone}</span>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <p>
            {siteText.footer.copyrightPrefix} <strong>{fullName}</strong> {siteText.footer.allRightsReservedSuffix}
          </p>
        </div>
      </footer>
    </div>
  )
}

export default Home
