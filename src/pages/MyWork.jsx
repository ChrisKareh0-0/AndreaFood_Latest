import { useState } from 'react'
import './MyWork.css'
import { loadSiteText } from '@/content/siteText'
import { Filter } from 'lucide-react'

function MyWork() {
  const [searchTerm, setSearchTerm] = useState('')
  const [activeFilter, setActiveFilter] = useState('All')
  const [showFilterDropdown, setShowFilterDropdown] = useState(false)
  const siteText = loadSiteText()

  const categories = ['All', 'TVC', 'Photoshoot', 'Commercial', 'Editorial', 'Social Media']

  // Sample clients data with categories
  const [clients] = useState([
    { id: 1, name: 'Client 1', logo: '', categories: ['TVC', 'Photoshoot'], description: 'Sample client' },
    { id: 2, name: 'Client 2', logo: '', categories: ['TVC'], description: 'Sample client' },
    { id: 3, name: 'Client 3', logo: '', categories: ['Photoshoot'], description: 'Sample client' },
    { id: 4, name: 'Client 4', logo: '', categories: ['Commercial', 'TVC'], description: 'Sample client' },
    { id: 5, name: 'Client 5', logo: '', categories: ['Editorial'], description: 'Sample client' }
  ])

  const filteredClients = clients.filter(client => {
    const matchesCategory = activeFilter === 'All' || client.categories.includes(activeFilter)
    const matchesSearch = client.name.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesCategory && matchesSearch
  })

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

  return (
    <div className="my-work-page">
      <div className="my-work-header">
        <h1 className="my-work-title">{renderWithCircleAccentOnFirstO(siteText.myWork.title)}</h1>
        <div className="my-work-filters">
          <div className="filter-dropdown-wrapper">
            <button
              className="filter-icon-btn"
              onClick={() => setShowFilterDropdown(!showFilterDropdown)}
            >
              <Filter size={24} />
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
          placeholder={siteText.myWork.searchPlaceholder}
          className="search-input"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="clients-carousel">
        <button className="carousel-btn prev">&lt;</button>
        <div className="clients-carousel-content">
          {filteredClients.length > 0 ? (
            filteredClients.map((client) => (
              <div key={client.id} className="carousel-client">
                <div className="carousel-client-logo">
                  {client.logo ? (
                    <img src={client.logo} alt={client.name} />
                  ) : (
                    <div className="logo-circle">{client.name.charAt(0)}</div>
                  )}
                </div>
                <p className="carousel-client-name">{client.name}</p>
              </div>
            ))
          ) : (
            <div className="no-results">No clients found</div>
          )}
        </div>
        <button className="carousel-btn next">&gt;</button>
      </div>
    </div>
  )
}

export default MyWork
